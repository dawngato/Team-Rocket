"""
Unit tests validating idempotent replays and duplicate nullifier rejection.
Demonstrates Section 6.3 requirement:
* Same request digest returns identical previous outcome.
* Different request with identical nullifier is rejected with 409.
"""

import pytest


@pytest.mark.anyio
async def test_identical_request_digest_returns_previous_outcome(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Submitting the exact same request again must safely return the previous outcome.
    Handle, leaf_index, and nullifier_commitment match the earlier submission.
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_idemp_alpha"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_exact_key_01"
    }

    # Initial submission
    res1 = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )
    assert res1.status_code == 202
    data1 = res1.json()

    # Network retry or second submission with identical digest
    res2 = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )
    assert res2.status_code == 202
    data2 = res2.json()

    assert data2["handle"] == data1["handle"]
    assert data2["leaf_index"] == data1["leaf_index"]
    assert data2["nullifier_commitment"] == data1["nullifier_commitment"]
    assert data2["status"] == data1["status"]


@pytest.mark.anyio
async def test_duplicate_nullifier_with_different_digest_rejected(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Submitting a different ballot payload with an already spent nullifier must be rejected with 409.
    Prevents double voting or credential reuse attempts.
    """
    shared_nullifier = "null_shared_spent_01"

    payload1 = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof(shared_nullifier),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_attempt_one"
    }

    # First vote cast successfully
    res1 = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload1
    )
    assert res1.status_code == 202
    data1 = res1.json()
    assert data1["leaf_index"] == 0

    # Second vote attempt using same credential nullifier but different idempotency key or ballot
    payload2 = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof(shared_nullifier),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_attempt_two"  # Different idempotency key produces different digest
    }

    res2 = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload2
    )
    assert res2.status_code == 409
    err = res2.json()
    assert "already spent" in err["detail"]


@pytest.mark.anyio
async def test_distinct_nullifiers_succeed_sequentially(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Two distinct credential nullifiers both succeed and receive sequential leaf indices 0 and 1.
    """
    payload1 = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_voter_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_voter_01"
    }
    res1 = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload1
    )
    assert res1.status_code == 202
    assert res1.json()["leaf_index"] == 0

    payload2 = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_voter_02"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_voter_02"
    }
    res2 = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload2
    )
    assert res2.status_code == 202
    assert res2.json()["leaf_index"] == 1
