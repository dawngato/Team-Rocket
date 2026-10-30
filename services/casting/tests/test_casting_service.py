"""
Unit tests validating atomic casting transaction logic and edge cases.
Covers Section 5.2 and Section 6.3 requirements.
"""

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from src.models import AcceptedEncryptedBallot, CheckpointOutbox, Election


@pytest.mark.anyio
async def test_cast_ballot_success(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Verify complete atomic ballot casting flow:
    * Returns 202 status with COMMITTED_PENDING_WITNESS
    * Monotonic leaf index assigned
    * Outbox entry created for checkpoint worker
    * Election next_leaf_index incremented
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_success_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_success_01"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "COMMITTED_PENDING_WITNESS"
    assert data["leaf_index"] == 0
    assert data["handle"].startswith("rcpt_")
    assert len(data["nullifier_commitment"]) == 64

    # Verify ballot saved in database
    ballot = (
        await test_session.execute(
            select(AcceptedEncryptedBallot).where(
                AcceptedEncryptedBallot.election_id == sample_election_id,
                AcceptedEncryptedBallot.leaf_index == 0
            )
        )
    ).scalar_one()
    assert ballot.receipt_handle == data["handle"]
    assert ballot.credential_nullifier == "null_success_01"

    # Verify outbox entry created
    outbox = (
        await test_session.execute(
            select(CheckpointOutbox).where(
                CheckpointOutbox.election_id == sample_election_id,
                CheckpointOutbox.leaf_index == 0
            )
        )
    ).scalar_one()
    assert outbox.status == "PENDING"
    assert "himvote.ballot_evidence.v1" in outbox.payload

    # Verify election updated
    test_session.expire_all()
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    assert election.next_leaf_index == 1


@pytest.mark.anyio
async def test_cast_ballot_reject_when_not_open(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Verify rejection with 409 when election state is not OPEN.
    """
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    election.state = "FROZEN"
    await test_session.commit()

    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_frozen_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_frozen_01"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )

    assert response.status_code == 409
    assert "must be OPEN" in response.json()["detail"]


@pytest.mark.anyio
async def test_cast_ballot_reject_outside_time_window(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Verify rejection with 409 when current UTC time is before opens_at_utc or after closes_at_utc.
    """
    now = datetime.now(timezone.utc)
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    # Election opens tomorrow
    election.opens_at_utc = now + timedelta(days=1)
    election.closes_at_utc = now + timedelta(days=2)
    await test_session.commit()

    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_window_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_window_01"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )

    assert response.status_code == 409
    assert "voting window has not opened yet" in response.json()["detail"]


@pytest.mark.anyio
async def test_cast_ballot_reject_backlog_exceeded(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Verify rejection with 429 when unwitnessed backlog exceeds max limit.
    """
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    election.max_unwitnessed_backlog = 10
    election.next_leaf_index = 10
    election.last_witnessed_tree_size = 0  # backlog is 10
    await test_session.commit()

    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_backlog_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_backlog_01"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )

    assert response.status_code == 429
    assert "backlog limit exceeded" in response.json()["detail"]


@pytest.mark.anyio
async def test_cast_ballot_reject_path_mismatch(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Verify rejection with 400 when URL path parameter does not match body election_id.
    """
    payload = {
        "election_id": "different_election_id",
        "credential_proof_b64url": make_proof("null_mismatch"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_mismatch"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )

    assert response.status_code == 400
    assert "does not match payload" in response.json()["detail"]


@pytest.mark.anyio
async def test_cast_ballot_reject_invalid_proof(
    client,
    open_election,
    sample_election_id,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Verify rejection with 400 when credential proof is malformed.
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": "too_short",
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_bad_proof"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )

    assert response.status_code == 400
    assert "Credential proof verification failed" in response.json()["detail"]
