"""
Unit tests covering blockchain reorganization detection and status reset.
Verifies that reorganized blocks reset status to ANCHOR_PENDING.
"""

from unittest.mock import MagicMock
from hexbytes import HexBytes
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import OutboxStatus, WitnessedCheckpoint
from anchor_relayer.poller import ConfirmationPoller
from anchor_relayer.reorg_detector import ReorgCheckResult, ReorgDetector
from anchor_relayer.storage import SQLiteOutboxRepository


def test_reorg_resets_status_to_anchor_pending(sqlite_repo, sample_checkpoint):
    """
    Verifies that when a block reorganization is detected,
    the outbox record status resets to ANCHOR_PENDING and block info is cleared.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.block_number = 105

    record = sqlite_repo.enqueue(sample_checkpoint)
    tx_hash = "0x" + "1" * 64
    block_hash_old = "0x" + "2" * 64
    sqlite_repo.mark_submitted(record.id, tx_hash)
    sqlite_repo.mark_confirming(record.id, block_number=100, block_hash=block_hash_old, confirmation_count=6)

    reorg_detector = MagicMock(spec=ReorgDetector)
    reorg_result = MagicMock()
    reorg_result.is_reorg = True
    reorg_result.reason = "Block hash mismatch at height 100"
    reorg_result.canonical_block_hash = "0x" + "3" * 64
    reorg_detector.check_for_reorg.return_value = reorg_result

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = False

    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        required_confirmations=12,
    )

    confirming_rec = sqlite_repo.get_by_id(record.id)
    poller.poll_record(confirming_rec)

    reset_rec = sqlite_repo.get_by_id(record.id)
    assert reset_rec.status == OutboxStatus.ANCHOR_PENDING
    assert reset_rec.block_number is None
    assert reset_rec.block_hash is None
    assert reset_rec.confirmation_count == 0
    assert "reorg detected" in reset_rec.error_message.lower()


def test_reorg_detector_direct_block_hash_mismatch():
    """
    Verifies ReorgDetector identifies hash mismatch between canonical node and recorded receipt.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_block.return_value = {
        "hash": HexBytes("0x" + "4" * 64),
    }

    detector = ReorgDetector(mock_w3)
    result = detector.check_for_reorg(
        tx_hash="0x" + "5" * 64,
        recorded_block_number=50,
        recorded_block_hash="0x" + "6" * 64,
    )

    assert result.is_reorg is True
    assert "mismatch" in result.reason.lower()


def test_reorg_detector_direct_canonical_match():
    """
    Verifies ReorgDetector validates consistent block and transaction.
    """
    matching_hash = "0x" + "7" * 64
    tx_hash = "0x" + "8" * 64

    mock_w3 = MagicMock()
    mock_w3.eth.get_block.return_value = {
        "hash": HexBytes(matching_hash),
    }
    mock_w3.eth.get_transaction.return_value = {
        "blockNumber": 50,
        "blockHash": HexBytes(matching_hash),
    }

    detector = ReorgDetector(mock_w3)
    result = detector.check_for_reorg(
        tx_hash=tx_hash,
        recorded_block_number=50,
        recorded_block_hash=matching_hash,
    )

    assert result.is_reorg is False
    assert result.canonical_block_hash.lower() == matching_hash.lower()


def test_reorg_detector_treats_rpc_lookup_failure_as_indeterminate():
    mock_w3 = MagicMock()
    mock_w3.eth.get_block.side_effect = RuntimeError("RPC unavailable")

    result = ReorgDetector(mock_w3).check_for_reorg(
        tx_hash="0x" + "5" * 64,
        recorded_block_number=50,
        recorded_block_hash="0x" + "6" * 64,
    )

    assert result.is_reorg is False
    assert result.is_indeterminate is True


def test_poller_keeps_confirming_record_when_rpc_cannot_check_canonical_chain(sqlite_repo, sample_checkpoint):
    mock_w3 = MagicMock()
    mock_w3.eth.block_number = 105
    record = sqlite_repo.enqueue(sample_checkpoint)
    sqlite_repo.mark_submitted(record.id, "0x" + "1" * 64)
    sqlite_repo.mark_confirming(record.id, block_number=100, block_hash="0x" + "2" * 64, confirmation_count=6)

    reorg_detector = MagicMock(spec=ReorgDetector)
    reorg_detector.check_for_reorg.return_value = ReorgCheckResult(
        is_reorg=False,
        reason="RPC unavailable",
        is_indeterminate=True,
    )
    contract_client = MagicMock(spec=HimVoteAnchorClient)
    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=contract_client,
        reorg_detector=reorg_detector,
        required_confirmations=12,
    )

    poller.poll_record(sqlite_repo.get_by_id(record.id))

    unchanged = sqlite_repo.get_by_id(record.id)
    assert unchanged.status == OutboxStatus.CONFIRMING
    assert unchanged.confirmation_count == 6
    contract_client.is_already_anchored.assert_not_called()
