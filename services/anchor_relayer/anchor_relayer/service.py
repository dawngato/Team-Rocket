"""
Core AnchorRelayer service orchestrator.
Manages transactional outbox processing, broadcasting, and polling.
Hardened against blockchain reorganizations and gas price spikes.
"""

import logging
import time
from typing import Dict, List, Optional
from web3 import Web3
from anchor_relayer.config import RelayerConfig
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import OutboxRecord, OutboxStatus, WitnessedCheckpoint
from anchor_relayer.poller import ConfirmationPoller
from anchor_relayer.reorg_detector import ReorgDetector
from anchor_relayer.signer import BaseSigner, LocalSigner, SignerConfigurationError
from anchor_relayer.storage import OutboxRepository, SQLiteOutboxRepository
from anchor_relayer.tx_builder import (
    GasLimitExceededError,
    GasPriceExceededError,
    TransactionBuilder,
)
from anchor_relayer.witness_client import WitnessClient

logger = logging.getLogger(__name__)


class AnchorRelayerService:
    """
    Main service coordinating checkpoint retrieval, transaction submission,
    and confirmation tracking with blockchain reorg recovery and gas spike resilience.
    """

    def __init__(
        self,
        config: RelayerConfig,
        w3: Optional[Web3] = None,
        repository: Optional[OutboxRepository] = None,
        signer: Optional[BaseSigner] = None,
        tx_builder: Optional[TransactionBuilder] = None,
        contract_client: Optional[HimVoteAnchorClient] = None,
        reorg_detector: Optional[ReorgDetector] = None,
        poller: Optional[ConfirmationPoller] = None,
        witness_client: Optional[WitnessClient] = None,
    ):
        self.config = config
        self.w3 = w3 or Web3(Web3.HTTPProvider(config.rpc_url))
        self.repository = repository or SQLiteOutboxRepository(
            database_path=config.database_url or "anchor_outbox.sqlite"
        )

        if signer is None:
            if config.relayer_private_key:
                signer = LocalSigner(config.relayer_private_key)
            elif tx_builder is None:
                raise SignerConfigurationError(
                    "a relayer signer or preconfigured transaction builder is required"
                )
        self.signer = signer

        self.contract_client = contract_client or HimVoteAnchorClient(
            w3=self.w3,
            contract_address=config.contract_address,
        )

        self.tx_builder = tx_builder or TransactionBuilder(
            w3=self.w3,
            contract_address=config.contract_address,
            signer=self.signer,
            chain_id=config.chain_id,
            max_gas_limit=config.max_gas_limit,
            gas_price_limit_wei=config.gas_price_limit_wei,
        )

        self.reorg_detector = reorg_detector or ReorgDetector(w3=self.w3)

        self.poller = poller or ConfirmationPoller(
            w3=self.w3,
            repository=self.repository,
            contract_client=self.contract_client,
            reorg_detector=self.reorg_detector,
            required_confirmations=config.required_confirmations,
            receipt_timeout_seconds=config.receipt_timeout_seconds,
        )

        self.witness_client = witness_client or WitnessClient(
            base_url=config.witness_base_url,
            pinned_public_key=config.witness_public_key,
            election_commitments=config.election_commitments,
        )

        self._running = False
        self._retry_counts: Dict[str, int] = {}

    def ingest_checkpoint(self, checkpoint: WitnessedCheckpoint) -> OutboxRecord:
        """
        Enqueues a witnessed checkpoint into the transactional outbox.
        """
        return self.repository.enqueue(checkpoint)

    def fetch_and_ingest_witnessed(self, election_id: Optional[str] = None) -> List[OutboxRecord]:
        """
        Fetches unanchored checkpoints from witness service and inserts into outbox.
        """
        checkpoints = self.witness_client.get_unanchored_checkpoints(election_id)
        records = []
        for cp in checkpoints:
            rec = self.ingest_checkpoint(cp)
            records.append(rec)
        return records

    def process_pending_outbox(self, limit: int = 20) -> List[OutboxRecord]:
        """
        Processes pending outbox records: verifies on chain state,
        builds transaction, signs, and broadcasts to EVM node.
        """
        pending = self.repository.get_pending(limit=limit)
        processed: List[OutboxRecord] = []

        for record in pending:
            rec = self._process_single_pending(record)
            if rec:
                processed.append(rec)

        return processed

    def _process_single_pending(self, record: OutboxRecord) -> Optional[OutboxRecord]:
        election_commitment = record.election_commitment
        sequence = record.sequence
        digest = record.digest

        try:
            already_anchored = self.contract_client.is_already_anchored(
                election_commitment,
                sequence,
                digest,
            )
            if already_anchored:
                logger.info(
                    f"Checkpoint for election {election_commitment} seq {sequence} already anchored on chain, reconciling"
                )
                current_block = self.w3.eth.block_number
                seq, _, _, _, contract_block, _ = self.contract_client.get_checkpoint(
                    election_commitment,
                    sequence,
                )
                conf_count = max(0, current_block - contract_block + 1)
                dummy_hash = "0x" + "0" * 64
                if conf_count >= self.config.required_confirmations:
                    self.repository.mark_finalized(record.id, contract_block, dummy_hash, conf_count)
                else:
                    self.repository.mark_confirming(record.id, contract_block, dummy_hash, conf_count)
                self._retry_counts.pop(record.id, None)
                return self.repository.get_by_id(record.id)

            latest_seq = self.contract_client.get_latest_sequence(election_commitment)
            if sequence > latest_seq + 1:
                logger.warning(
                    f"Sequence gap detected: record seq {sequence} but contract latest seq is {latest_seq}. Waiting."
                )
                return record

            checkpoint = WitnessedCheckpoint(
                election_commitment=record.election_commitment,
                sequence=record.sequence,
                digest=record.digest,
                previous_digest=record.previous_digest,
                is_final=record.is_final,
            )

            tx_dict = self.tx_builder.prepare_transaction(checkpoint)
            tx_nonce = tx_dict.get("nonce", 0)
            self.repository.mark_prepared(record.id, tx_nonce)

            raw_signed = self.tx_builder.sign_transaction(tx_dict)
            tx_hash = self.tx_builder.broadcast_transaction(raw_signed)

            self.repository.mark_submitted(record.id, tx_hash)
            self._retry_counts.pop(record.id, None)
            logger.info(
                f"Broadcast transaction {tx_hash} for election {election_commitment} seq {sequence}"
            )
            return self.repository.get_by_id(record.id)

        except GasLimitExceededError as exc:
            err = f"Gas threshold exceeded: {exc}"
            logger.error(err)
            self.repository.mark_failed(record.id, err)
            self._retry_counts.pop(record.id, None)
            return self.repository.get_by_id(record.id)

        except GasPriceExceededError as exc:
            retries = self._retry_counts.get(record.id, 0) + 1
            self._retry_counts[record.id] = retries
            err = f"Gas price spike detected: {exc}. Retrying when network gas price normalizes."
            logger.warning(err)
            self.repository.reset_to_pending(record.id, reason=err)
            return self.repository.get_by_id(record.id)

        except Exception as exc:
            retries = self._retry_counts.get(record.id, 0) + 1
            self._retry_counts[record.id] = retries
            max_retries = getattr(self.config, "max_retries", 5)

            if retries <= max_retries:
                err = f"Transient submission failure attempt {retries} of {max_retries}: {exc}. Retrying on subsequent cycle."
                logger.warning(err)
                self.repository.reset_to_pending(record.id, reason=err)
                return self.repository.get_by_id(record.id)
            else:
                err = f"Failed to submit transaction for record {record.id}: {exc}"
                logger.exception(err)
                self.repository.mark_failed(record.id, err)
                self._retry_counts.pop(record.id, None)
                return self.repository.get_by_id(record.id)

    def poll_confirmations(self) -> int:
        """
        Polls confirmation progress for all in flight transactions.
        """
        return self.poller.poll_all_in_flight()

    def run_once(self) -> None:
        """
        Executes a single processing iteration.
        """
        self.fetch_and_ingest_witnessed()
        self.process_pending_outbox()
        self.poll_confirmations()

    def run_loop(self, poll_interval: Optional[float] = None) -> None:
        """
        Runs main daemon loop until stopped.
        """
        interval = poll_interval or self.config.poll_interval_seconds
        self._running = True
        logger.info("Starting AnchorRelayer service loop")
        while self._running:
            try:
                self.run_once()
            except Exception as exc:
                logger.exception(f"Unexpected error in relayer loop: {exc}")
            time.sleep(interval)

    def stop(self) -> None:
        """
        Stops the daemon loop.
        """
        self._running = False


# Public aliases
AnchorRelayer = AnchorRelayerService
Relayer = AnchorRelayerService
