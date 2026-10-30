"""
Web3 transaction builder for anchor relayer.
Encodes anchorCheckpoint calls and enforces gas bounds.
"""

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
        if isinstance(val, bytes):
            return val
        if val.startswith("0x"):
            val = val[2:]
        val = val.rjust(64, "0")
        return bytes.fromhex(val)

    def build_transaction_data(self, checkpoint: WitnessedCheckpoint) -> str:
        """
        Encodes the function call data for anchorCheckpoint.
        """
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
        if nonce is None:
            nonce = self.w3.eth.get_transaction_count(sender_address, "pending")

        call_data = self.build_transaction_data(checkpoint)

        raw_call = {
            "from": sender_address,
            "to": self.contract_address,
            "data": call_data,
        }

        if gas_limit is None:
            try:
                estimated_gas = self.w3.eth.estimate_gas(raw_call)
                gas_limit = int(estimated_gas * 1.2)
            except Exception:
                gas_limit = 200000

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
            if max_priority_fee_per_gas is None:
                max_priority_fee_per_gas = 2000000000
            if max_fee_per_gas is None:
                max_fee_per_gas = (base_fee * 2) + max_priority_fee_per_gas

            if max_fee_per_gas > self.gas_price_limit_wei:
                raise GasPriceExceededError(
                    f"Max fee per gas {max_fee_per_gas} exceeds configured limit {self.gas_price_limit_wei}"
                )

            tx_dict["maxFeePerGas"] = max_fee_per_gas
            tx_dict["maxPriorityFeePerGas"] = max_priority_fee_per_gas
            tx_dict["type"] = 2
        else:
            gas_price = self.w3.eth.gas_price
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
        return self.signer.sign_transaction(tx_dict)

    def broadcast_transaction(self, raw_tx_bytes: bytes) -> str:
        """
        Submits raw signed transaction to EVM node and returns transaction hash string.
        """
        tx_hash_bytes = self.w3.eth.send_raw_transaction(raw_tx_bytes)
        if isinstance(tx_hash_bytes, (bytes, HexBytes)):
            return HexBytes(tx_hash_bytes).to_0x_hex()
        return str(tx_hash_bytes)
