"""
Concurrency tests demonstrating atomicity under heavy parallel submission load.
Verifies Section 12.1 requirement Q7_01:
* Monotonic zero indexed leaf sequence without gaps or duplicates.
* Exactly one commit for duplicate nullifier races.
"""

import asyncio
import pytest
from sqlalchemy import select

from src.models import AcceptedEncryptedBallot, CheckpointOutbox, Election


@pytest.mark.anyio
async def test_concurrent_distinct_ballots_atomicity(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Simulate 25 concurrent voters casting distinct valid ballots simultaneously.
    Verifies that:
    1. Every transaction commits cleanly.
    2. Leaf indices assigned are strictly 0, 1, 2, ..., 24 without gaps or duplicates.
    3. Final election next_leaf_index equals 25.
    4. Exactly 25 outbox entries exist.
    """
    concurrency_count = 25

    async def cast_single_voter(index: int):
        payload = {
            "election_id": sample_election_id,
            "credential_proof_b64url": make_proof(f"null_concurrent_voter_{index:03d}"),
            "engine_ballot_b64url": valid_ballot_b64url,
            "engine_proofs_b64url": valid_proofs_b64url,
            "idempotency_key": f"idemp_concurrent_{index:03d}"
        }
        return await client.post(
            f"/v1/cast/{sample_election_id}/ballots",
            json=payload
        )

    tasks = [cast_single_voter(i) for i in range(concurrency_count)]
    responses = await asyncio.gather(*tasks)

    # All responses must be accepted
    for resp in responses:
        assert resp.status_code == 202, f"Failed with {resp.text}"

    assigned_leaf_indices = [r.json()["leaf_index"] for r in responses]

    # Verify no duplicates
    assert len(set(assigned_leaf_indices)) == concurrency_count

    # Verify set is strictly 0 to concurrency_count minus 1
    expected_set = set(range(concurrency_count))
    assert set(assigned_leaf_indices) == expected_set

    # Verify election next_leaf_index in database
    test_session.expire_all()
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    assert election.next_leaf_index == concurrency_count

    # Verify count in accepted_encrypted_ballots
    ballots = (
        await test_session.execute(
            select(AcceptedEncryptedBallot).where(
                AcceptedEncryptedBallot.election_id == sample_election_id
            )
        )
    ).scalars().all()
    assert len(ballots) == concurrency_count

    # Verify count in checkpoint_outbox
    outbox_entries = (
        await test_session.execute(
            select(CheckpointOutbox).where(
                CheckpointOutbox.election_id == sample_election_id
            )
        )
    ).scalars().all()
    assert len(outbox_entries) == concurrency_count


@pytest.mark.anyio
async def test_concurrent_identical_credential_replay_race(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Simulate 20 simultaneous duplicate submissions with identical request digest.
    Verifies that:
    1. Exactly one leaf is created in the log.
    2. All 20 requests receive 202 status and return identical receipt handle and leaf index.
    3. Election next_leaf_index increments exactly once to 1.
    """
    concurrency_count = 20
    shared_payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_replay_race_winner"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_identical_replay_race"
    }

    async def cast_same():
        return await client.post(
            f"/v1/cast/{sample_election_id}/ballots",
            json=shared_payload
        )

    tasks = [cast_same() for _ in range(concurrency_count)]
    responses = await asyncio.gather(*tasks)

    # Every response returns 202
    for resp in responses:
        assert resp.status_code == 202

    first_handle = responses[0].json()["handle"]
    first_leaf = responses[0].json()["leaf_index"]

    assert first_leaf == 0

    # All responses returned identical handle and leaf
    for resp in responses:
        data = resp.json()
        assert data["handle"] == first_handle
        assert data["leaf_index"] == 0

    # Exactly 1 row in accepted_encrypted_ballots
    test_session.expire_all()
    ballots = (
        await test_session.execute(
            select(AcceptedEncryptedBallot).where(
                AcceptedEncryptedBallot.election_id == sample_election_id
            )
        )
    ).scalars().all()
    assert len(ballots) == 1

    # Election next_leaf_index must be 1
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    assert election.next_leaf_index == 1


@pytest.mark.anyio
async def test_concurrent_duplicate_nullifier_different_payload_race(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Simulate race where 15 concurrent requests try using the same credential nullifier
    with different idempotency keys.
    Verifies that:
    1. Exactly one request succeeds with 202 status.
    2. The other 14 requests are rejected with 409 Conflict.
    3. Exactly one leaf is inserted into the log.
    """
    concurrency_count = 15
    shared_nullifier = "null_conflict_race_victim"

    async def cast_competing(index: int):
        payload = {
            "election_id": sample_election_id,
            "credential_proof_b64url": make_proof(shared_nullifier),
            "engine_ballot_b64url": valid_ballot_b64url,
            "engine_proofs_b64url": valid_proofs_b64url,
            "idempotency_key": f"idemp_competing_{index}"
        }
        return await client.post(
            f"/v1/cast/{sample_election_id}/ballots",
            json=payload
        )

    tasks = [cast_competing(i) for i in range(concurrency_count)]
    responses = await asyncio.gather(*tasks)

    status_codes = [r.status_code for r in responses]
    success_count = status_codes.count(202)
    conflict_count = status_codes.count(409)

    assert success_count == 1
    assert conflict_count == concurrency_count - 1

    # Database state verification
    test_session.expire_all()
    ballots = (
        await test_session.execute(
            select(AcceptedEncryptedBallot).where(
                AcceptedEncryptedBallot.election_id == sample_election_id
            )
        )
    ).scalars().all()
    assert len(ballots) == 1
    assert ballots[0].credential_nullifier == shared_nullifier
