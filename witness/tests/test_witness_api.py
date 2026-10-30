"""
Integration test suite for HimVote Independent Witness FastAPI service.
Validates all requirements specified in prompt.md Section 5.4 and Section 6.6:
* POST /checkpoints verification (election ID, manifest digest, writer signature, monotonic tree, consistency proof)
* POST /elections/{id}/final sealing, marking FINAL, and preventing updates
* GET /elections/{id}/final signed final checkpoint retrieval
* Rejection of non monotonic trees
* Rejection of forged writer signatures
* Rejection of rollback attempts and sequence gaps
* Rejection of wrong elections and manifest changes
* Rejection of second conflicting finals and post final updates
"""

import json
import pytest
from fastapi.testclient import TestClient

from witness.app import create_app
from witness.config import WitnessConfig
from witness.crypto import (
    KeyManager,
    leaf_hash,
    merkle_tree_hash,
    generate_consistency_proof,
    verify_ed25519_signature,
    compute_witness_binding,
    sha256_hex
)
from witness.canonical import canonical_json_bytes


@pytest.fixture
def client_env(tmp_path):
    """Create test client with clean isolated database and known writer key."""
    db_file = str(tmp_path / "test_api_witness.db")
    audit_file = str(tmp_path / "test_api_audit.jsonl")

    # Generate dedicated log writer keypair
    writer_km = KeyManager()
    writer_pub = writer_km.get_public_hex()

    election_id = "election_institutional_001"
    pinned = {election_id: writer_pub}

    config = WitnessConfig(
        witness_id="witness_test_node",
        db_path=db_file,
        audit_log_path=audit_file,
        require_writer_signature=True,
        pinned_writers=pinned
    )

    app = create_app(config)
    client = TestClient(app)

    return {
        "client": client,
        "writer_km": writer_km,
        "writer_pub": writer_pub,
        "election_id": election_id,
        "app": app
    }


def make_signed_submission(
    writer_km: KeyManager,
    election_id: str,
    manifest_digest: str,
    tree_size: int,
    merkle_root: str,
    sequence: int,
    kind: str = "INCREMENTAL",
    previous_checkpoint_digest: str = None,
    last_leaf_digest: str = None,
    consistency_proof: list = None
) -> dict:
    """Helper creating canonical checkpoint record with valid writer signature."""
    last_leaf_idx = tree_size - 1 if tree_size > 0 else None
    checkpoint = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "tree_size": tree_size,
        "merkle_root": merkle_root,
        "previous_checkpoint_digest": previous_checkpoint_digest,
        "last_leaf_index": last_leaf_idx,
        "last_leaf_digest": last_leaf_digest or ("00" * 32),
        "issued_count": 100,
        "issuance_ledger_digest": "ledger_digest_" + "0" * 50,
        "roster_commitment": "roster_commitment_" + "0" * 46,
        "protocol_version": "1.0",
        "checkpoint_kind": kind,
        "checkpoint_sequence": sequence
    }
    canonical_bytes = canonical_json_bytes(checkpoint)
    sig = writer_km.sign_hex(canonical_bytes)

    return {
        "checkpoint": checkpoint,
        "consistency_proof": consistency_proof or [],
        "writer_signature": sig,
        "writer_public_key": writer_km.get_public_hex()
    }


def test_witness_health_and_public_key(client_env):
    """Verify operational health and public key endpoints."""
    client = client_env["client"]

    # Health check
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "witness_public_key" in data

    # Public key endpoint
    res = client.get("/witness/public_key")
    assert res.status_code == 200
    pk_data = res.json()
    assert pk_data["algorithm"] == "Ed25519"
    assert pk_data["witness_public_key"] == data["witness_public_key"]


def test_checkpoint_happy_path_with_consistency_proof(client_env):
    """
    Test full lifecycle:
    1. Checkpoint 1 (tree size 1)
    2. Checkpoint 2 (tree size 3) with valid RFC 9162 consistency proof
    3. Verification of witness signature
    """
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    # Build Merkle tree leaves
    leaf1 = leaf_hash(b"leaf_data_01")
    leaf2 = leaf_hash(b"leaf_data_02")
    leaf3 = leaf_hash(b"leaf_data_03")

    root1 = merkle_tree_hash([leaf1]).hex()

    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1,
        previous_checkpoint_digest=None,
        last_leaf_digest=leaf1.hex()
    )

    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200, res1.text
    ack1 = res1.json()
    assert ack1["status"] == "ACCEPTED"
    assert ack1["checkpoint_sequence"] == 1
    assert ack1["witness_sequence"] == 1
    assert ack1["previous_witness_sequence"] == 0

    # Checkpoint 2: extended tree size 3
    leaves_up_to_3 = [leaf1, leaf2, leaf3]
    root2 = merkle_tree_hash(leaves_up_to_3).hex()
    proof_1_to_3 = [h.hex() for h in generate_consistency_proof(1, leaves_up_to_3)]

    sub2 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=3,
        merkle_root=root2,
        sequence=2,
        previous_checkpoint_digest=ack1["checkpoint_digest"],
        last_leaf_digest=leaf3.hex(),
        consistency_proof=proof_1_to_3
    )

    res2 = client.post("/checkpoints", json=sub2)
    assert res2.status_code == 200, res2.text
    ack2 = res2.json()
    assert ack2["status"] == "ACCEPTED"
    assert ack2["checkpoint_sequence"] == 2
    assert ack2["witness_sequence"] == 2
    assert ack2["previous_witness_sequence"] == 1

    # Verify witness signature on ack2
    witness_pub = ack2["witness_public_key"]
    binding = compute_witness_binding(
        election_id=election_id,
        previous_witness_sequence=1,
        checkpoint_canonical_bytes=canonical_json_bytes(ack2["checkpoint"])
    )
    assert verify_ed25519_signature(witness_pub, ack2["witness_signature"], binding)


def test_rejection_of_forged_writer_signatures(client_env):
    """Verify checkpoint is rejected when writer signature is forged or invalid."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    root = leaf_hash(b"leaf_1").hex()
    sub = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root,
        sequence=1
    )

    # Corrupt writer signature
    sub["writer_signature"] = "deadbeef" * 16
    res = client.post("/checkpoints", json=sub)
    assert res.status_code == 401
    assert "FORGED_OR_INVALID_WRITER_SIGNATURE" in res.json()["error"]

    # Forged by unauthorized key
    unauthorized_km = KeyManager()
    canonical_bytes = canonical_json_bytes(sub["checkpoint"])
    sub["writer_signature"] = unauthorized_km.sign_hex(canonical_bytes)
    sub["writer_public_key"] = unauthorized_km.get_public_hex()

    res = client.post("/checkpoints", json=sub)
    assert res.status_code == 401


def test_rejection_of_non_monotonic_tree_size(client_env):
    """Verify rejection when tree size decreases or is non monotonic."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    leaf1 = leaf_hash(b"leaf_1")
    leaf2 = leaf_hash(b"leaf_2")
    root2 = merkle_tree_hash([leaf1, leaf2]).hex()

    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=2,
        merkle_root=root2,
        sequence=1
    )
    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200
    ack1 = res1.json()

    # Smaller tree size 1 in sequence 2 must be rejected
    sub2 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,  # Non monotonic decrease
        merkle_root=leaf1.hex(),
        sequence=2,
        previous_checkpoint_digest=ack1["checkpoint_digest"]
    )
    res2 = client.post("/checkpoints", json=sub2)
    assert res2.status_code == 409
    assert "TREE_SIZE_ROLLBACK_REFUSED" in res2.json()["error"]


def test_rejection_of_invalid_consistency_proof(client_env):
    """Verify rejection when consistency proof is forged or incorrect."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    leaf1 = leaf_hash(b"leaf_1")
    leaf2 = leaf_hash(b"leaf_2")
    root1 = merkle_tree_hash([leaf1]).hex()
    root2 = merkle_tree_hash([leaf1, leaf2]).hex()

    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1
    )
    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200
    ack1 = res1.json()

    # Submit tree size 2 with corrupted consistency proof
    sub2 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=2,
        merkle_root=root2,
        sequence=2,
        previous_checkpoint_digest=ack1["checkpoint_digest"],
        consistency_proof=["00" * 32]  # Corrupted proof
    )
    res2 = client.post("/checkpoints", json=sub2)
    assert res2.status_code == 422
    assert "INVALID_CONSISTENCY_PROOF" in res2.json()["error"]


def test_rejection_of_rollback_attempts(client_env):
    """Verify rejection of rollback to older sequence or wrong previous digest."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    leaf1 = leaf_hash(b"leaf_1")
    root1 = merkle_tree_hash([leaf1]).hex()

    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1
    )
    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200

    # Rollback to sequence 1 with different content
    leaf_alt = leaf_hash(b"leaf_alt")
    root_alt = merkle_tree_hash([leaf_alt]).hex()
    sub_rollback = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root_alt,
        sequence=1
    )
    res_roll = client.post("/checkpoints", json=sub_rollback)
    assert res_roll.status_code == 409
    assert "SEQUENCE_ROLLBACK_REFUSED" in res_roll.json()["error"]


def test_rejection_of_sequence_gaps(client_env):
    """Verify refusal of sequence gaps (e.g. sequence 1 then sequence 3)."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    leaf1 = leaf_hash(b"leaf_1")
    root1 = merkle_tree_hash([leaf1]).hex()

    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1
    )
    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200
    ack1 = res1.json()

    # Skip sequence 2 and attempt sequence 3
    leaf2 = leaf_hash(b"leaf_2")
    root2 = merkle_tree_hash([leaf1, leaf2]).hex()
    sub_gap = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=2,
        merkle_root=root2,
        sequence=3,  # Gap
        previous_checkpoint_digest=ack1["checkpoint_digest"]
    )
    res_gap = client.post("/checkpoints", json=sub_gap)
    assert res_gap.status_code == 409
    assert "SEQUENCE_GAP_REFUSED" in res_gap.json()["error"]


def test_rejection_of_wrong_election_and_manifest_change(client_env):
    """Verify rejection of wrong election in final endpoint and manifest alterations."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    root1 = leaf_hash(b"leaf_1").hex()
    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1
    )
    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200

    # Wrong election in path vs payload
    res_wrong = client.post("/elections/different_election_999/final", json=sub1)
    assert res_wrong.status_code == 400
    assert "ELECTION_ID_MISMATCH" in res_wrong.json()["error"]

    # Manifest digest alteration in subsequent checkpoint
    sub_altered_manifest = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest="altered_manifest_" + "0" * 49,
        tree_size=2,
        merkle_root=leaf_hash(b"leaf_2").hex(),
        sequence=2,
        previous_checkpoint_digest=res1.json()["checkpoint_digest"]
    )
    res_manifest = client.post("/checkpoints", json=sub_altered_manifest)
    assert res_manifest.status_code == 409
    assert "MANIFEST_MISMATCH" in res_manifest.json()["error"]


def test_final_sealing_and_retrieval(client_env):
    """
    Test POST /elections/{id}/final sealing,
    GET /elections/{id}/final retrieval,
    and rejection of updates after FINAL.
    """
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    leaf1 = leaf_hash(b"leaf_1")
    root1 = merkle_tree_hash([leaf1]).hex()

    sub1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1
    )
    res1 = client.post("/checkpoints", json=sub1)
    assert res1.status_code == 200
    ack1 = res1.json()

    # Seal as FINAL via POST /elections/{id}/final
    final_leaf = leaf_hash(b"leaf_final")
    root_final = merkle_tree_hash([leaf1, final_leaf]).hex()
    proof = [h.hex() for h in generate_consistency_proof(1, [leaf1, final_leaf])]

    sub_final = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=2,
        merkle_root=root_final,
        sequence=2,
        kind="FINAL",
        previous_checkpoint_digest=ack1["checkpoint_digest"],
        consistency_proof=proof
    )

    res_final = client.post(f"/elections/{election_id}/final", json=sub_final)
    assert res_final.status_code == 200, res_final.text
    final_data = res_final.json()
    assert final_data["status"] == "FINAL"
    assert final_data["is_final"] is True
    assert final_data["checkpoint"]["checkpoint_kind"] == "FINAL"

    # GET /elections/{id}/final returns signed final
    get_res = client.get(f"/elections/{election_id}/final")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["checkpoint_digest"] == final_data["checkpoint_digest"]
    assert retrieved["witness_signature"] == final_data["witness_signature"]

    # Rejection of updates after FINAL
    sub_post_final = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=3,
        merkle_root="00" * 32,
        sequence=3,
        previous_checkpoint_digest=final_data["checkpoint_digest"]
    )
    res_post_final = client.post("/checkpoints", json=sub_post_final)
    assert res_post_final.status_code == 409
    assert "ELECTION_ALREADY_FINAL" in res_post_final.json()["error"]


def test_rejection_of_conflicting_second_final(client_env):
    """Verify rejection when an incompatible second FINAL is submitted."""
    client = client_env["client"]
    writer_km = client_env["writer_km"]
    election_id = client_env["election_id"]
    manifest_digest = "manifest_hash_" + "0" * 50

    root1 = leaf_hash(b"leaf_1").hex()
    sub_final1 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=root1,
        sequence=1,
        kind="FINAL"
    )
    res1 = client.post(f"/elections/{election_id}/final", json=sub_final1)
    assert res1.status_code == 200

    # Exact replay of same final returns 200 (idempotent)
    res_replay = client.post(f"/elections/{election_id}/final", json=sub_final1)
    assert res_replay.status_code == 200
    assert res_replay.json()["checkpoint_digest"] == res1.json()["checkpoint_digest"]

    # Conflicting second final with different tree root must be rejected
    sub_final2 = make_signed_submission(
        writer_km=writer_km,
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=leaf_hash(b"different_leaf").hex(),
        sequence=1,
        kind="FINAL"
    )
    res_conflict = client.post(f"/elections/{election_id}/final", json=sub_final2)
    assert res_conflict.status_code == 409
    assert "CONFLICTING_FINAL_REFUSED" in res_conflict.json()["error"]
