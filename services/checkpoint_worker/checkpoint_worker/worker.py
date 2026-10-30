"""
Core checkpoint worker implementation for HimVote.
Polls checkpoint outbox in strict leaf index order without skipping gaps.
Maintains RFC 9162 Merkle tree state.
Produces canonical JSON checkpoint records and interacts with witness service.
Halts with DISPUTED state upon encountering conflicting leaf hashes.
"""

import logging
import json
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import select, and_

from checkpoint_worker.crypto.merkle_tree import (
    RFC9162MerkleTree,
    compute_leaf_hash,
)
from checkpoint_worker.crypto.signatures import (
    sign_checkpoint_bytes,
    load_ed25519_private_key,
)
from checkpoint_worker.models.checkpoint import CheckpointRecord
from checkpoint_worker.models.database import (
    ElectionState,
    CheckpointOutbox,
    WitnessAcknowledgement,
    ElectionEvent,
    utcnow,
)
from checkpoint_worker.witness_client import WitnessClient
from checkpoint_worker.exceptions import (
    DisputedTreeError,
    LeafGapError,
    WitnessConnectionError,
    InvalidWitnessSignatureError,
    WitnessRejectionError,
)

logger = logging.getLogger(__name__)


class CheckpointWorker:
    """
    Worker responsible for sequential Merkle log maintenance and checkpointing.
    """

    def __init__(
        self,
        session_factory: sessionmaker,
        witness_client: WitnessClient,
        log_writer_private_key_raw: Optional[str] = None,
        log_writer_key_id: str = "log_writer_key_1",
        batch_size: int = 100,
    ):
        self.session_factory = session_factory
        self.witness_client = witness_client
        self.log_writer_key_id = log_writer_key_id
        self.batch_size = batch_size

        self.log_writer_private_key = (
            load_ed25519_private_key(log_writer_private_key_raw)
            if log_writer_private_key_raw
            else None
        )

        self._election_trees: Dict[str, RFC9162MerkleTree] = {}

    def set_log_writer_key(self, private_key_raw: str, key_id: Optional[str] = None) -> None:
        """Configure log writer private key."""
        self.log_writer_private_key = load_ed25519_private_key(private_key_raw)
        if key_id:
            self.log_writer_key_id = key_id

    def get_or_load_tree(self, session: Session, election_id: str) -> RFC9162MerkleTree:
        """
        Retrieve cached Merkle tree for election or restore from database up to last witnessed tree size.
        """
        if election_id in self._election_trees:
            return self._election_trees[election_id]

        state = session.get(ElectionState, election_id)
        last_witnessed_size = state.last_witnessed_tree_size if state else 0

        tree = RFC9162MerkleTree()
        if last_witnessed_size > 0:
            stmt = (
                select(CheckpointOutbox)
                .where(
                    and_(
                        CheckpointOutbox.election_id == election_id,
                        CheckpointOutbox.leaf_index < last_witnessed_size,
                    )
                )
                .order_by(CheckpointOutbox.leaf_index.asc())
            )
            rows = session.execute(stmt).scalars().all()

            if len(rows) != last_witnessed_size:
                logger.error(
                    "Missing acknowledged leaves in database for election %s: expected %d but found %d",
                    election_id,
                    last_witnessed_size,
                    len(rows),
                )

            for expected_idx, row in enumerate(rows):
                if row.leaf_index != expected_idx:
                    raise LeafGapError(election_id, expected_idx, row.leaf_index)
                leaf_bytes = bytes.fromhex(row.leaf_hash)
                tree.append_leaf_hash(leaf_bytes)

        self._election_trees[election_id] = tree
        return tree

    def mark_election_disputed(
        self,
        session: Session,
        election_id: str,
        reason: str,
        details: Dict[str, Any],
    ) -> None:
        """
        Transition election to DISPUTED state and record security audit event.
        """
        logger.critical("TRANSITIONING ELECTION %s TO DISPUTED: %s", election_id, reason)
        state = session.get(ElectionState, election_id)
        if state:
            state.state = "DISPUTED"
            state.updated_at = utcnow()

        audit_event = ElectionEvent(
            election_id=election_id,
            event_type="ELECTION_DISPUTED",
            payload=json.dumps(
                {
                    "reason": reason,
                    "details": details,
                    "timestamp": utcnow().isoformat(),
                }
            ),
            created_at=utcnow(),
        )
        session.add(audit_event)
        session.commit()

    def process_election(self, election_id: str) -> Optional[Dict[str, Any]]:
        """
        Execute one poll and checkpoint cycle for a specific election.
        Strictly enforces leaf sequence order without skipping gaps.
        """
        with self.session_factory() as session:
            state = session.get(ElectionState, election_id)
            if not state:
                logger.debug("No election state found for election %s", election_id)
                return None

            if state.state == "DISPUTED":
                logger.warning("Election %s is in DISPUTED state; skipping worker processing", election_id)
                return None

            tree = self.get_or_load_tree(session, election_id)
            acknowledged_size = state.last_witnessed_tree_size

            last_ack_stmt = (
                select(WitnessAcknowledgement)
                .where(WitnessAcknowledgement.election_id == election_id)
                .order_by(WitnessAcknowledgement.checkpoint_sequence.desc())
                .limit(1)
            )
            last_ack = session.execute(last_ack_stmt).scalars().first()
            previous_checkpoint_digest = last_ack.checkpoint_digest if last_ack else None
            next_sequence = (last_ack.checkpoint_sequence + 1) if last_ack else 1
            previous_witness_sequence = last_ack.witness_sequence if last_ack else 0

            outbox_stmt = (
                select(CheckpointOutbox)
                .where(CheckpointOutbox.election_id == election_id)
                .order_by(CheckpointOutbox.leaf_index.asc(), CheckpointOutbox.id.asc())
            )
            all_outbox_rows = session.execute(outbox_stmt).scalars().all()

            seen_leaves: Dict[int, str] = {}
            for row in all_outbox_rows:
                idx = row.leaf_index
                expected_hash = row.leaf_hash.lower()

                if idx < tree.tree_size:
                    recorded_hash = tree.get_leaf_hash(idx).hex().lower()
                    if expected_hash != recorded_hash:
                        self.mark_election_disputed(
                            session=session,
                            election_id=election_id,
                            reason="Conflicting leaf hash detected for already recorded leaf index",
                            details={
                                "leaf_index": idx,
                                "recorded_hash": recorded_hash,
                                "conflicting_hash": expected_hash,
                            },
                        )
                        raise DisputedTreeError(election_id, idx, recorded_hash, expected_hash)

                    if row.status != "PROCESSED":
                        row.status = "PROCESSED"
                        row.processed_at = utcnow()
                        session.commit()
                    continue

                if idx in seen_leaves:
                    if seen_leaves[idx] != expected_hash:
                        self.mark_election_disputed(
                            session=session,
                            election_id=election_id,
                            reason="Conflicting duplicate leaf hashes found in pending outbox",
                            details={
                                "leaf_index": idx,
                                "first_hash": seen_leaves[idx],
                                "conflicting_hash": expected_hash,
                            },
                        )
                        raise DisputedTreeError(election_id, idx, seen_leaves[idx], expected_hash)
                    continue

                seen_leaves[idx] = expected_hash

            pending_rows: List[CheckpointOutbox] = [
                r for r in all_outbox_rows if r.leaf_index >= tree.tree_size
            ]

            if not pending_rows:
                is_closing = state.state in ("CLOSING", "CLOSED_PENDING_WITNESS")
                has_final_target = state.final_tree_size is not None
                already_final_witnessed = state.state == "FINAL_WITNESSED"

                if is_closing and has_final_target and not already_final_witnessed:
                    if tree.tree_size == state.final_tree_size and acknowledged_size < state.final_tree_size:
                        return self._create_and_submit_checkpoint(
                            session=session,
                            state=state,
                            tree=tree,
                            previous_checkpoint_digest=previous_checkpoint_digest,
                            next_sequence=next_sequence,
                            previous_witness_sequence=previous_witness_sequence,
                            checkpoint_kind="FINAL",
                            newly_added_indices=[],
                        )
                return None

            first_pending = pending_rows[0]
            if first_pending.leaf_index > tree.tree_size:
                logger.warning(
                    "Outbox gap detected for election %s: expected leaf index %d but earliest pending is %d",
                    election_id,
                    tree.tree_size,
                    first_pending.leaf_index,
                )
                return None

            leaves_to_append: List[tuple[int, bytes, CheckpointOutbox]] = []
            expected_index = tree.tree_size
            processed_indices = set()

            for row in pending_rows:
                idx = row.leaf_index
                if idx in processed_indices:
                    continue

                if idx == expected_index:
                    computed_hash = compute_leaf_hash(row.leaf_data.encode("utf-8")).hex().lower()
                    if computed_hash != row.leaf_hash.lower():
                        self.mark_election_disputed(
                            session=session,
                            election_id=election_id,
                            reason="Outbox row leaf hash mismatch with computed leaf data",
                            details={
                                "leaf_index": idx,
                                "expected_hash": row.leaf_hash,
                                "computed_hash": computed_hash,
                            },
                        )
                        raise DisputedTreeError(election_id, idx, row.leaf_hash, computed_hash)

                    leaves_to_append.append((idx, bytes.fromhex(row.leaf_hash), row))
                    processed_indices.add(idx)
                    expected_index += 1

                    if len(leaves_to_append) >= self.batch_size:
                        break
                elif idx < expected_index:
                    continue
                else:
                    break

            if not leaves_to_append:
                return None

            initial_tree_size = tree.tree_size
            newly_added_indices = []
            for leaf_idx, leaf_h, outbox_item in leaves_to_append:
                tree.append_leaf_hash(leaf_h)
                newly_added_indices.append(leaf_idx)

            checkpoint_kind = "INCREMENTAL"
            is_closing = state.state in ("CLOSING", "CLOSED_PENDING_WITNESS")
            if is_closing and state.final_tree_size is not None:
                if tree.tree_size == state.final_tree_size:
                    checkpoint_kind = "FINAL"

            try:
                return self._create_and_submit_checkpoint(
                    session=session,
                    state=state,
                    tree=tree,
                    previous_checkpoint_digest=previous_checkpoint_digest,
                    next_sequence=next_sequence,
                    previous_witness_sequence=previous_witness_sequence,
                    checkpoint_kind=checkpoint_kind,
                    newly_added_indices=newly_added_indices,
                )
            except Exception:
                while tree.tree_size > initial_tree_size:
                    tree._leaf_hashes.pop()
                raise

    def _create_and_submit_checkpoint(
        self,
        session: Session,
        state: ElectionState,
        tree: RFC9162MerkleTree,
        previous_checkpoint_digest: Optional[str],
        next_sequence: int,
        previous_witness_sequence: int,
        checkpoint_kind: str,
        newly_added_indices: List[int],
    ) -> Dict[str, Any]:
        """
        Build canonical checkpoint record, obtain witness signature, and update database.
        """
        election_id = state.election_id
        old_size = state.last_witnessed_tree_size
        new_size = tree.tree_size

        last_leaf_index = (new_size - 1) if new_size > 0 else None
        last_leaf_digest = (
            tree.get_leaf_hash(last_leaf_index).hex().lower()
            if last_leaf_index is not None
            else None
        )

        record = CheckpointRecord(
            election_id=election_id,
            manifest_digest=state.manifest_digest,
            tree_size=new_size,
            merkle_root=tree.root_hex().lower(),
            previous_checkpoint_digest=previous_checkpoint_digest,
            last_leaf_index=last_leaf_index,
            last_leaf_digest=last_leaf_digest,
            issued_count=state.issued_count,
            issuance_ledger_digest=state.issuance_ledger_digest,
            roster_commitment=state.roster_commitment,
            protocol_version="1.0.0",
            checkpoint_kind=checkpoint_kind,
            checkpoint_sequence=next_sequence,
        )

        canonical_bytes = record.to_canonical_bytes()
        checkpoint_digest = record.compute_digest()

        writer_sig = ""
        if self.log_writer_private_key:
            writer_sig = sign_checkpoint_bytes(self.log_writer_private_key, canonical_bytes)

        consistency_proof = tree.consistency_proof(old_size)

        witness_response = self.witness_client.post_checkpoint(
            checkpoint_dict=record.to_canonical_dict(),
            canonical_bytes=canonical_bytes,
            checkpoint_digest=checkpoint_digest,
            writer_signature_hex=writer_sig,
            writer_key_id=self.log_writer_key_id,
            consistency_proof_hex=consistency_proof,
            previous_witness_sequence=previous_witness_sequence,
        )

        ack = WitnessAcknowledgement(
            election_id=election_id,
            tree_size=new_size,
            checkpoint_sequence=next_sequence,
            checkpoint_kind=checkpoint_kind,
            merkle_root=record.merkle_root,
            checkpoint_digest=checkpoint_digest,
            witness_sequence=witness_response["witness_sequence"],
            witness_key_id=witness_response["witness_key_id"],
            witness_signature=witness_response["witness_signature"],
            canonical_checkpoint_record=canonical_bytes.decode("utf-8"),
            acknowledged_at=utcnow(),
        )
        session.add(ack)

        if last_leaf_index is not None:
            update_outbox_stmt = (
                select(CheckpointOutbox)
                .where(
                    and_(
                        CheckpointOutbox.election_id == election_id,
                        CheckpointOutbox.leaf_index <= last_leaf_index,
                    )
                )
            )
            outbox_entries = session.execute(update_outbox_stmt).scalars().all()
            for entry in outbox_entries:
                entry.status = "PROCESSED"
                entry.processed_at = utcnow()

        state.last_witnessed_tree_size = new_size
        if checkpoint_kind == "FINAL":
            state.state = "FINAL_WITNESSED"
        state.updated_at = utcnow()

        session.commit()

        logger.info(
            "Successfully witnessed %s checkpoint for election %s: tree size %d sequence %d",
            checkpoint_kind,
            election_id,
            new_size,
            next_sequence,
        )

        return {
            "election_id": election_id,
            "tree_size": new_size,
            "checkpoint_digest": checkpoint_digest,
            "checkpoint_kind": checkpoint_kind,
            "checkpoint_sequence": next_sequence,
            "witness_sequence": witness_response["witness_sequence"],
            "witness_signature": witness_response["witness_signature"],
        }

    def poll_once(self) -> List[Dict[str, Any]]:
        """
        Poll all active elections and process pending outbox leaves.
        """
        results = []
        with self.session_factory() as session:
            stmt = select(ElectionState.election_id).where(
                ElectionState.state.in_(["OPEN", "CLOSING", "CLOSED_PENDING_WITNESS"])
            )
            election_ids = session.execute(stmt).scalars().all()

        for eid in election_ids:
            try:
                res = self.process_election(eid)
                if res:
                    results.append(res)
            except DisputedTreeError:
                logger.error("Halting worker processing for disputed election %s", eid)
            except (WitnessConnectionError, WitnessRejectionError, InvalidWitnessSignatureError) as exc:
                logger.error("Witness error during election %s processing: %s", eid, str(exc))
            except Exception as exc:
                logger.exception("Unexpected error processing election %s: %s", eid, str(exc))

        return results
