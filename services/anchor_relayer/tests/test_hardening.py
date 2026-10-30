"""Focused validation tests for the relayer boundary and persistence layer."""

from unittest.mock import MagicMock

import pytest

from anchor_relayer.models import WitnessedCheckpoint
from anchor_relayer.signer import KMSSigner, SignerConfigurationError
from anchor_relayer.tx_builder import TransactionBuilder, TransactionPreparationError


def test_outbox_rejects_conflicting_checkpoint_for_same_sequence(sqlite_repo, sample_checkpoint):
    sqlite_repo.enqueue(sample_checkpoint)
    conflicting = WitnessedCheckpoint(
        election_commitment=sample_checkpoint.election_commitment,
        sequence=sample_checkpoint.sequence,
        digest="0x" + "d" * 64,
        previous_digest=sample_checkpoint.previous_digest,
        is_final=sample_checkpoint.is_final,
    )

    with pytest.raises(ValueError, match="conflicting checkpoint"):
        sqlite_repo.enqueue(conflicting)


def test_outbox_reset_clears_submission_identity(sqlite_repo, sample_checkpoint):
    record = sqlite_repo.enqueue(sample_checkpoint)
    sqlite_repo.mark_submitted(record.id, "0x" + "a" * 64)
    sqlite_repo.reset_to_pending(record.id, "receipt timeout")

    reset = sqlite_repo.get_by_id(record.id)
    assert reset is not None
    assert reset.tx_hash is None
    assert reset.tx_nonce is None
    assert reset.block_number is None
    assert reset.block_hash is None
    assert reset.error_message == "receipt timeout"


def test_outbox_rejects_invalid_inputs(sqlite_repo, sample_checkpoint):
    with pytest.raises(ValueError, match="limit"):
        sqlite_repo.get_pending(limit=0)

    with pytest.raises(ValueError, match="exactly 32 bytes"):
        sqlite_repo.get_by_election_and_sequence("0x01", 1)

    with pytest.raises(ValueError, match="at least 1"):
        sqlite_repo.enqueue(
            WitnessedCheckpoint(
                election_commitment=sample_checkpoint.election_commitment,
                sequence=0,
                digest=sample_checkpoint.digest,
                previous_digest=sample_checkpoint.previous_digest,
                is_final=False,
            )
        )


def test_kms_signer_requires_real_provider():
    signer = KMSSigner(
        key_id="test_key",
        address="0x1111111111111111111111111111111111111111",
    )
    tx = {
        "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "gas": 1,
        "gasPrice": 1,
        "nonce": 0,
        "chainId": 31337,
    }

    with pytest.raises(SignerConfigurationError, match="provider is not configured"):
        signer.sign_transaction(tx)
    assert signer.total_spent_wei == 0


def test_kms_signer_does_not_charge_failed_provider():
    def fail(_tx):
        raise RuntimeError("provider unavailable")

    signer = KMSSigner(
        key_id="test_key",
        address="0x1111111111111111111111111111111111111111",
        signing_provider=fail,
    )
    tx = {
        "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "gas": 2,
        "gasPrice": 10,
        "nonce": 0,
        "chainId": 31337,
    }

    with pytest.raises(RuntimeError, match="provider unavailable"):
        signer.sign_transaction(tx)
    assert signer.total_spent_wei == 0


def test_transaction_builder_rejects_malformed_checkpoint(relayer_config, test_signer):
    w3 = MagicMock()
    builder = TransactionBuilder(
        w3=w3,
        contract_address=relayer_config.contract_address,
        signer=test_signer,
    )
    malformed = WitnessedCheckpoint(
        election_commitment="0x" + "a" * 64,
        sequence=1,
        digest="0x" + "b" * 62,
        previous_digest="0x" + "0" * 64,
        is_final=False,
    )

    with pytest.raises(TransactionPreparationError, match="exactly 32 bytes"):
        builder.build_transaction_data(malformed)


def test_transaction_builder_fails_closed_when_gas_estimation_fails(
    relayer_config, test_signer, sample_checkpoint
):
    w3 = MagicMock()
    w3.eth.get_transaction_count.return_value = 0
    w3.eth.estimate_gas.side_effect = RuntimeError("node unavailable")
    builder = TransactionBuilder(
        w3=w3,
        contract_address=relayer_config.contract_address,
        signer=test_signer,
    )

    with pytest.raises(TransactionPreparationError, match="gas estimation failed"):
        builder.prepare_transaction(sample_checkpoint)


def test_http_boundary_only_enqueues_and_does_not_claim_finality(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "info")
    import importlib.util
    from pathlib import Path

    module_path = Path(__file__).parents[1] / "main.py"
    module_spec = importlib.util.spec_from_file_location("anchor_relayer_http_main", module_path)
    assert module_spec is not None and module_spec.loader is not None
    main = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(main)
    request = main.AnchorRequest(
        election_id="synthetic-election",
        commitment="0x" + "e" * 64,
        sequence=1,
        digest="0x" + "f" * 64,
        previous_digest="0x" + "0" * 64,
        is_final=True,
    )

    response = main.anchor_checkpoint(request)
    assert response.status == "ANCHOR_PENDING"
    assert response.tx_hash is None
    assert response.block_hash is None
    assert response.finalized is False
