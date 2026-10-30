"""
Unit tests covering blockchain reorganization recovery and gas price spike retries.
Verifies graceful degradation without pipeline stalling.
"""

from unittest.mock import MagicMock
from hexbytes import HexBytes
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import OutboxStatus, WitnessedCheckpoint
from anchor_relayer.poller import ConfirmationPoller
from anchor_relayer.reorg_detector import ReorgCheckResult, ReorgDetector
from anchor_relayer.service import AnchorRelayerService
from anchor_relayer.storage import SQLiteOutboxRepository
from anchor_relayer.tx_builder import GasPriceExceededError, TransactionBuilder
import relayer


def test_gas_price_spike_retains_pending_and_retries_successfully(
    relayer_config,
    test_signer,
    sqlite_repo,
    sample_checkpoint
):
    """
    Verifies that when a gas price spike occurs, the outbox record is NOT marked FAILED.
    Instead it remains in ANCHOR_PENDING and succeeds when gas price normalizes.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 0
    mock_w3.eth.block_number = 100

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = False
    mock_contract_client.get_latest_sequence.return_value = 0

    mock_tx_builder = MagicMock(spec=TransactionBuilder)
    mock_tx_builder.prepare_transaction.side_effect = GasPriceExceededError("Base fee 250 gwei exceeds ceiling 100 gwei")

    service = AnchorRelayerService(
        config=relayer_config,
        w3=mock_w3,
        repository=sqlite_repo,
        signer=test_signer,
        tx_builder=mock_tx_builder,
        contract_client=mock_contract_client,
    )

    outbox_rec = service.ingest_checkpoint(sample_checkpoint)
    assert outbox_rec.status == OutboxStatus.ANCHOR_PENDING

    # First attempt: gas price spike occurs
    service.process_pending_outbox()

    rec_after_spike = sqlite_repo.get_by_id(outbox_rec.id)
    assert rec_after_spike.status == OutboxStatus.ANCHOR_PENDING
    assert "gas price spike detected" in rec_after_spike.error_message.lower()

    # Second attempt: gas price normalizes
    mock_tx_builder.prepare_transaction.side_effect = None
    mock_tx_builder.prepare_transaction.return_value = {
        "nonce": 0,
        "gas": 100000,
        "to": relayer_config.contract_address,
    }
    tx_hash_hex = "0x" + "9" * 64
    mock_tx_builder.sign_transaction.return_value = b"signed_tx_bytes"
    mock_tx_builder.broadcast_transaction.return_value = tx_hash_hex

    service.process_pending_outbox()

    rec_success = sqlite_repo.get_by_id(outbox_rec.id)
    assert rec_success.status == OutboxStatus.ANCHOR_SUBMITTED
    assert rec_success.tx_hash == tx_hash_hex


def test_submitted_receipt_timeout_resets_to_pending(
    sqlite_repo,
    sample_checkpoint
):
    """
    Verifies that a submitted transaction with no receipt after timeout
    safely resets to ANCHOR_PENDING for resubmission.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_receipt.return_value = None

    record = sqlite_repo.enqueue(sample_checkpoint)
    tx_hash = "0x" + "a" * 64
    sqlite_repo.mark_submitted(record.id, tx_hash)

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = False

    reorg_detector = MagicMock(spec=ReorgDetector)

    # Configure poller with receipt_timeout_seconds of 0.0 to trigger immediate timeout
    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        required_confirmations=12,
        receipt_timeout_seconds=0.0,
    )

    sub_rec = sqlite_repo.get_by_id(record.id)
    poller.poll_record(sub_rec)

    reset_rec = sqlite_repo.get_by_id(record.id)
    assert reset_rec.status == OutboxStatus.ANCHOR_PENDING
    assert "timed out" in reset_rec.error_message.lower()


def test_reorg_recovery_and_resubmission_flow(
    relayer_config,
    test_signer,
    sqlite_repo,
    sample_checkpoint
):
    """
    Verifies full reorg recovery cycle:
    1. Confirming checkpoint experiences block reorganization.
    2. Poller detects reorg and resets outbox record to ANCHOR_PENDING.
    3. Relayer resubmits transaction on the canonical chain.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.block_number = 110
    mock_w3.eth.get_transaction_count.return_value = 1

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = False
    mock_contract_client.get_latest_sequence.return_value = 0

    tx_hash_old = "0x" + "1" * 64
    block_hash_old = "0x" + "2" * 64

    record = sqlite_repo.enqueue(sample_checkpoint)
    sqlite_repo.mark_submitted(record.id, tx_hash_old)
    sqlite_repo.mark_confirming(record.id, block_number=100, block_hash=block_hash_old, confirmation_count=5)

    # Setup reorg detector to report reorganization
    reorg_detector = MagicMock(spec=ReorgDetector)
    reorg_result = ReorgCheckResult(
        is_reorg=True,
        reason="Block reorganized out of canonical branch",
        canonical_block_hash="0x" + "3" * 64,
    )
    reorg_detector.check_for_reorg.return_value = reorg_result

    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        required_confirmations=12,
    )

    # 1. Poll confirming record: should detect reorg and reset to pending
    confirming_rec = sqlite_repo.get_by_id(record.id)
    poller.poll_record(confirming_rec)

    reorged_rec = sqlite_repo.get_by_id(record.id)
    assert reorged_rec.status == OutboxStatus.ANCHOR_PENDING
    assert reorged_rec.block_number is None
    assert reorged_rec.confirmation_count == 0

    # 2. Resubmission on canonical chain
    tx_hash_new = "0x" + "4" * 64
    mock_tx_builder = MagicMock(spec=TransactionBuilder)
    mock_tx_builder.prepare_transaction.return_value = {
        "nonce": 1,
        "gas": 120000,
        "to": relayer_config.contract_address,
    }
    mock_tx_builder.sign_transaction.return_value = b"signed_reorg_tx"
    mock_tx_builder.broadcast_transaction.return_value = tx_hash_new

    service = AnchorRelayerService(
        config=relayer_config,
        w3=mock_w3,
        repository=sqlite_repo,
        signer=test_signer,
        tx_builder=mock_tx_builder,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        poller=poller,
    )

    service.process_pending_outbox()

    resubmitted_rec = sqlite_repo.get_by_id(record.id)
    assert resubmitted_rec.status == OutboxStatus.ANCHOR_SUBMITTED
    assert resubmitted_rec.tx_hash == tx_hash_new


def test_relayer_module_exports():
    """
    Verifies that the relayer module directly exports the expected classes.
    """
    assert hasattr(relayer, "AnchorRelayerService")
    assert hasattr(relayer, "AnchorRelayer")
    assert hasattr(relayer, "Relayer")
    assert relayer.AnchorRelayer is relayer.AnchorRelayerService
