"""
Unit tests validating receipt status queries and lifecycle transitions.
Covers Section 6.3 requirement for receipt verification by opaque handle.
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy import select

from src.models import Election, WitnessAcknowledgement


@pytest.mark.anyio
async def test_receipt_status_transitions(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url,
    test_session
):
    """
    Verify complete receipt verification lifecycle:
    1. Initially COMMITTED_PENDING_WITNESS.
    2. Transitions to WITNESSED once witness acknowledgement is recorded.
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_receipt_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_receipt_01"
    }

    # Cast ballot
    cast_resp = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload
    )
    assert cast_resp.status_code == 202
    handle = cast_resp.json()["handle"]
    leaf_index = cast_resp.json()["leaf_index"]

    # Query receipt status immediately
    rcpt_resp1 = await client.get(
        f"/v1/cast/{sample_election_id}/receipts/{handle}"
    )
    assert rcpt_resp1.status_code == 200
    data1 = rcpt_resp1.json()
    assert data1["status"] == "COMMITTED_PENDING_WITNESS"
    assert data1["handle"] == handle
    assert data1["leaf_index"] == leaf_index
    assert data1["witnessed_at_utc"] is None

    # Record witness acknowledgement covering leaf 0 (tree_size = 1)
    now = datetime.now(timezone.utc)
    witness = WitnessAcknowledgement(
        id="wit_ack_01",
        election_id=sample_election_id,
        tree_size=1,
        merkle_root="merkle_root_tree_size_1",
        witness_key_id="witness_key_ed25519_01",
        witness_signature="sig_b64_vector",
        acknowledged_at_utc=now
    )
    test_session.add(witness)

    # Also update last_witnessed_tree_size on election
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    election.last_witnessed_tree_size = 1
    await test_session.commit()

    # Query receipt status again
    rcpt_resp2 = await client.get(
        f"/v1/cast/{sample_election_id}/receipts/{handle}"
    )
    assert rcpt_resp2.status_code == 200
    data2 = rcpt_resp2.json()
    assert data2["status"] == "WITNESSED"
    assert data2["witnessed_at_utc"] is not None


@pytest.mark.anyio
async def test_receipt_not_found(client, sample_election_id):
    """
    Verify 404 returned when handle does not exist.
    """
    response = await client.get(
        f"/v1/cast/{sample_election_id}/receipts/rcpt_non_existent_token"
    )
    assert response.status_code == 404
    assert "Receipt handle not found" in response.json()["detail"]


@pytest.mark.anyio
async def test_admin_open_and_close_endpoints(
    client,
    open_election,
    sample_election_id,
    test_session
):
    """
    Verify admin open and close transitions and final tree size recording under row lock.
    """
    # Close election
    close_resp = await client.post(
        f"/v1/admin/elections/{sample_election_id}/close"
    )
    assert close_resp.status_code == 200
    close_data = close_resp.json()
    assert close_data["status"] == "CLOSED"
    assert close_data["final_tree_size"] == 0

    # Verify state in database
    test_session.expire_all()
    election = (
        await test_session.execute(
            select(Election).where(Election.id == sample_election_id)
        )
    ).scalar_one()
    assert election.state == "CLOSED"
    assert election.final_tree_size == 0

    # Reopen election
    open_resp = await client.post(
        f"/v1/admin/elections/{sample_election_id}/open"
    )
    assert open_resp.status_code == 200
    assert open_resp.json()["status"] == "OPEN"
