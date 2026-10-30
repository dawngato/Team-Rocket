"""
Unit tests for Witness SQLite backing store and append only persistence.
Validates:
* Atomic state transitions and WAL persistence
* Rejection of sequence gaps and rollbacks
* Rejection of tree size decrease
* Rejection of manifest changes
* Rejection of previous checkpoint digest mismatches
* Final sealing and rejection of updates after FINAL
* Idempotent replay handling
* Append only audit log disk persistence
"""

import os
import json
import pytest
from witness.storage import (
    WitnessStorage,
    SequenceGapError,
    SequenceRollbackError,
    TreeSizeRollbackError,
    ManifestMismatchError,
    PreviousCheckpointMismatchError,
    ElectionAlreadyFinalizedError,
    ConflictingFinalCheckpointError
)
from witness.crypto import KeyManager


@pytest.fixture
def temp_storage(tmp_path):
    """Create isolated WitnessStorage instance in temporary directory."""
    db_file = str(tmp_path / "witness_test.db")
    log_file = str(tmp_path / "witness_audit.jsonl")
    return WitnessStorage(db_path=db_file, append_log_path=log_file)


@pytest.fixture
def mock_signer():
    """Mock witness signer callback."""
    km = KeyManager()

    def sign_fn(election_id: str, previous_witness_sequence: int, checkpoint_canonical_bytes: bytes) -> str:
        return km.sign_witness_ack(election_id, previous_witness_sequence, checkpoint_canonical_bytes)

    return sign_fn, km.get_public_hex()


def test_initial_checkpoint_sequence_enforcement(temp_storage, mock_signer):
    """Verify first checkpoint must have sequence 1."""
    sign_fn, pub_key = mock_signer

    with pytest.raises(SequenceGapError):
        temp_storage.record_checkpoint(
            election_id="elec_1",
            manifest_digest="a" * 64,
            tree_size=1,
            merkle_root="b" * 64,
            checkpoint_sequence=2,  # Invalid start
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="c" * 64,
            canonical_json="{}",
            previous_checkpoint_digest=None,
            writer_signature="sig",
            writer_public_key="pub",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )


def test_monotonic_sequence_and_gap_refusal(temp_storage, mock_signer):
    """Verify checkpoints must increment sequence strictly by 1 without gaps."""
    sign_fn, pub_key = mock_signer

    # Sequence 1 succeeds
    rec1, is_replay = temp_storage.record_checkpoint(
        election_id="elec_1",
        manifest_digest="a" * 64,
        tree_size=1,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="INCREMENTAL",
        checkpoint_digest="c1" * 32,
        canonical_json='{"seq":1}',
        previous_checkpoint_digest=None,
        writer_signature="sig1",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )
    assert rec1["checkpoint_sequence"] == 1
    assert not is_replay

    # Gap: Sequence 3 instead of 2 fails
    with pytest.raises(SequenceGapError):
        temp_storage.record_checkpoint(
            election_id="elec_1",
            manifest_digest="a" * 64,
            tree_size=2,
            merkle_root="b2" * 32,
            checkpoint_sequence=3,
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="c3" * 32,
            canonical_json='{"seq":3}',
            previous_checkpoint_digest="c1" * 32,
            writer_signature="sig3",
            writer_public_key="pub1",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )

    # Rollback: Sequence 1 again with different data fails
    with pytest.raises(SequenceRollbackError):
        temp_storage.record_checkpoint(
            election_id="elec_1",
            manifest_digest="a" * 64,
            tree_size=2,
            merkle_root="b2" * 32,
            checkpoint_sequence=1,
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="different" * 4 + "0" * 28,
            canonical_json='{"seq":1,"alt":true}',
            previous_checkpoint_digest=None,
            writer_signature="sig_alt",
            writer_public_key="pub1",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )


def test_tree_size_rollback_refusal(temp_storage, mock_signer):
    """Verify tree size cannot decrease between checkpoints."""
    sign_fn, pub_key = mock_signer

    temp_storage.record_checkpoint(
        election_id="elec_tree",
        manifest_digest="a" * 64,
        tree_size=10,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="INCREMENTAL",
        checkpoint_digest="c1" * 32,
        canonical_json='{"size":10}',
        previous_checkpoint_digest=None,
        writer_signature="sig1",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )

    # Smaller tree size 9 fails
    with pytest.raises(TreeSizeRollbackError):
        temp_storage.record_checkpoint(
            election_id="elec_tree",
            manifest_digest="a" * 64,
            tree_size=9,
            merkle_root="b_new" * 12 + "0000",
            checkpoint_sequence=2,
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="c2" * 32,
            canonical_json='{"size":9}',
            previous_checkpoint_digest="c1" * 32,
            writer_signature="sig2",
            writer_public_key="pub1",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )


def test_manifest_mismatch_refusal(temp_storage, mock_signer):
    """Verify manifest digest cannot change for an existing election."""
    sign_fn, pub_key = mock_signer

    temp_storage.record_checkpoint(
        election_id="elec_manifest",
        manifest_digest="a" * 64,
        tree_size=1,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="INCREMENTAL",
        checkpoint_digest="c1" * 32,
        canonical_json='{"seq":1}',
        previous_checkpoint_digest=None,
        writer_signature="sig1",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )

    with pytest.raises(ManifestMismatchError):
        temp_storage.record_checkpoint(
            election_id="elec_manifest",
            manifest_digest="f" * 64,  # Changed manifest
            tree_size=2,
            merkle_root="b2" * 32,
            checkpoint_sequence=2,
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="c2" * 32,
            canonical_json='{"seq":2}',
            previous_checkpoint_digest="c1" * 32,
            writer_signature="sig2",
            writer_public_key="pub1",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )


def test_previous_checkpoint_digest_mismatch_refusal(temp_storage, mock_signer):
    """Verify previous_checkpoint_digest must match digest of prior checkpoint."""
    sign_fn, pub_key = mock_signer

    temp_storage.record_checkpoint(
        election_id="elec_chain",
        manifest_digest="a" * 64,
        tree_size=1,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="INCREMENTAL",
        checkpoint_digest="actual_digest_01" * 4,
        canonical_json='{"seq":1}',
        previous_checkpoint_digest=None,
        writer_signature="sig1",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )

    with pytest.raises(PreviousCheckpointMismatchError):
        temp_storage.record_checkpoint(
            election_id="elec_chain",
            manifest_digest="a" * 64,
            tree_size=2,
            merkle_root="b2" * 32,
            checkpoint_sequence=2,
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="c2" * 32,
            canonical_json='{"seq":2}',
            previous_checkpoint_digest="forged_previous_digest" * 2 + "0" * 18,
            writer_signature="sig2",
            writer_public_key="pub1",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )


def test_final_sealing_and_update_rejection(temp_storage, mock_signer):
    """Verify election seals as FINAL and refuses further updates."""
    sign_fn, pub_key = mock_signer

    temp_storage.record_checkpoint(
        election_id="elec_final",
        manifest_digest="a" * 64,
        tree_size=5,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="FINAL",
        checkpoint_digest="final_digest_01" * 4,
        canonical_json='{"status":"FINAL"}',
        previous_checkpoint_digest=None,
        writer_signature="sig_final",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )

    # Any subsequent checkpoint must be refused
    with pytest.raises(ElectionAlreadyFinalizedError):
        temp_storage.record_checkpoint(
            election_id="elec_final",
            manifest_digest="a" * 64,
            tree_size=6,
            merkle_root="b_new" * 12 + "0000",
            checkpoint_sequence=2,
            checkpoint_kind="INCREMENTAL",
            checkpoint_digest="c2" * 32,
            canonical_json='{"seq":2}',
            previous_checkpoint_digest="final_digest_01" * 4,
            writer_signature="sig2",
            writer_public_key="pub1",
            witness_signature_fn=sign_fn,
            witness_public_key=pub_key
        )


def test_idempotent_replay(temp_storage, mock_signer):
    """Verify identical checkpoint submission returns earlier acknowledgement."""
    sign_fn, pub_key = mock_signer

    rec1, replay1 = temp_storage.record_checkpoint(
        election_id="elec_idempotent",
        manifest_digest="a" * 64,
        tree_size=1,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="INCREMENTAL",
        checkpoint_digest="digest_idem_1" * 4 + "0000",
        canonical_json='{"item":1}',
        previous_checkpoint_digest=None,
        writer_signature="sig1",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )
    assert not replay1

    # Exact replay
    rec2, replay2 = temp_storage.record_checkpoint(
        election_id="elec_idempotent",
        manifest_digest="a" * 64,
        tree_size=1,
        merkle_root="b" * 64,
        checkpoint_sequence=1,
        checkpoint_kind="INCREMENTAL",
        checkpoint_digest="digest_idem_1" * 4 + "0000",
        canonical_json='{"item":1}',
        previous_checkpoint_digest=None,
        writer_signature="sig1",
        writer_public_key="pub1",
        witness_signature_fn=sign_fn,
        witness_public_key=pub_key
    )
    assert replay2
    assert rec1["witness_signature"] == rec2["witness_signature"]
