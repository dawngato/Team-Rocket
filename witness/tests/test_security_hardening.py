"""Focused negative tests for witness trust-root enforcement."""

from fastapi.testclient import TestClient

from witness.app import create_app
from witness.config import WitnessConfig
from witness.crypto import KeyManager
from witness.canonical import canonical_json_bytes


def test_writer_key_must_be_pinned(tmp_path) -> None:
    config = WitnessConfig(
        witness_id="unconfigured_witness",
        db_path=str(tmp_path / "witness.db"),
        audit_log_path=str(tmp_path / "audit.jsonl"),
        require_writer_signature=True,
        pinned_writers={},
    )
    client = TestClient(create_app(config))
    writer = KeyManager()
    checkpoint = {
        "election_id": "election_one",
        "manifest_digest": "a" * 64,
        "tree_size": 0,
        "merkle_root": "b" * 64,
        "previous_checkpoint_digest": None,
        "last_leaf_index": None,
        "last_leaf_digest": None,
        "issued_count": 0,
        "issuance_ledger_digest": "c" * 64,
        "roster_commitment": "d" * 64,
        "protocol_version": "1.0",
        "checkpoint_kind": "INCREMENTAL",
        "checkpoint_sequence": 1,
    }
    response = client.post(
        "/checkpoints",
        json={
            "checkpoint": checkpoint,
            "writer_signature": writer.sign_hex(canonical_json_bytes(checkpoint)),
            "writer_public_key": writer.get_public_hex(),
        },
    )

    assert response.status_code == 401
    assert response.json()["error"] == "FORGED_OR_INVALID_WRITER_SIGNATURE"
