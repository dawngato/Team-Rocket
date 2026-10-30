"""
Unit tests covering normal anchoring lifecycle.
Verifies preparation, broadcast, receipt polling, and finality confirmation.
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


def test_normal_anchoring_full_lifecycle(relayer_config, test_signer, sqlite_repo, sample_checkpoint):
    """
    Tests complete lifecycle from pending outbox to 12 confirmations finalized.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 0
    mock_w3.eth.estimate_gas.return_value = 100000
    mock_w3.eth.gas_price = 20000000000
    mock_w3.eth.get_block.return_value = {"baseFeePerGas": 10000000000, "hash": HexBytes("0x" + "99" * 32)}
    mock_w3.eth.contract.return_value.encode_abi.return_value = "0x1234"

    tx_hash_hex = "0x" + "7" * 64
    mock_w3.eth.send_raw_transaction.return_value = HexBytes(tx_hash_hex)

    mock_contract_client = MagicMock(spec=HimVoteAnchorClient)
    mock_contract_client.is_already_anchored.return_value = False
    mock_contract_client.get_latest_sequence.return_value = 0

    tx_builder = TransactionBuilder(
        w3=mock_w3,
        contract_address=relayer_config.contract_address,
        signer=test_signer,
        chain_id=relayer_config.chain_id,
        max_gas_limit=relayer_config.max_gas_limit,
        gas_price_limit_wei=relayer_config.gas_price_limit_wei,
    )

    reorg_detector = MagicMock(spec=ReorgDetector)
    reorg_check_ok = MagicMock()
    reorg_check_ok.is_reorg = False
    reorg_detector.check_for_reorg.return_value = reorg_check_ok

    poller = ConfirmationPoller(
        w3=mock_w3,
        repository=sqlite_repo,
        contract_client=mock_contract_client,
        reorg_detector=reorg_detector,
        required_confirmations=12,
    )

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
    assert outbox_rec.tx_hash is None

    service.process_pending_outbox()

    submitted_rec = sqlite_repo.get_by_id(outbox_rec.id)
    assert submitted_rec.status == OutboxStatus.ANCHOR_SUBMITTED
    assert submitted_rec.tx_hash == tx_hash_hex
    assert submitted_rec.tx_nonce == 0

    block_100_hash = "0x" + "8" * 64
    mock_receipt = {
        "status": 1,
        "blockNumber": 100,
        "blockHash": HexBytes(block_100_hash),
        "transactionHash": HexBytes(tx_hash_hex),
    }
    mock_w3.eth.get_transaction_receipt.return_value = mock_receipt
    mock_w3.eth.block_number = 100

    service.poll_confirmations()

    confirming_rec = sqlite_repo.get_by_id(outbox_rec.id)
    assert confirming_rec.status == OutboxStatus.CONFIRMING
    assert confirming_rec.tx_hash == tx_hash_hex
    assert confirming_rec.block_number == 100
    assert confirming_rec.block_hash.lower() == block_100_hash.lower()
    assert confirming_rec.confirmation_count == 1

    mock_w3.eth.block_number = 111

    service.poll_confirmations()

    finalized_rec = sqlite_repo.get_by_id(outbox_rec.id)
    assert finalized_rec.status == OutboxStatus.ANCHOR_FINALIZED
    assert finalized_rec.tx_hash == tx_hash_hex
    assert finalized_rec.block_number == 100
    assert finalized_rec.block_hash.lower() == block_100_hash.lower()
    assert finalized_rec.confirmation_count == 12
