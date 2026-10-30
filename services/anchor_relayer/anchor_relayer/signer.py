"""
Signer abstractions for Ethereum transactions.
Supports local private key and KMS key provider.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict
from eth_account import Account
from eth_account.signers.local import LocalAccount


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
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        self._account: LocalAccount = Account.from_key(private_key)

    def get_address(self) -> str:
        return self._account.address

    def sign_transaction(self, tx_dict: Dict[str, Any]) -> bytes:
        signed = self._account.sign_transaction(tx_dict)
        return bytes(signed.raw_transaction)


class KMSSigner(BaseSigner):
    """
    Signer simulating KMS or HSM with spending limit enforcement.
    """

    def __init__(self, key_id: str, address: str, max_daily_spend_wei: int = 1000000000000000000):
        self.key_id = key_id
        self._address = address
        self.max_daily_spend_wei = max_daily_spend_wei
        self.total_spent_wei = 0

    def get_address(self) -> str:
        return self._address

    def sign_transaction(self, tx_dict: Dict[str, Any]) -> bytes:
        gas_limit = tx_dict.get("gas", 0)
        gas_price = tx_dict.get("maxFeePerGas", tx_dict.get("gasPrice", 0))
        estimated_cost = gas_limit * gas_price
        if self.total_spent_wei + estimated_cost > self.max_daily_spend_wei:
            raise ValueError("KMS spending limit exceeded for transaction")
        self.total_spent_wei += estimated_cost
        dummy_account = Account.create()
        signed = dummy_account.sign_transaction(tx_dict)
        return bytes(signed.raw_transaction)
