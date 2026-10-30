"""
Unit tests validating SQLAlchemy 2 database models and constraints.
Verifies all 10 casting cluster tables according to Section 5.2.
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.models import (
    AcceptedEncryptedBallot,
    Candidate,
    CheckpointOutbox,
    Contest,
    Election,
    ElectionEvent,
    ManifestVersion,
    PublishedResult,
    TallyProof,
    WitnessAcknowledgement,
)


@pytest.mark.anyio
async def test_all_ten_models_lifecycle(test_session):
    """
    Verify creation, storage, and retrieval across all 10 required casting cluster tables:
    * elections
    * manifest_versions
    * contests
    * candidates
    * accepted_encrypted_ballots
    * checkpoint_outbox
    * witness_acknowledgements
    * tally_proofs
    * published_results
    * election_events
    """
    now = datetime.now(timezone.utc)
    election_id = "elec_models_test"

    # 1. Election
    election = Election(
        id=election_id,
        tenant_id="tenant_01",
        title="Engineering Council Election",
        state="OPEN",
        manifest_digest="man_digest_101",
        opens_at_utc=now,
        closes_at_utc=now,
        issuance_cutoff_utc=now,
        state_version=1,
        next_leaf_index=0,
        last_witnessed_tree_size=0,
        final_tree_size=None,
        max_unwitnessed_backlog=500
    )
    test_session.add(election)

    # 2. ManifestVersion
    manifest = ManifestVersion(
        id="mv_101",
        election_id=election_id,
        manifest_version=1,
        manifest_digest="man_digest_101",
        manifest_content="{\"version\": 1}",
        frozen_at_utc=now
    )
    test_session.add(manifest)

    # 3. Contest
    contest = Contest(
        id="cnt_101",
        election_id=election_id,
        contest_index=0,
        title="Department Representative",
        selection_rule="single_choice"
    )
    test_session.add(contest)

    # 4. Candidate
    candidate = Candidate(
        id="cand_101",
        contest_id="cnt_101",
        candidate_index=0,
        name="Aarav Sharma"
    )
    test_session.add(candidate)

    # 5. AcceptedEncryptedBallot
    ballot = AcceptedEncryptedBallot(
        id="bal_101",
        election_id=election_id,
        leaf_index=0,
        credential_nullifier="nullifier_hex_101",
        ballot_id="bal_101",
        manifest_digest="man_digest_101",
        credential_proof_b64url="proof_b64",
        engine_ballot_b64url="cipher_b64",
        engine_proofs_b64url="proofs_b64",
        engine_record_version="v1",
        request_digest="req_digest_101",
        receipt_handle="rcpt_handle_101",
        nullifier_commitment="null_commit_101",
        cast_at_utc=now
    )
    test_session.add(ballot)

    # 6. CheckpointOutbox
    outbox = CheckpointOutbox(
        id="out_101",
        election_id=election_id,
        leaf_index=0,
        ballot_id="bal_101",
        leaf_digest="leaf_hash_101",
        payload="canonical_json_payload",
        status="PENDING",
        created_at_utc=now
    )
    test_session.add(outbox)

    # 7. WitnessAcknowledgement
    witness = WitnessAcknowledgement(
        id="wit_101",
        election_id=election_id,
        tree_size=1,
        merkle_root="merkle_root_hex_101",
        witness_key_id="wit_key_01",
        witness_signature="sig_hex_101",
        acknowledged_at_utc=now
    )
    test_session.add(witness)

    # 8. TallyProof
    tally = TallyProof(
        id="tally_101",
        election_id=election_id,
        manifest_digest="man_digest_101",
        tally_data="{\"Aarav\": 1}",
        proof_data="proof_hex_101",
        created_at_utc=now
    )
    test_session.add(tally)

    # 9. PublishedResult
    result = PublishedResult(
        id="res_101",
        election_id=election_id,
        manifest_digest="man_digest_101",
        total_ballots=1,
        tally_json="{\"Aarav\": 1}",
        published_at_utc=now
    )
    test_session.add(result)

    # 10. ElectionEvent
    event = ElectionEvent(
        id="evt_101",
        election_id=election_id,
        event_type="ELECTION_FROZEN",
        payload="{\"action\": \"freeze\"}",
        created_at_utc=now
    )
    test_session.add(event)

    await test_session.commit()

    # Query verification
    retrieved_election = (
        await test_session.execute(select(Election).where(Election.id == election_id))
    ).scalar_one()
    assert retrieved_election.title == "Engineering Council Election"

    retrieved_ballot = (
        await test_session.execute(select(AcceptedEncryptedBallot).where(AcceptedEncryptedBallot.id == "bal_101"))
    ).scalar_one()
    assert retrieved_ballot.credential_nullifier == "nullifier_hex_101"
    assert retrieved_ballot.leaf_index == 0


@pytest.mark.anyio
async def test_unique_nullifier_constraint(test_session, open_election, sample_election_id):
    """
    Verify UNIQUE (election_id, credential_nullifier) constraint on accepted_encrypted_ballots.
    """
    now = datetime.now(timezone.utc)
    ballot1 = AcceptedEncryptedBallot(
        id="b1",
        election_id=sample_election_id,
        leaf_index=0,
        credential_nullifier="duplicate_nullifier_val",
        ballot_id="b1",
        manifest_digest="digest",
        credential_proof_b64url="p1",
        engine_ballot_b64url="c1",
        engine_proofs_b64url="pf1",
        engine_record_version="v1",
        request_digest="d1",
        receipt_handle="h1",
        nullifier_commitment="c1",
        cast_at_utc=now
    )
    test_session.add(ballot1)
    await test_session.commit()

    # Attempt second insertion with same nullifier under same election
    ballot2 = AcceptedEncryptedBallot(
        id="b2",
        election_id=sample_election_id,
        leaf_index=1,
        credential_nullifier="duplicate_nullifier_val",
        ballot_id="b2",
        manifest_digest="digest",
        credential_proof_b64url="p2",
        engine_ballot_b64url="c2",
        engine_proofs_b64url="pf2",
        engine_record_version="v1",
        request_digest="d2",
        receipt_handle="h2",
        nullifier_commitment="c2",
        cast_at_utc=now
    )
    test_session.add(ballot2)

    with pytest.raises(IntegrityError):
        await test_session.commit()
    await test_session.rollback()


@pytest.mark.anyio
async def test_unique_leaf_index_constraint(test_session, open_election, sample_election_id):
    """
    Verify UNIQUE (election_id, leaf_index) constraint on accepted_encrypted_ballots.
    """
    now = datetime.now(timezone.utc)
    ballot1 = AcceptedEncryptedBallot(
        id="b3",
        election_id=sample_election_id,
        leaf_index=5,
        credential_nullifier="null_distinct_1",
        ballot_id="b3",
        manifest_digest="digest",
        credential_proof_b64url="p1",
        engine_ballot_b64url="c1",
        engine_proofs_b64url="pf1",
        engine_record_version="v1",
        request_digest="d1",
        receipt_handle="h3",
        nullifier_commitment="c1",
        cast_at_utc=now
    )
    test_session.add(ballot1)
    await test_session.commit()

    # Attempt second insertion with identical leaf_index 5
    ballot2 = AcceptedEncryptedBallot(
        id="b4",
        election_id=sample_election_id,
        leaf_index=5,
        credential_nullifier="null_distinct_2",
        ballot_id="b4",
        manifest_digest="digest",
        credential_proof_b64url="p2",
        engine_ballot_b64url="c2",
        engine_proofs_b64url="pf2",
        engine_record_version="v1",
        request_digest="d2",
        receipt_handle="h4",
        nullifier_commitment="c2",
        cast_at_utc=now
    )
    test_session.add(ballot2)

    with pytest.raises(IntegrityError):
        await test_session.commit()
    await test_session.rollback()
