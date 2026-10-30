"""
Unit tests for outbox storage repository.
Tests persistence, uniqueness, status updates, and retrieval.
"""

from anchor_relayer.models import OutboxStatus, WitnessedCheckpoint
from anchor_relayer.storage import SQLiteOutboxRepository


def test_enqueue_and_retrieve(sqlite_repo, sample_checkpoint):
    """
    Verifies checkpoint can be enqueued and retrieved by id or sequence.
    """
    record = sqlite_repo.enqueue(sample_checkpoint)
    assert record.sequence == sample_checkpoint.sequence
    assert record.status == OutboxStatus.ANCHOR_PENDING

    fetched = sqlite_repo.get_by_id(record.id)
    assert fetched is not None
    assert fetched.digest == sample_checkpoint.digest

    by_seq = sqlite_repo.get_by_election_and_sequence(
        sample_checkpoint.election_commitment,
        sample_checkpoint.sequence,
    )
    assert by_seq is not None
    assert by_seq.id == record.id


def test_enqueue_duplicate_returns_existing(sqlite_repo, sample_checkpoint):
    """
    Verifies enqueueing identical election commitment and sequence returns existing row.
    """
    rec1 = sqlite_repo.enqueue(sample_checkpoint)
    rec2 = sqlite_repo.enqueue(sample_checkpoint)
    assert rec1.id == rec2.id


def test_status_transitions(sqlite_repo, sample_checkpoint):
    """
    Verifies status transitions through outbox lifecycle.
    """
    rec = sqlite_repo.enqueue(sample_checkpoint)

    sqlite_repo.mark_prepared(rec.id, tx_nonce=5)
    r_prep = sqlite_repo.get_by_id(rec.id)
    assert r_prep.status == OutboxStatus.ANCHOR_PREPARED
    assert r_prep.tx_nonce == 5

    sqlite_repo.mark_submitted(rec.id, tx_hash="0xabcd")
    r_sub = sqlite_repo.get_by_id(rec.id)
    assert r_sub.status == OutboxStatus.ANCHOR_SUBMITTED
    assert r_sub.tx_hash == "0xabcd"

    sqlite_repo.mark_confirming(rec.id, block_number=50, block_hash="0x1234", confirmation_count=3)
    r_conf = sqlite_repo.get_by_id(rec.id)
    assert r_conf.status == OutboxStatus.CONFIRMING
    assert r_conf.confirmation_count == 3

    sqlite_repo.mark_finalized(rec.id, block_number=50, block_hash="0x1234", confirmation_count=12)
    r_fin = sqlite_repo.get_by_id(rec.id)
    assert r_fin.status == OutboxStatus.ANCHOR_FINALIZED
    assert r_fin.confirmation_count == 12


def test_reset_to_pending_clears_blocks(sqlite_repo, sample_checkpoint):
    """
    Verifies resetting to pending clears block information and confirmation count.
    """
    rec = sqlite_repo.enqueue(sample_checkpoint)
    sqlite_repo.mark_submitted(rec.id, tx_hash="0xabcd")
    sqlite_repo.mark_confirming(rec.id, block_number=50, block_hash="0x1234", confirmation_count=5)

    sqlite_repo.reset_to_pending(rec.id, reason="Reorg detected")
    r_reset = sqlite_repo.get_by_id(rec.id)
    assert r_reset.status == OutboxStatus.ANCHOR_PENDING
    assert r_reset.block_number is None
    assert r_reset.block_hash is None
    assert r_reset.confirmation_count == 0
    assert r_reset.error_message == "Reorg detected"
