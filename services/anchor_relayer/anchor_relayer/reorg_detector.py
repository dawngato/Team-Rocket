"""
Reorganization detection module for EVM canonical chain verification.
Identifies reorganized blocks and missing transaction receipts.
"""

from dataclasses import dataclass
from typing import Any, Optional
from hexbytes import HexBytes
from web3 import Web3
from web3.exceptions import TransactionNotFound


@dataclass
class ReorgCheckResult:
    """
    Result of canonical chain reconciliation check.
    """
    is_reorg: bool
    reason: Optional[str] = None
    canonical_block_hash: Optional[str] = None
    is_indeterminate: bool = False


class ReorgDetector:
    """
    Detects block reorganizations by comparing recorded hashes with canonical state.
    """

    def __init__(self, w3: Web3):
        self.w3 = w3

    def _normalize_hash(self, hash_val: Any) -> str:
        if isinstance(hash_val, (bytes, HexBytes)):
            return HexBytes(hash_val).to_0x_hex().lower()
        if isinstance(hash_val, str):
            return hash_val.lower()
        return str(hash_val).lower()

    def check_for_reorg(
        self,
        tx_hash: str,
        recorded_block_number: int,
        recorded_block_hash: str,
    ) -> ReorgCheckResult:
        """
        Verifies if the recorded block and transaction remain canonical.
        """
        try:
            canonical_block = self.w3.eth.get_block(recorded_block_number)
        except Exception as exc:
            return ReorgCheckResult(
                is_reorg=False,
                reason=f"Block {recorded_block_number} lookup failed: {exc}",
                is_indeterminate=True,
            )

        if not canonical_block:
            return ReorgCheckResult(
                is_reorg=False,
                reason=f"Block {recorded_block_number} could not be verified on the current RPC response",
                is_indeterminate=True,
            )

        block_hash = canonical_block.get("hash")
        if not block_hash:
            return ReorgCheckResult(
                is_reorg=False,
                reason=f"Block {recorded_block_number} response did not include a block hash",
                is_indeterminate=True,
            )
        canonical_hash = self._normalize_hash(block_hash)
        expected_hash = self._normalize_hash(recorded_block_hash)

        if canonical_hash != expected_hash:
            return ReorgCheckResult(
                is_reorg=True,
                reason=f"Block hash mismatch at height {recorded_block_number}: expected {expected_hash}, got {canonical_hash}",
                canonical_block_hash=canonical_hash,
            )

        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            if not tx:
                return ReorgCheckResult(
                    is_reorg=False,
                    reason=f"Transaction {tx_hash} could not be verified by the RPC response",
                    canonical_block_hash=canonical_hash,
                    is_indeterminate=True,
                )
            tx_block_number = tx.get("blockNumber")
            tx_block_hash = self._normalize_hash(tx.get("blockHash"))

            if tx_block_number != recorded_block_number or tx_block_hash != expected_hash:
                return ReorgCheckResult(
                    is_reorg=True,
                    reason=f"Transaction moved to block {tx_block_number} with hash {tx_block_hash}",
                )
        except TransactionNotFound:
            return ReorgCheckResult(
                is_reorg=True,
                reason=f"Transaction {tx_hash} is absent from the canonical chain",
                canonical_block_hash=canonical_hash,
            )
        except Exception as exc:
            return ReorgCheckResult(
                is_reorg=False,
                reason=f"Transaction verification failed: {exc}",
                canonical_block_hash=canonical_hash,
                is_indeterminate=True,
            )

        return ReorgCheckResult(
            is_reorg=False,
            canonical_block_hash=canonical_hash,
        )
