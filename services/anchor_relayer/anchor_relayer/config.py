"""
Configuration settings for anchor relayer.
Loads environment variables and sets defaults.
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class RelayerConfig:
    """
    Configuration parameters for EVM relayer service.
    """
    rpc_url: str = os.getenv("CHAIN_RPC_URL", "http://127.0.0.1:8545")
    chain_id: int = int(os.getenv("CHAIN_ID", "31337"))
    contract_address: str = os.getenv("CHAIN_CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
    relayer_private_key: Optional[str] = os.getenv("RELAYER_PRIVATE_KEY", None)
    required_confirmations: int = int(os.getenv("REQUIRED_CONFIRMATIONS", "12"))
    max_gas_limit: int = int(os.getenv("MAX_GAS_LIMIT", "500000"))
    gas_price_limit_wei: int = int(os.getenv("GAS_PRICE_LIMIT_WEI", "100000000000"))
    poll_interval_seconds: float = float(os.getenv("POLL_INTERVAL_SECONDS", "2.0"))
    receipt_timeout_seconds: float = float(os.getenv("RECEIPT_TIMEOUT_SECONDS", "120.0"))
    witness_base_url: str = os.getenv("WITNESS_BASE", "http://127.0.0.1:8086")
    database_url: Optional[str] = os.getenv("DATABASE_URL", None)
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    max_retries: int = int(os.getenv("MAX_RETRIES", "5"))
