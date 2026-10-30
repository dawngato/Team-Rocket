"""
Signer abstractions for Ethereum transactions.
Supports local private key and KMS key provider.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Callable, Dict, Optional, Union
from eth_account import Account
from eth_account.signers.local import LocalAccount
from web3 import Web3


class SignerConfigurationError(ValueError):
    """Raised when a signer cannot be safely constructed or used."""


class BaseSigner(ABC):
    """
    Abstract interface for transaction signing.
    """

    @abstractmethod
    def get_address(self) -> str:
        """
        Returns the Ethereum address of the signer.
        """
        pass

    @abstractmethod
    def sign_transaction(self, tx_dict: Dict[str, Any]) -> bytes:
        """
        Signs the transaction dictionary and returns raw signed bytes.
        """
        pass


class LocalSigner(BaseSigner):
    """
    Signer using a local private key.
    """

    def __init__(self, private_key: str):
        if not isinstance(private_key, str) or not private_key.strip():
            raise SignerConfigurationError("private_key must be a non-empty string")
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        try:
            self._account: LocalAccount = Account.from_key(private_key)
        except (TypeError, ValueError) as exc:
            raise SignerConfigurationError("private_key is not a valid Ethereum key") from exc

    def get_address(self) -> str:
        return self._account.address

    def sign_transaction(self, tx_dict: Dict[str, Any]) -> bytes:
        _validate_transaction(tx_dict, self.get_address())
        signed = self._account.sign_transaction(tx_dict)
        return bytes(signed.raw_transaction)


def _validate_transaction(tx_dict: Dict[str, Any], signer_address: str) -> None:
    if not isinstance(tx_dict, dict) or not tx_dict:
        raise TypeError("tx_dict must be a non-empty dictionary")
    sender = tx_dict.get("from")
    if sender is not None:
        try:
            sender = Web3.to_checksum_address(sender)
            expected = Web3.to_checksum_address(signer_address)
        except ValueError as exc:
            raise ValueError("transaction from address is invalid") from exc
        if sender != expected:
            raise ValueError("transaction from address does not match signer")
    chain_id = tx_dict.get("chainId")
    if isinstance(chain_id, bool) or not isinstance(chain_id, int) or chain_id <= 0:
        raise ValueError("transaction chainId must be a positive integer")


SigningProvider = Union[Callable[[Dict[str, Any]], bytes], Any]


class KMSSigner(BaseSigner):
    """
    Spending-limit wrapper around an injected KMS or HSM signing provider.

    The relayer cannot safely emulate a KMS by signing with a random local
    account.  Callers must provide a provider that owns the configured key and
    returns the provider's raw signed transaction bytes.
    """

    def __init__(
        self,
        key_id: str,
        address: str,
        max_daily_spend_wei: int = 1000000000000000000,
        signing_provider: Optional[SigningProvider] = None,
    ):
        if not isinstance(key_id, str) or not key_id.strip():
            raise SignerConfigurationError("key_id must be a non-empty string")
        try:
            address = Web3.to_checksum_address(address)
        except (TypeError, ValueError) as exc:
            raise SignerConfigurationError("address is not a valid Ethereum address") from exc
        if isinstance(max_daily_spend_wei, bool) or not isinstance(max_daily_spend_wei, int):
            raise SignerConfigurationError("max_daily_spend_wei must be an integer")
        if max_daily_spend_wei < 0:
            raise SignerConfigurationError("max_daily_spend_wei cannot be negative")
        self.key_id = key_id
        self._address = address
        self.max_daily_spend_wei = max_daily_spend_wei
        self._signing_provider = signing_provider
        self.total_spent_wei = 0
        self._spend_date = datetime.now(timezone.utc).date()
        self._lock = RLock()

    def get_address(self) -> str:
        return self._address

    def sign_transaction(self, tx_dict: Dict[str, Any]) -> bytes:
        _validate_transaction(tx_dict, self.get_address())
        gas_limit = tx_dict.get("gas")
        if isinstance(gas_limit, bool) or not isinstance(gas_limit, int) or gas_limit < 0:
            raise ValueError("transaction gas must be a non-negative integer")

        fee_values = [
            tx_dict[name]
            for name in ("maxFeePerGas", "gasPrice")
            if name in tx_dict
        ]
        if len(fee_values) > 1:
            raise ValueError("transaction cannot include both maxFeePerGas and gasPrice")
        gas_price = fee_values[0] if fee_values else 0
        if isinstance(gas_price, bool) or not isinstance(gas_price, int) or gas_price < 0:
            raise ValueError("transaction fee must be a non-negative integer")
        value = tx_dict.get("value", 0)
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError("transaction value must be a non-negative integer")
        estimated_cost = (gas_limit * gas_price) + value

        with self._lock:
            today = datetime.now(timezone.utc).date()
            if today != self._spend_date:
                self._spend_date = today
                self.total_spent_wei = 0
            if self.total_spent_wei + estimated_cost > self.max_daily_spend_wei:
                raise ValueError("KMS spending limit exceeded for transaction")
            if self._signing_provider is None:
                raise SignerConfigurationError(
                    "KMS signing provider is not configured; refusing to use a local fallback"
                )

            provider = self._signing_provider
            if callable(provider):
                raw_signed = provider(tx_dict)
            elif hasattr(provider, "sign_transaction"):
                raw_signed = provider.sign_transaction(tx_dict)
            else:
                raise SignerConfigurationError(
                    "KMS signing provider must be callable or expose sign_transaction"
                )
            if not isinstance(raw_signed, (bytes, bytearray)) or not raw_signed:
                raise ValueError("KMS signing provider returned empty or invalid bytes")
            self.total_spent_wei += estimated_cost
            return bytes(raw_signed)
