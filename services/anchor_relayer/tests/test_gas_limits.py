"""
Unit tests covering gas limits and spending controls.
Verifies safety bounds on gas estimation, gas prices, and KMS limits.
"""

from unittest.mock import MagicMock
import pytest
from anchor_relayer.models import OutboxStatus
from anchor_relayer.service import AnchorRelayerService
from anchor_relayer.signer import KMSSigner, LocalSigner
from anchor_relayer.tx_builder import (
    GasLimitExceededError,
    GasPriceExceededError,
    TransactionBuilder,
)


def test_gas_limit_exceeded_raises_error(relayer_config, test_signer, sample_checkpoint):
    """
    Verifies that when estimated gas exceeds max_gas_limit, an exception is raised.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 0
    mock_w3.eth.estimate_gas.return_value = 600000

    builder = TransactionBuilder(
        w3=mock_w3,
        contract_address=relayer_config.contract_address,
        signer=test_signer,
        chain_id=relayer_config.chain_id,
        max_gas_limit=500000,
        gas_price_limit_wei=relayer_config.gas_price_limit_wei,
    )

    with pytest.raises(GasLimitExceededError):
        builder.prepare_transaction(sample_checkpoint)


def test_gas_price_exceeded_raises_error(relayer_config, test_signer, sample_checkpoint):
    """
    Verifies that when network gas price exceeds gas_price_limit_wei, an exception is raised.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 0
    mock_w3.eth.estimate_gas.return_value = 100000
    mock_w3.eth.get_block.return_value = {"baseFeePerGas": 200000000000}

    builder = TransactionBuilder(
        w3=mock_w3,
        contract_address=relayer_config.contract_address,
        signer=test_signer,
        chain_id=relayer_config.chain_id,
        max_gas_limit=500000,
        gas_price_limit_wei=100000000000,
    )

    with pytest.raises(GasPriceExceededError):
        builder.prepare_transaction(sample_checkpoint)


def test_service_records_failure_on_gas_limit_breach(relayer_config, test_signer, sqlite_repo, sample_checkpoint):
    """
    Verifies that service marks outbox record as failed when gas threshold is exceeded.
    """
    mock_w3 = MagicMock()
    mock_w3.eth.get_transaction_count.return_value = 0
    mock_w3.eth.estimate_gas.return_value = 999999
    mock_w3.eth.get_block.return_value = {"baseFeePerGas": 1000000000}

    mock_contract_client = MagicMock()
    mock_contract_client.is_already_anchored.return_value = False
    mock_contract_client.get_latest_sequence.return_value = 0

    builder = TransactionBuilder(
        w3=mock_w3,
        contract_address=relayer_config.contract_address,
        signer=test_signer,
        chain_id=relayer_config.chain_id,
        max_gas_limit=500000,
    )

    service = AnchorRelayerService(
        config=relayer_config,
        w3=mock_w3,
        repository=sqlite_repo,
        signer=test_signer,
        tx_builder=builder,
        contract_client=mock_contract_client,
    )

    outbox_rec = service.ingest_checkpoint(sample_checkpoint)
    service.process_pending_outbox()

    rec = sqlite_repo.get_by_id(outbox_rec.id)
    assert rec.status == OutboxStatus.FAILED
    assert "gas threshold exceeded" in rec.error_message.lower()


def test_kms_signer_spending_limit():
    """
    Verifies KMS signer enforces maximum spend limit across transactions.
    """
    kms_signer = KMSSigner(
        key_id="test_key_1",
        address="0x1111111111111111111111111111111111111111",
        max_daily_spend_wei=3000000,
        signing_provider=lambda _tx: b"provider signed transaction",
    )

    tx_dict = {
        "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "value": 0,
        "gas": 200000,
        "maxFeePerGas": 10,
        "maxPriorityFeePerGas": 2,
        "nonce": 0,
        "chainId": 31337,
    }

    assert kms_signer.sign_transaction(tx_dict) == b"provider signed transaction"

    with pytest.raises(ValueError, match="spending limit exceeded"):
        kms_signer.sign_transaction(tx_dict)
