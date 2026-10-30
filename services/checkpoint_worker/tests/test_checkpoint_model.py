"""
Unit tests for himvote.checkpoint.v1 CheckpointRecord model.
"""

import pytest
from checkpoint_worker.models.checkpoint import CheckpointRecord


def test_checkpoint_record_canonical_serialization():
    """
    Checkpoint record must serialize into RFC 8785 canonical bytes deterministically.
    """
    record = CheckpointRecord(
        election_id="elec_alpha",
        manifest_digest="1" * 64,
        tree_size=10,
        merkle_root="2" * 64,
        previous_checkpoint_digest="0" * 64,
        last_leaf_index=9,
        last_leaf_digest="3" * 64,
        issued_count=50,
        issuance_ledger_digest="4" * 64,
        roster_commitment="5" * 64,
        protocol_version="1.0.0",
        checkpoint_kind="INCREMENTAL",
        checkpoint_sequence=1,
    )
    canonical_bytes = record.to_canonical_bytes()
    assert b"himvote.checkpoint.v1" in canonical_bytes
    assert record.compute_digest() is not None
    assert len(record.compute_digest()) == 64


def test_checkpoint_record_validation():
    """
    Negative values for tree size or sequence must raise validation error.
    """
    with pytest.raises(ValueError):
        CheckpointRecord(
            election_id="elec_beta",
            manifest_digest="1" * 64,
            tree_size=-1,
            merkle_root="2" * 64,
            issued_count=50,
            issuance_ledger_digest="4" * 64,
            roster_commitment="5" * 64,
            checkpoint_sequence=1,
        )
