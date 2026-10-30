"""
Web3 transaction builder for anchor relayer.
Encodes anchorCheckpoint calls and enforces gas bounds.
"""

import math
from typing import Any, Dict, Optional
from hexbytes import HexBytes
from web3 import Web3
from web3.contract import Contract
from anchor_relayer.abi import HIMVOTE_ANCHOR_ABI
from anchor_relayer.models import WitnessedCheckpoint
from anchor_relayer.signer import BaseSigner


class GasLimitExceededError(Exception):
    """
    Raised when required gas exceeds configured upper bound.
    """
    pass


class GasPriceExceededError(Exception):
    """
    Raised when current gas price exceeds configured limit.
    """
    pass


class TransactionPreparationError(ValueError):
    """Raised when a transaction cannot be prepared safely."""


class TransactionBuilder:
    """
    Constructs, validates, signs, and broadcasts EVM transactions.
    """

    def __init__(
        self,
        w3: Web3,
        contract_address: str,
        signer: BaseSigner,
        chain_id: int = 31337,
        max_gas_limit: int = 500000,
        gas_price_limit_wei: int = 100000000000,
    ):
        if isinstance(chain_id, bool) or not isinstance(chain_id, int) or chain_id <= 0:
            raise ValueError("chain_id must be a positive integer")
        if isinstance(max_gas_limit, bool) or not isinstance(max_gas_limit, int) or max_gas_limit <= 0:
            raise ValueError("max_gas_limit must be a positive integer")
        if (
            isinstance(gas_price_limit_wei, bool)
            or not isinstance(gas_price_limit_wei, int)
            or gas_price_limit_wei < 0
        ):
            raise ValueError("gas_price_limit_wei must be a non-negative integer")
        self.w3 = w3
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.signer = signer
        self.chain_id = chain_id
        self.max_gas_limit = max_gas_limit
        self.gas_price_limit_wei = gas_price_limit_wei
        self.contract: Contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=HIMVOTE_ANCHOR_ABI,
        )

    def _to_bytes32(self, val: str) -> bytes:
        if isinstance(val, (bytes, bytearray, HexBytes)):
            raw = bytes(val)
        elif isinstance(val, str):
            normalized = val[2:] if val.startswith(("0x", "0X")) else val
            if len(normalized) != 64:
                raise TransactionPreparationError("bytes32 values must contain exactly 32 bytes")
            if len(normalized) % 2:
                raise TransactionPreparationError("hex values must have an even length")
            try:
                raw = bytes.fromhex(normalized)
            except ValueError as exc:
                raise TransactionPreparationError("bytes32 value is not valid hexadecimal") from exc
        else:
            raise TypeError("bytes32 value must be bytes or a hexadecimal string")
        if len(raw) != 32:
            raise TransactionPreparationError("bytes32 values must contain exactly 32 bytes")
        return raw

    def build_transaction_data(self, checkpoint: WitnessedCheckpoint) -> str:
        """
        Encodes the function call data for anchorCheckpoint.
        """
        if not isinstance(checkpoint, WitnessedCheckpoint):
            raise TypeError("checkpoint must be a WitnessedCheckpoint")
        if isinstance(checkpoint.sequence, bool) or not isinstance(checkpoint.sequence, int):
            raise TransactionPreparationError("checkpoint sequence must be an integer")
        if checkpoint.sequence < 1:
            raise TransactionPreparationError("checkpoint sequence must be at least 1")
        if not isinstance(checkpoint.is_final, bool):
            raise TransactionPreparationError("checkpoint is_final must be a boolean")
        election_commitment_bytes = self._to_bytes32(checkpoint.election_commitment)
        digest_bytes = self._to_bytes32(checkpoint.digest)
        previous_digest_bytes = self._to_bytes32(checkpoint.previous_digest)

        return self.contract.encode_abi(
            "anchorCheckpoint",
            args=[
                election_commitment_bytes,
                checkpoint.sequence,
                digest_bytes,
                previous_digest_bytes,
                checkpoint.is_final,
            ],
        )

    def prepare_transaction(
        self,
        checkpoint: WitnessedCheckpoint,
        nonce: Optional[int] = None,
        gas_limit: Optional[int] = None,
        max_fee_per_gas: Optional[int] = None,
        max_priority_fee_per_gas: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Builds complete transaction dictionary ready for signing.
        """
        sender_address = self.signer.get_address()
        try:
            sender_address = Web3.to_checksum_address(sender_address)
        except (TypeError, ValueError) as exc:
            raise TransactionPreparationError("signer returned an invalid address") from exc
        if nonce is None:
            nonce = self.w3.eth.get_transaction_count(sender_address, "pending")
        if isinstance(nonce, bool) or not isinstance(nonce, int) or nonce < 0:
            raise TransactionPreparationError("nonce must be a non-negative integer")

        call_data = self.build_transaction_data(checkpoint)

        raw_call = {
            "from": sender_address,
            "to": self.contract_address,
            "data": call_data,
        }

        if gas_limit is None:
            try:
                estimated_gas = self.w3.eth.estimate_gas(raw_call)
            except Exception as exc:
                raise TransactionPreparationError(
                    f"gas estimation failed: {exc}"
                ) from exc
            if (
                isinstance(estimated_gas, bool)
                or not isinstance(estimated_gas, int)
                or estimated_gas <= 0
            ):
                raise TransactionPreparationError("gas estimator returned an invalid limit")
            gas_limit = math.ceil(estimated_gas * 1.2)
        elif isinstance(gas_limit, bool) or not isinstance(gas_limit, int) or gas_limit <= 0:
            raise TransactionPreparationError("gas_limit must be a positive integer")

        if gas_limit > self.max_gas_limit:
            raise GasLimitExceededError(
                f"Estimated gas {gas_limit} exceeds configured ceiling {self.max_gas_limit}"
            )

        latest_block = self.w3.eth.get_block("latest")
        base_fee = latest_block.get("baseFeePerGas", None)

        tx_dict: Dict[str, Any] = {
            "from": sender_address,
            "to": self.contract_address,
            "nonce": nonce,
            "gas": gas_limit,
            "data": call_data,
            "chainId": self.chain_id,
            "value": 0,
        }

        if base_fee is not None:
            if isinstance(base_fee, bool) or not isinstance(base_fee, int) or base_fee < 0:
                raise TransactionPreparationError("latest block base fee is invalid")
            if max_priority_fee_per_gas is None:
                max_priority_fee_per_gas = 2000000000
            if max_fee_per_gas is None:
                max_fee_per_gas = (base_fee * 2) + max_priority_fee_per_gas

            if (
                isinstance(max_priority_fee_per_gas, bool)
                or not isinstance(max_priority_fee_per_gas, int)
                or max_priority_fee_per_gas < 0
            ):
                raise TransactionPreparationError("max priority fee must be non-negative")
            if (
                isinstance(max_fee_per_gas, bool)
                or not isinstance(max_fee_per_gas, int)
                or max_fee_per_gas < max_priority_fee_per_gas
            ):
                raise TransactionPreparationError(
                    "max fee must be an integer greater than or equal to max priority fee"
                )

            if max_fee_per_gas > self.gas_price_limit_wei:
                raise GasPriceExceededError(
                    f"Max fee per gas {max_fee_per_gas} exceeds configured limit {self.gas_price_limit_wei}"
                )

            tx_dict["maxFeePerGas"] = max_fee_per_gas
            tx_dict["maxPriorityFeePerGas"] = max_priority_fee_per_gas
            tx_dict["type"] = 2
        else:
            gas_price = self.w3.eth.gas_price
            if isinstance(gas_price, bool) or not isinstance(gas_price, int) or gas_price < 0:
                raise TransactionPreparationError("gas price is invalid")
            if gas_price > self.gas_price_limit_wei:
                raise GasPriceExceededError(
                    f"Gas price {gas_price} exceeds configured limit {self.gas_price_limit_wei}"
                )
            tx_dict["gasPrice"] = gas_price

        return tx_dict

    def sign_transaction(self, tx_dict: Dict[str, Any]) -> bytes:
        """
        Signs transaction dictionary using signer.
        """
        if not isinstance(tx_dict, dict) or not tx_dict:
            raise TypeError("tx_dict must be a non-empty dictionary")
        raw_signed = self.signer.sign_transaction(tx_dict)
        if not isinstance(raw_signed, (bytes, bytearray)) or not raw_signed:
            raise ValueError("signer returned empty or invalid transaction bytes")
        return bytes(raw_signed)

    def broadcast_transaction(self, raw_tx_bytes: bytes) -> str:
        """
        Submits raw signed transaction to EVM node and returns transaction hash string.
        """
        if not isinstance(raw_tx_bytes, (bytes, bytearray)) or not raw_tx_bytes:
            raise ValueError("raw transaction must be non-empty bytes")
        tx_hash_bytes = self.w3.eth.send_raw_transaction(bytes(raw_tx_bytes))
        if isinstance(tx_hash_bytes, (bytes, HexBytes)):
            return HexBytes(tx_hash_bytes).to_0x_hex()
        tx_hash = str(tx_hash_bytes)
        if not tx_hash or tx_hash == "0x":
            raise ValueError("node returned an empty transaction hash")
        return tx_hash
