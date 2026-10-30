"""
Unit tests covering transaction replay and contract state reconciliation.
Ensures duplicate transactions are never broadcast when state already exists on chain.
"""

from unittest.mock import MagicMock
from hexbytes import HexBytes
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import OutboxStatus, WitnessedCheckpoint
from anchor_relayer.poller import ConfirmationPoller
from anchor_relayer.reorg_detector import ReorgDetector
from anchor_relayer.service import AnchorRelayerService
from anchor_relayer.storage import SQLiteOutboxRepository
from anchor_relayer.tx_builder import TransactionBuilder


def test_transaction_replay_already_anchored_on_chain(relayer_config, test_signer, sqlite_repo, sample_checkpoint):
    """
    Verifies that when on chain state indicates checkpoint is already anchored,
    relayer reconciles without broadcasting a duplicate transaction.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.block_number = 200

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = True
    mock_contract_client.get_checkpoint.return_value = (1, HexBytes(sample_checkpoint.digest), HexBytes(sample_checkpoint.previous_digest), False, 180, 1000)

    tx_builder = MagicMock(spec=TransactionBuilder)

    reorg_detector = MagicMock(spec=ReorgDetector)
    poller = MagicMock(spec=ConfirmationPoller)

    service = AnchorRelayerService(
        config=relayer_config,
        w3=mock_w3,
        repository=sqlite_repo,
        signer=test_signer,
        tx_builder=tx_builder,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        poller=poller,
    )

    outbox_rec = service.ingest_checkpoint(sample_checkpoint)
    assert outbox_rec.status == OutboxStatus.ANCHOR_PENDING

    service.process_pending_outbox()

    tx_builder.prepare_transaction.assert_not_called()
    tx_builder.broadcast_transaction.assert_not_called()

    reconciled_rec = sqlite_repo.get_by_id(outbox_rec.id)
    assert reconciled_rec.status == OutboxStatus.ANCHOR_FINALIZED
    assert reconciled_rec.block_number == 180
    assert reconciled_rec.confirmation_count == 200 - 180 + 1


def test_sequence_gap_waits_for_preceding_checkpoints(relayer_config, test_signer, sqlite_repo):
    """
    Verifies that when a sequence gap exists, the relayer waits and does not submit out of order.
    """
    mock_w3 = MagicMock()
    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = False
    mock_contract_client.get_latest_sequence.return_value = 0

    gap_checkpoint = WitnessedCheckpoint(
        election_commitment="0x" + "a" * 64,
        sequence=5,
        digest="0x" + "f" * 64,
        previous_digest="0x" + "e" * 64,
        is_final=False,
    )

    tx_builder = MagicMock(spec=TransactionBuilder)

    service = AnchorRelayerService(
        config=relayer_config,
        w3=mock_w3,
        repository=sqlite_repo,
        signer=test_signer,
        tx_builder=tx_builder,
        contract_client=mock_contract_client,
    )

    outbox_rec = service.ingest_checkpoint(gap_checkpoint)
    service.process_pending_outbox()

    tx_builder.broadcast_transaction.assert_not_called()
    record = sqlite_repo.get_by_id(outbox_rec.id)
    assert record.status == OutboxStatus.ANCHOR_PENDING
