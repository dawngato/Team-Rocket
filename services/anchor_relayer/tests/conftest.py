"""
Shared fixtures and mocks for anchor relayer unit tests.
"""

from unittest.mock import MagicMock
import pytest
from hexbytes import HexBytes
from web3 import Web3
from anchor_relayer.config import RelayerConfig
from anchor_relayer.models import WitnessedCheckpoint
from anchor_relayer.signer import LocalSigner
from anchor_relayer.storage import SQLiteOutboxRepository


@pytest.fixture
def test_private_key() -> str:
    return "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"


@pytest.fixture
def test_signer(test_private_key: str) -> LocalSigner:
    return LocalSigner(test_private_key)


@pytest.fixture
def relayer_config() -> RelayerConfig:
    return RelayerConfig(
        rpc_url="http://127.0.0.1:8545",
        chain_id=31337,
        contract_address="0x5FbDB2315678afecb367f032d93F642f64180aa3",
        required_confirmations=12,
        max_gas_limit=500000,
        gas_price_limit_wei=100000000000,
    )


@pytest.fixture
def sample_checkpoint() -> WitnessedCheckpoint:
    return WitnessedCheckpoint(
        election_commitment="0x" + "a" * 64,
        sequence=1,
        digest="0x" + "b" * 64,
        previous_digest="0x" + "0" * 64,
        is_final=False,
    )


@pytest.fixture
def sample_final_checkpoint() -> WitnessedCheckpoint:
    return WitnessedCheckpoint(
        election_commitment="0x" + "a" * 64,
        sequence=2,
        digest="0x" + "c" * 64,
        previous_digest="0x" + "b" * 64,
        is_final=True,
    )


@pytest.fixture
def sqlite_repo() -> SQLiteOutboxRepository:
    return SQLiteOutboxRepository(database_path=":memory:")
