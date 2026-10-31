"""
Configuration settings for anchor relayer.
Loads environment variables and sets defaults.
"""

import os
import json
from dataclasses import dataclass
from typing import Optional
from web3 import Web3


@dataclass
class RelayerConfig:
    """
    Configuration parameters for EVM relayer service.
    """
    rpc_url: str = os.getenv("CHAIN_RPC_URL", "")
    chain_id: Optional[int] = int(os.environ["CHAIN_ID"]) if os.getenv("CHAIN_ID") else None
    contract_address: Optional[str] = os.getenv("CHAIN_CONTRACT_ADDRESS")
    relayer_private_key: Optional[str] = os.getenv("RELAYER_PRIVATE_KEY", None)
    required_confirmations: int = int(os.getenv("REQUIRED_CONFIRMATIONS", "12"))
    max_gas_limit: int = int(os.getenv("MAX_GAS_LIMIT", "500000"))
    gas_price_limit_wei: int = int(os.getenv("GAS_PRICE_LIMIT_WEI", "100000000000"))
    poll_interval_seconds: float = float(os.getenv("POLL_INTERVAL_SECONDS", "2.0"))
    receipt_timeout_seconds: float = float(os.getenv("RECEIPT_TIMEOUT_SECONDS", "120.0"))
    witness_base_url: str = os.getenv("WITNESS_BASE", "http://127.0.0.1:8086")
    database_url: Optional[str] = os.getenv("OUTBOX_DATABASE_PATH", "anchor_outbox.sqlite")
    witness_public_key: Optional[str] = os.getenv("WITNESS_PUBLIC_KEY")
    election_commitments: Optional[dict[str, str]] = None
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    max_retries: int = int(os.getenv("MAX_RETRIES", "5"))

    def __post_init__(self) -> None:
        raw_mappings = os.getenv("WITNESS_ELECTION_COMMITMENTS", "{}").strip() or "{}"
        try:
            mappings = json.loads(raw_mappings)
        except json.JSONDecodeError as exc:
            raise ValueError("WITNESS_ELECTION_COMMITMENTS must be a JSON object") from exc
        if not isinstance(mappings, dict) or any(
            not isinstance(key, str) or not isinstance(value, str)
            for key, value in mappings.items()
        ):
            raise ValueError("WITNESS_ELECTION_COMMITMENTS must map election IDs to bytes32 strings")
        self.election_commitments = mappings

    def validate_chain_configuration(self) -> None:
        """Fail explicitly instead of using placeholder chain deployment values."""
        if self.chain_id is None:
            raise ValueError("CHAIN_ID must be configured before starting the anchoring worker")
        if self.chain_id <= 0:
            raise ValueError("CHAIN_ID must be a positive integer")
        if not self.contract_address or self.contract_address == "CHANGE_ME":
            raise ValueError(
                "CHAIN_CONTRACT_ADDRESS must be configured with the deployed anchor contract address"
            )
        if not Web3.is_address(self.contract_address):
            raise ValueError("CHAIN_CONTRACT_ADDRESS must be a valid EVM address")
        if not self.relayer_private_key:
            raise ValueError("RELAYER_PRIVATE_KEY must be configured before starting the anchoring worker")
        if not self.rpc_url:
            raise ValueError("CHAIN_RPC_URL must be configured before starting the anchoring worker")
        if not self.witness_public_key:
            raise ValueError("WITNESS_PUBLIC_KEY must be configured before starting the anchoring worker")
        if not self.election_commitments:
            raise ValueError(
                "WITNESS_ELECTION_COMMITMENTS must map witnessed election IDs to chain commitments"
            )
        key = (
            self.witness_public_key[2:]
            if self.witness_public_key.startswith(("0x", "0X"))
            else self.witness_public_key
        )
        try:
            if len(key) != 64 or len(bytes.fromhex(key)) != 32:
                raise ValueError
        except ValueError as exc:
            raise ValueError("WITNESS_PUBLIC_KEY must be a 32-byte hexadecimal Ed25519 key") from exc
        for election_id, commitment in self.election_commitments.items():
            if not election_id:
                raise ValueError("WITNESS_ELECTION_COMMITMENTS cannot contain a blank election ID")
            normalized = commitment[2:] if commitment.startswith(("0x", "0X")) else commitment
            try:
                if len(normalized) != 64 or len(bytes.fromhex(normalized)) != 32:
                    raise ValueError
            except ValueError as exc:
                raise ValueError(
                    f"WITNESS_ELECTION_COMMITMENTS[{election_id!r}] must be bytes32 hex"
                ) from exc
