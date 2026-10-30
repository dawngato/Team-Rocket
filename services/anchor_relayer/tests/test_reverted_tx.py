"""
Unit tests covering reverted transactions and canonical chain reconciliation.
"""

from unittest.mock import MagicMock
from hexbytes import HexBytes
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import OutboxStatus, WitnessedCheckpoint
from anchor_relayer.poller import ConfirmationPoller
from anchor_relayer.reorg_detector import ReorgDetector
from anchor_relayer.storage import SQLiteOutboxRepository


def test_transaction_reverted_marks_failed(sqlite_repo, sample_checkpoint):
    """
    Verifies that a transaction with status 0 in receipt is marked FAILED in outbox.
    """
    mock_w3 = MagicMock()
    record = sqlite_repo.enqueue(sample_checkpoint)
    tx_hash = "0x" + "a" * 64
    sqlite_repo.mark_submitted(record.id, tx_hash)

    mock_receipt = {
        "status": 0,
        "blockNumber": 120,
        "blockHash": HexBytes("0x" + "b" * 64),
        "transactionHash": HexBytes(tx_hash),
    }
    mock_w3.eth.get_transaction_receipt.return_value = mock_receipt

    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=MagicMock(),
        reorg_detector=MagicMock(),
        required_confirmations=12,
    )

    sub_rec = sqlite_repo.get_by_id(record.id)
    poller.poll_record(sub_rec)

    failed_rec = sqlite_repo.get_by_id(record.id)
    assert failed_rec.status == OutboxStatus.FAILED
    assert "reverted" in failed_rec.error_message.lower()


def test_reorg_with_on_chain_presence_finalizes(sqlite_repo, sample_checkpoint):
    """
    Verifies that if a reorg happens but the checkpoint is already in canonical contract state,
    the relayer reconciles and finalizes.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.block_number = 150

    record = sqlite_repo.enqueue(sample_checkpoint)
    tx_hash = "0x" + "c" * 64
    old_hash = "0x" + "d" * 64
    sqlite_repo.mark_submitted(record.id, tx_hash)
    sqlite_repo.mark_confirming(record.id, block_number=130, block_hash=old_hash, confirmation_count=5)

    reorg_detector = MagicMock(spec=ReorgDetector)
    reorg_res = MagicMock()
    reorg_res.is_reorg = True
    reorg_res.reason = "Block reorganization"
    reorg_res.canonical_block_hash = "0x" + "e" * 64
    reorg_detector.check_for_reorg.return_value = reorg_res

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = True
    mock_contract_client.get_checkpoint.return_value = (
        sample_checkpoint.sequence,
        HexBytes(sample_checkpoint.digest),
        HexBytes(sample_checkpoint.previous_digest),
        False,
        132,
        1700000000,
    )

    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        required_confirmations=12,
    )

    confirming_rec = sqlite_repo.get_by_id(record.id)
    poller.poll_record(confirming_rec)

    finalized_rec = sqlite_repo.get_by_id(record.id)
    assert finalized_rec.status == OutboxStatus.ANCHOR_FINALIZED
    assert finalized_rec.block_number == 132
    assert finalized_rec.confirmation_count == 150 - 132 + 1
