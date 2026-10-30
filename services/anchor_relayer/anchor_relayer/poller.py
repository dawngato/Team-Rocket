"""
Confirmation poller for anchor relayer.
Monitors transaction receipts, counts block confirmations, and handles reorgs.
"""

import logging
from typing import Optional
from hexbytes import HexBytes
from web3 import Web3
from web3.exceptions import TransactionNotFound
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import OutboxRecord, OutboxStatus
from anchor_relayer.reorg_detector import ReorgDetector
from anchor_relayer.storage import OutboxRepository

logger = logging.getLogger(__name__)


class ConfirmationPoller:
    """
    Polls EVM node for block receipts and required confirmations.
    """

    def __init__(
        self,
        w3: Web3,
        repository: OutboxRepository,
        contract_client: HimVoteAnchorClient,
        reorg_detector: ReorgDetector,
        required_confirmations: int = 12,
    ):
        self.w3 = w3
        self.repository = repository
        self.contract_client = contract_client
        self.reorg_detector = reorg_detector
        self.required_confirmations = required_confirmations

    def _normalize_hash(self, hash_val) -> str:
        if isinstance(hash_val, (bytes, HexBytes)):
            return HexBytes(hash_val).to_0x_hex().lower()
        if isinstance(hash_val, str):
            return hash_val.lower()
        return str(hash_val).lower()

    def poll_record(self, record: OutboxRecord) -> OutboxRecord:
        """
        Processes a single submitted or confirming outbox record.
        """
        if not record.tx_hash:
            return record

        if record.status == OutboxStatus.ANCHOR_SUBMITTED:
            return self._handle_submitted_record(record)
        elif record.status == OutboxStatus.CONFIRMING:
            return self._handle_confirming_record(record)
        return record

    def _handle_submitted_record(self, record: OutboxRecord) -> OutboxRecord:
        try:
            receipt = self.w3.eth.get_transaction_receipt(record.tx_hash)
        except TransactionNotFound:
            return record
        except Exception as exc:
            logger.warning(f"Error fetching receipt for tx {record.tx_hash}: {exc}")
            return record

        if not receipt:
            return record

        receipt_status = receipt.get("status")
        if receipt_status == 0:
            err_msg = f"Transaction {record.tx_hash} reverted on chain"
            self.repository.mark_failed(record.id, err_msg)
            updated = self.repository.get_by_id(record.id)
            return updated or record

        block_number = receipt.get("blockNumber")
        block_hash = self._normalize_hash(receipt.get("blockHash"))

        current_block = self.w3.eth.block_number
        confirmation_count = max(0, current_block - block_number + 1)

        if confirmation_count >= self.required_confirmations:
            self.repository.mark_finalized(
                record.id,
                block_number,
                block_hash,
                confirmation_count,
            )
        else:
            self.repository.mark_confirming(
                record.id,
                block_number,
                block_hash,
                confirmation_count,
            )

        updated = self.repository.get_by_id(record.id)
        return updated or record

    def _handle_confirming_record(self, record: OutboxRecord) -> OutboxRecord:
        if record.block_number is None or not record.block_hash:
            return record

        reorg_check = self.reorg_detector.check_for_reorg(
            tx_hash=record.tx_hash,
            recorded_block_number=record.block_number,
            recorded_block_hash=record.block_hash,
        )

        if reorg_check.is_reorg:
            logger.warning(
                f"Reorg detected for record {record.id} at sequence {record.sequence}: {reorg_check.reason}"
            )
            already_anchored = self.contract_client.is_already_anchored(
                record.election_commitment,
                record.sequence,
                record.digest,
            )
            if already_anchored:
                current_block = self.w3.eth.block_number
                seq, _, _, _, contract_block, _ = self.contract_client.get_checkpoint(
                    record.election_commitment,
                    record.sequence,
                )
                conf_count = max(0, current_block - contract_block + 1)
                canonical_hash = reorg_check.canonical_block_hash or record.block_hash
                if conf_count >= self.required_confirmations:
                    self.repository.mark_finalized(record.id, contract_block, canonical_hash, conf_count)
                else:
                    self.repository.mark_confirming(record.id, contract_block, canonical_hash, conf_count)
            else:
                self.repository.reset_to_pending(
                    record.id,
                    reason=f"Block reorg detected: {reorg_check.reason}",
                )

            updated = self.repository.get_by_id(record.id)
            return updated or record

        current_block = self.w3.eth.block_number
        confirmation_count = max(0, current_block - record.block_number + 1)

        if confirmation_count >= self.required_confirmations:
            self.repository.mark_finalized(
                record.id,
                record.block_number,
                record.block_hash,
                confirmation_count,
            )
        else:
            self.repository.mark_confirming(
                record.id,
                record.block_number,
                record.block_hash,
                confirmation_count,
            )

        updated = self.repository.get_by_id(record.id)
        return updated or record

    def poll_all_in_flight(self) -> int:
        """
        Polls all in flight records and returns count of polled records.
        """
        in_flight = self.repository.get_in_flight()
        for rec in in_flight:
            self.poll_record(rec)
        return len(in_flight)
