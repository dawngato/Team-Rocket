"""
Domain service implementing atomic ballot casting and receipt status queries.
Adheres to Section 5.2 and Section 6.3 specifications for HimVote.
"""

import secrets
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.crypto import (
    build_ballot_evidence_record,
    canonical_json_bytes,
    compute_leaf_digest,
    compute_nullifier_commitment,
    compute_request_digest,
    inclusion_proof_from_leaf_digests,
    merkle_root_from_leaf_digests,
    verify_credential_proof,
)
from src.database import get_election_lock
from src.engine_client import EngineValidationUnavailable, validate_ballot_with_engine
from src.models import (
    AcceptedEncryptedBallot,
    CheckpointOutbox,
    Election,
    WitnessAcknowledgement,
)
from src.schemas import (
    BallotStatus,
    CastBallotRequest,
    CastBallotResponse,
    ReceiptStatusResponse,
)


async def cast_ballot_transaction(
    session: AsyncSession,
    election_id: str,
    request: CastBallotRequest
) -> CastBallotResponse:
    """
    Execute atomic casting transaction logic:
    1. Lock election row using SELECT FOR UPDATE.
    2. Check state is OPEN and current UTC time is within window.
    3. Check unwitnessed backlog does not exceed limit.
    4. Verify anonymous credential proof against election manifest.
    5. Look up credential nullifier:
       * If identical request digest, return previous outcome.
       * If duplicate nullifier with different digest, reject.
    6. Insert ballot into accepted_encrypted_ballots at next_leaf_index.
    7. Insert into checkpoint_outbox for worker.
    8. Increment next_leaf_index, commit transaction.
    9. Return COMMITTED_PENDING_WITNESS and an opaque handle.
    """
    if election_id != request.election_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path election parameter does not match payload election identifier for Ballot Submission."
        )

    # Compute deterministic request digest for idempotency checking
    current_request_digest = compute_request_digest(
        election_id=election_id,
        idempotency_key=request.idempotency_key,
        credential_proof_b64url=request.credential_proof_b64url,
        engine_ballot_b64url=request.engine_ballot_b64url,
        engine_proofs_b64url=request.engine_proofs_b64url
    )

    # Acquire per election lock to coordinate concurrent requests safely
    election_lock = get_election_lock(election_id)
    async with election_lock:
        # 1. Lock election row with SELECT FOR UPDATE
        election_query = (
            select(Election)
            .where(Election.id == election_id)
            .with_for_update()
        )
        election_result = await session.execute(election_query)
        election = election_result.scalar_one_or_none()

        if election is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested election was not found."
            )

        # 2. Check state is OPEN
        if election.state != "OPEN":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Election is currently in state '{election.state}'; the election must be OPEN to accept a Ballot Submission."
            )

        # Check UTC voting window
        now_utc = datetime.now(timezone.utc)
        opens_at = election.opens_at_utc
        if opens_at.tzinfo is None:
            opens_at = opens_at.replace(tzinfo=timezone.utc)
        closes_at = election.closes_at_utc
        if closes_at.tzinfo is None:
            closes_at = closes_at.replace(tzinfo=timezone.utc)

        if now_utc < opens_at:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Election voting window has not opened yet for Ballot Submission."
            )
        if now_utc > closes_at:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Election voting window has already closed for Ballot Submission."
            )

        # Check unwitnessed backlog limit
        unwitnessed_backlog = election.next_leaf_index - election.last_witnessed_tree_size
        if unwitnessed_backlog >= election.max_unwitnessed_backlog:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Independent Verification backlog limit exceeded; temporarily pausing Ballot Submission acceptance."
            )

        # Base64 decoding is not cryptographic ballot validation. In remote
        # mode the configured engine must validate the native ballot and proof
        # before the casting transaction can accept it. The syntax-only mode is
        # deliberately restricted to non-production test environments.
        try:
            is_valid_ballot, ballot_err = await validate_ballot_with_engine(
                election_id=election_id,
                manifest_digest=election.manifest_digest,
                engine_ballot_b64url=request.engine_ballot_b64url,
                engine_proofs_b64url=request.engine_proofs_b64url,
            )
        except EngineValidationUnavailable as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc
        if not is_valid_ballot:
            error_status = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if ballot_err.startswith("CRYPTO_ENGINE_NOT_VALIDATED")
                else status.HTTP_400_BAD_REQUEST
            )
            raise HTTPException(
                status_code=error_status,
                detail=ballot_err or "Invalid engine ballot or cryptographic proofs for Ballot Submission.",
            )

        # 3. Verify anonymous credential proof against election manifest
        is_proof_valid, credential_nullifier, proof_err = verify_credential_proof(
            election_id=election_id,
            expected_manifest_digest=election.manifest_digest,
            credential_proof_b64url=request.credential_proof_b64url
        )
        if not is_proof_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student Eligibility Verification Credential proof verification failed: {proof_err}"
            )

        nullifier_commitment = compute_nullifier_commitment(credential_nullifier)

        # 4. Look up credential nullifier in accepted_encrypted_ballots
        nullifier_query = (
            select(AcceptedEncryptedBallot)
            .where(
                AcceptedEncryptedBallot.election_id == election_id,
                AcceptedEncryptedBallot.credential_nullifier == credential_nullifier
            )
            .with_for_update()
        )
        existing_result = await session.execute(nullifier_query)
        existing_ballot = existing_result.scalar_one_or_none()

        if existing_ballot is not None:
            if existing_ballot.request_digest == current_request_digest:
                # Idempotent replay: return identical previous outcome
                return CastBallotResponse(
                    status=BallotStatus.COMMITTED_PENDING_WITNESS,
                    handle=existing_ballot.receipt_handle,
                    leaf_index=existing_ballot.leaf_index,
                    nullifier_commitment=existing_ballot.nullifier_commitment
                )
            else:
                # Duplicate nullifier with different request digest: reject
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Credential nullifier already spent with a different Ballot Submission."
                )

        # 5. Insert ballot into accepted_encrypted_ballots at next_leaf_index
        assigned_leaf_index = election.next_leaf_index
        ballot_id = f"bal_{uuid.uuid4().hex}"
        receipt_handle = f"rcpt_{secrets.token_urlsafe(32)}"

        evidence_dict = build_ballot_evidence_record(
            election_id=election_id,
            manifest_digest=election.manifest_digest,
            ballot_id=ballot_id,
            leaf_index=assigned_leaf_index,
            credential_nullifier=credential_nullifier,
            credential_proof_b64url=request.credential_proof_b64url,
            engine_ballot_b64url=request.engine_ballot_b64url,
            engine_proofs_b64url=request.engine_proofs_b64url,
            engine_record_version="v1"
        )
        canonical_leaf_bytes = canonical_json_bytes(evidence_dict)
        leaf_digest = compute_leaf_digest(canonical_leaf_bytes)

        new_ballot = AcceptedEncryptedBallot(
            id=ballot_id,
            election_id=election_id,
            leaf_index=assigned_leaf_index,
            credential_nullifier=credential_nullifier,
            ballot_id=ballot_id,
            manifest_digest=election.manifest_digest,
            credential_proof_b64url=request.credential_proof_b64url,
            engine_ballot_b64url=request.engine_ballot_b64url,
            engine_proofs_b64url=request.engine_proofs_b64url,
            engine_record_version="v1",
            request_digest=current_request_digest,
            receipt_handle=receipt_handle,
            nullifier_commitment=nullifier_commitment,
            cast_at_utc=now_utc
        )
        session.add(new_ballot)

        # 6. Insert into checkpoint_outbox for worker
        outbox_id = f"out_{uuid.uuid4().hex}"
        outbox_row = CheckpointOutbox(
            id=outbox_id,
            election_id=election_id,
            leaf_index=assigned_leaf_index,
            ballot_id=ballot_id,
            leaf_digest=leaf_digest,
            payload=canonical_leaf_bytes.decode("utf-8"),
            status="PENDING",
            created_at_utc=now_utc
        )
        session.add(outbox_row)

        # 7. Increment next_leaf_index and commit transaction
        election.next_leaf_index = assigned_leaf_index + 1
        election.state_version += 1
        election.updated_at_utc = now_utc

        await session.commit()

        # 8. Return COMMITTED_PENDING_WITNESS and opaque handle
        return CastBallotResponse(
            status=BallotStatus.COMMITTED_PENDING_WITNESS,
            handle=receipt_handle,
            leaf_index=assigned_leaf_index,
            nullifier_commitment=nullifier_commitment
        )


async def get_receipt_status(
    session: AsyncSession,
    election_id: str,
    handle: str
) -> ReceiptStatusResponse:
    """
    Retrieve receipt status by unguessable handle:
    * Returns COMMITTED_PENDING_WITNESS if not yet witnessed.
    * Returns WITNESSED once a witness acknowledgement exists for the leaf index.
    * Raises 404 if handle is not found.
    """
    ballot_query = select(AcceptedEncryptedBallot).where(
        AcceptedEncryptedBallot.election_id == election_id,
        AcceptedEncryptedBallot.receipt_handle == handle
    )
    ballot_result = await session.execute(ballot_query)
    ballot = ballot_result.scalar_one_or_none()

    if ballot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt handle not found for this election."
        )

    # Check for witness acknowledgement covering this leaf index
    ack_query = (
        select(WitnessAcknowledgement)
        .where(
            WitnessAcknowledgement.election_id == election_id,
            WitnessAcknowledgement.tree_size > ballot.leaf_index
        )
        .order_by(WitnessAcknowledgement.tree_size.desc())
        .limit(1)
    )
    ack_result = await session.execute(ack_query)
    ack = ack_result.scalar_one_or_none()

    # Also check election last_witnessed_tree_size
    election_query = select(Election.last_witnessed_tree_size).where(
        Election.id == election_id
    )
    election_result = await session.execute(election_query)
    last_witnessed_size = election_result.scalar_one_or_none() or 0

    if ack is not None or last_witnessed_size > ballot.leaf_index:
        ack_time = ack.acknowledged_at_utc if ack else ballot.cast_at_utc
        evidence = {
            "tree_size": None,
            "leaf_hash": None,
            "merkle_root": None,
            "merkle_proof": None,
        }

        if ack is not None:
            outbox_query = (
                select(CheckpointOutbox)
                .where(
                    CheckpointOutbox.election_id == election_id,
                    CheckpointOutbox.leaf_index < ack.tree_size,
                )
                .order_by(CheckpointOutbox.leaf_index.asc())
            )
            outbox_result = await session.execute(outbox_query)
            outbox_entries = list(outbox_result.scalars().all())
            expected_indexes = list(range(ack.tree_size))
            actual_indexes = [entry.leaf_index for entry in outbox_entries]
            if actual_indexes != expected_indexes:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Independent Verification evidence is incomplete for this receipt.",
                )

            try:
                leaf_digests = [bytes.fromhex(entry.leaf_digest) for entry in outbox_entries]
                computed_root = merkle_root_from_leaf_digests(leaf_digests).hex()
                expected_root = ack.merkle_root.lower()
                if computed_root != expected_root:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Independent Verification Merkle root does not match committed evidence.",
                    )
                leaf_digest = leaf_digests[ballot.leaf_index].hex()
                proof = [
                    sibling.hex()
                    for sibling in inclusion_proof_from_leaf_digests(
                        ballot.leaf_index,
                        leaf_digests,
                    )
                ]
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Independent Verification evidence contains an invalid Merkle digest.",
                ) from exc

            evidence = {
                "tree_size": ack.tree_size,
                "leaf_hash": leaf_digest,
                "merkle_root": expected_root,
                "merkle_proof": proof,
            }

        return ReceiptStatusResponse(
            status=BallotStatus.WITNESSED,
            handle=ballot.receipt_handle,
            leaf_index=ballot.leaf_index,
            witnessed_at_utc=ack_time,
            **evidence,
        )

    return ReceiptStatusResponse(
        status=BallotStatus.COMMITTED_PENDING_WITNESS,
        handle=ballot.receipt_handle,
        leaf_index=ballot.leaf_index,
        witnessed_at_utc=None
    )


async def open_election_state(
    session: AsyncSession,
    election_id: str
) -> dict:
    """
    Open an election for casting.
    """
    election_lock = get_election_lock(election_id)
    async with election_lock:
        query = select(Election).where(Election.id == election_id).with_for_update()
        result = await session.execute(query)
        election = result.scalar_one_or_none()
        if election is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested election was not found."
            )
        election.state = "OPEN"
        now_utc = datetime.now(timezone.utc)
        election.updated_at_utc = now_utc
        await session.commit()
        return {"status": "OPEN", "election_id": election_id}


async def close_election_state(
    session: AsyncSession,
    election_id: str
) -> dict:
    """
    Close election and record final_tree_size equal to next_leaf_index.
    Uses the same row lock as casting so no cast is accepted after this lock.
    """
    election_lock = get_election_lock(election_id)
    async with election_lock:
        query = select(Election).where(Election.id == election_id).with_for_update()
        result = await session.execute(query)
        election = result.scalar_one_or_none()
        if election is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested election was not found."
            )
        election.state = "CLOSING"
        election.final_tree_size = election.next_leaf_index
        now_utc = datetime.now(timezone.utc)
        election.updated_at_utc = now_utc
        await session.flush()
        election.state = "CLOSED"
        await session.commit()
        return {
            "status": "CLOSED",
            "election_id": election_id,
            "final_tree_size": election.final_tree_size
        }
