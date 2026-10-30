"""
Core service layer for HimVote Independent Witness.
Implements RFC 9162 tree consistency verification, writer authentication,
sequence monotonicity enforcement, and FINAL sealing logic.
"""

import os
import json
from typing import Any, Dict, Optional, Tuple

from witness.canonical import canonical_json_bytes, canonical_json_str
from witness.crypto import (
    KeyManager,
    sha256_bytes,
    sha256_hex,
    verify_writer_signature,
    verify_consistency_proof
)
from witness.models import (
    CheckpointKind,
    CheckpointRecord,
    CheckpointSubmission,
    FinalCheckpointSubmission,
    WitnessAcknowledgement,
    FinalCheckpointResponse
)
from witness.storage import (
    WitnessStorage,
    StorageError,
    ElectionNotFoundError,
    ElectionAlreadyFinalizedError,
    ConflictingFinalCheckpointError,
    SequenceGapError,
    SequenceRollbackError,
    TreeSizeRollbackError,
    ManifestMismatchError,
    PreviousCheckpointMismatchError
)
from witness.config import WitnessConfig


class WitnessServiceError(Exception):
    """Base exception for service layer errors."""
    pass


class ElectionIdMismatchError(WitnessServiceError):
    """Raised when URL election ID differs from payload election ID."""
    pass


class WriterSignatureVerificationError(WitnessServiceError):
    """Raised when writer signature fails cryptographic verification."""
    pass


class ConsistencyProofVerificationError(WitnessServiceError):
    """Raised when RFC 9162 Merkle tree consistency proof is invalid."""
    pass


class InconsistentTreeRootError(WitnessServiceError):
    """Raised when tree roots conflict without monotonic extension."""
    pass


class FinalCheckpointNotFoundError(WitnessServiceError):
    """Raised when an election is queried for FINAL checkpoint before sealing."""
    pass


class WitnessService:
    """
    Independent Witness business logic orchestrator.
    Handles cryptographic checks, state transitions, and audit records.
    """

    def __init__(self, config: WitnessConfig):
        self.config = config
        self.storage = WitnessStorage(
            db_path=config.db_path,
            append_log_path=config.audit_log_path
        )
        self.key_manager = self._init_key_manager()
        self._init_pinned_writers()

    def _init_key_manager(self) -> KeyManager:
        """Initialize Ed25519 key manager from hex, key file, or generate new."""
        if self.config.private_key_hex:
            return KeyManager.from_hex(self.config.private_key_hex)

        if self.config.key_file_path and os.path.exists(self.config.key_file_path):
            with open(self.config.key_file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return KeyManager.from_hex(content)

        # Generate fresh key and persist if key file path is provided
        km = KeyManager()
        if self.config.key_file_path:
            key_dir = os.path.dirname(os.path.abspath(self.config.key_file_path))
            if key_dir:
                os.makedirs(key_dir, exist_ok=True)
            with open(self.config.key_file_path, "w", encoding="utf-8") as f:
                f.write(km.get_private_hex())
        return km

    def _init_pinned_writers(self) -> None:
        """Store initial pinned writer keys into backing store."""
        for election_id, pub_key in self.config.pinned_writers.items():
            self.storage.set_trusted_writer(
                election_id=election_id,
                writer_public_key=pub_key,
                description="Preconfigured pinned writer key"
            )

    @property
    def public_key_hex(self) -> str:
        """Get witness Ed25519 public key as lowercase hex."""
        return self.key_manager.get_public_hex()

    def _verify_writer_auth(
        self,
        election_id: str,
        canonical_bytes: bytes,
        signature_hex: str,
        provided_public_key: Optional[str]
    ) -> Optional[str]:
        """
        Verify log writer signature against pinned or submitted public key.
        Returns the verified public key hex string.
        """
        if not self.config.require_writer_signature:
            return provided_public_key

        trusted_key = self.storage.get_trusted_writer(election_id)
        if not trusted_key:
            raise WriterSignatureVerificationError(
                f"No pinned writer key found for election {election_id}"
            )

        writer_key = trusted_key

        if provided_public_key and trusted_key.lower() != provided_public_key.lower():
            raise WriterSignatureVerificationError(
                f"Provided writer key does not match pinned key for election {election_id}"
            )

        is_valid = verify_writer_signature(
            writer_public_key_hex=writer_key,
            signature_hex=signature_hex,
            canonical_checkpoint_bytes=canonical_bytes
        )
        if not is_valid:
            raise WriterSignatureVerificationError(
                f"Writer signature verification failed for election {election_id}"
            )

        return writer_key

    def _verify_state_and_consistency(
        self,
        state: Optional[Dict[str, Any]],
        record: CheckpointRecord,
        checkpoint_digest: str,
        consistency_proof_hex: list[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Verify state progression, manifest immutability, sequence ordering,
        tree size monotonicity, and RFC 9162 Merkle log consistency.
        Returns existing audit entry if this is an idempotent replay, else None.
        """
        election_id = record.election_id

        if state is not None:
            # Check manifest immutability
            if state["manifest_digest"] != record.manifest_digest:
                raise ManifestMismatchError(
                    f"Manifest digest {record.manifest_digest} does not match election manifest {state['manifest_digest']}"
                )

            # Check if election is already finalized
            if state["is_final"] == 1:
                if state["latest_checkpoint_digest"] == checkpoint_digest:
                    existing = self.storage.get_checkpoint_by_sequence(
                        election_id, record.checkpoint_sequence
                    )
                    if existing:
                        return existing
                raise ElectionAlreadyFinalizedError(
                    f"Election {election_id} is already sealed as FINAL, updates refused"
                )

            # Check for idempotent replay
            if (state["latest_sequence"] == record.checkpoint_sequence and
                    state["latest_checkpoint_digest"] == checkpoint_digest):
                existing = self.storage.get_checkpoint_by_sequence(
                    election_id, record.checkpoint_sequence
                )
                if existing:
                    return existing

            # Check sequence rollback
            if record.checkpoint_sequence <= state["latest_sequence"]:
                raise SequenceRollbackError(
                    f"Sequence {record.checkpoint_sequence} is not greater than latest {state['latest_sequence']}"
                )

            # Check sequence gap
            if record.checkpoint_sequence != state["latest_sequence"] + 1:
                raise SequenceGapError(
                    f"Gap refused: incoming sequence {record.checkpoint_sequence} expected {state['latest_sequence'] + 1}"
                )

            # Check previous checkpoint digest
            if record.previous_checkpoint_digest != state["latest_checkpoint_digest"]:
                raise PreviousCheckpointMismatchError(
                    f"previous_checkpoint_digest does not match latest digest"
                )

            # Check tree size monotonicity
            old_tree_size = state["current_tree_size"]
            new_tree_size = record.tree_size
            if new_tree_size < old_tree_size:
                raise TreeSizeRollbackError(
                    f"Tree size rollback: new size {new_tree_size} is smaller than current {old_tree_size}"
                )

            old_root_hex = state["latest_merkle_root"]
            new_root_hex = record.merkle_root

            if new_tree_size == old_tree_size:
                if new_root_hex != old_root_hex:
                    raise InconsistentTreeRootError(
                        f"Merkle root changed without tree size increase: {old_root_hex} to {new_root_hex}"
                    )
                if consistency_proof_hex:
                    raise ConsistencyProofVerificationError(
                        "Consistency proof must be empty when tree size is unchanged"
                    )
                return None

            # new_tree_size > old_tree_size
            if old_tree_size == 0:
                if consistency_proof_hex:
                    raise ConsistencyProofVerificationError(
                        "Consistency proof must be empty when extending from empty tree"
                    )
                return None

            # RFC 9162 consistency proof verification
            try:
                old_root_bytes = bytes.fromhex(old_root_hex)
                new_root_bytes = bytes.fromhex(new_root_hex)
                proof_bytes = [bytes.fromhex(h) for h in consistency_proof_hex]
            except ValueError as e:
                raise ConsistencyProofVerificationError(f"Malformed hex in Merkle root or proof: {e}")

            is_valid = verify_consistency_proof(
                first_size=old_tree_size,
                second_size=new_tree_size,
                first_root=old_root_bytes,
                second_root=new_root_bytes,
                consistency_path=proof_bytes
            )
            if not is_valid:
                raise ConsistencyProofVerificationError(
                    f"RFC 9162 consistency proof failed between tree size {old_tree_size} and {new_tree_size}"
                )
        else:
            # First checkpoint for new election
            if record.checkpoint_sequence != 1:
                raise SequenceGapError(
                    f"Initial checkpoint sequence must be 1, got {record.checkpoint_sequence}"
                )
            if record.previous_checkpoint_digest is not None:
                raise PreviousCheckpointMismatchError(
                    "Initial checkpoint must have null previous_checkpoint_digest"
                )

        return None

    def process_checkpoint(self, submission: CheckpointSubmission) -> WitnessAcknowledgement:
        """
        Validate and record incoming checkpoint.
        Verifies election ID, manifest digest, writer signature, monotonic tree size,
        and consistency proof.
        """
        record = submission.checkpoint
        election_id = record.election_id

        # Canonicalize checkpoint record per RFC 8785
        canonical_dict = record.to_canonical_dict()
        canonical_bytes = canonical_json_bytes(canonical_dict)
        canonical_str = canonical_bytes.decode("utf-8")
        checkpoint_digest = sha256_hex(canonical_bytes)

        # Authenticate writer signature
        verified_writer_key = self._verify_writer_auth(
            election_id=election_id,
            canonical_bytes=canonical_bytes,
            signature_hex=submission.writer_signature,
            provided_public_key=submission.writer_public_key
        )

        # Query existing state and verify state progression and Merkle consistency
        state = self.storage.get_election_state(election_id)
        replay_audit = self._verify_state_and_consistency(
            state=state,
            record=record,
            checkpoint_digest=checkpoint_digest,
            consistency_proof_hex=submission.consistency_proof
        )

        if replay_audit:
            return WitnessAcknowledgement(
                status="ACCEPTED",
                election_id=election_id,
                checkpoint_sequence=replay_audit["checkpoint_sequence"],
                witness_sequence=replay_audit["witness_sequence"],
                previous_witness_sequence=replay_audit["previous_witness_sequence"],
                checkpoint_digest=replay_audit["checkpoint_digest"],
                checkpoint=json.loads(replay_audit["checkpoint_canonical_json"]),
                witness_public_key=replay_audit["witness_public_key"],
                witness_signature=replay_audit["witness_signature"],
                witnessed_at_utc=replay_audit["witnessed_at_utc"]
            )

        # Atomic commit to storage
        audit_entry, is_replay = self.storage.record_checkpoint(
            election_id=election_id,
            manifest_digest=record.manifest_digest,
            tree_size=record.tree_size,
            merkle_root=record.merkle_root,
            checkpoint_sequence=record.checkpoint_sequence,
            checkpoint_kind=record.checkpoint_kind.value,
            checkpoint_digest=checkpoint_digest,
            canonical_json=canonical_str,
            previous_checkpoint_digest=record.previous_checkpoint_digest,
            writer_signature=submission.writer_signature,
            writer_public_key=verified_writer_key,
            witness_signature_fn=self.key_manager.sign_witness_ack,
            witness_public_key=self.public_key_hex
        )

        return WitnessAcknowledgement(
            status="ACCEPTED",
            election_id=election_id,
            checkpoint_sequence=audit_entry["checkpoint_sequence"],
            witness_sequence=audit_entry["witness_sequence"],
            previous_witness_sequence=audit_entry["previous_witness_sequence"],
            checkpoint_digest=audit_entry["checkpoint_digest"],
            checkpoint=json.loads(audit_entry["checkpoint_canonical_json"]),
            witness_public_key=audit_entry["witness_public_key"],
            witness_signature=audit_entry["witness_signature"],
            witnessed_at_utc=audit_entry["witnessed_at_utc"]
        )

    def process_final(
        self,
        election_id: str,
        submission: FinalCheckpointSubmission
    ) -> FinalCheckpointResponse:
        """
        Seal election log, mark FINAL, verify consistency, and prevent further checkpoints.
        """
        # Case 1: Checkpoint submitted with final request
        if submission.checkpoint is not None:
            record = submission.checkpoint
            if record.election_id != election_id:
                raise ElectionIdMismatchError(
                    f"Path election ID {election_id} does not match record election ID {record.election_id}"
                )

            # Ensure checkpoint kind is FINAL
            if record.checkpoint_kind != CheckpointKind.FINAL:
                record = record.model_copy(update={"checkpoint_kind": CheckpointKind.FINAL})

            canonical_dict = record.to_canonical_dict()
            canonical_bytes = canonical_json_bytes(canonical_dict)
            canonical_str = canonical_bytes.decode("utf-8")
            checkpoint_digest = sha256_hex(canonical_bytes)

            # Check if already finalized
            state = self.storage.get_election_state(election_id)
            if state and state["is_final"] == 1:
                existing_final = self.storage.get_final_checkpoint(election_id)
                if existing_final and existing_final["checkpoint_digest"] == checkpoint_digest:
                    return FinalCheckpointResponse(
                        status="FINAL",
                        election_id=election_id,
                        checkpoint_sequence=existing_final["checkpoint_sequence"],
                        witness_sequence=existing_final["witness_sequence"],
                        previous_witness_sequence=existing_final["previous_witness_sequence"],
                        checkpoint_digest=existing_final["checkpoint_digest"],
                        checkpoint=json.loads(existing_final["checkpoint_canonical_json"]),
                        witness_public_key=existing_final["witness_public_key"],
                        witness_signature=existing_final["witness_signature"],
                        is_final=True,
                        witnessed_at_utc=existing_final["witnessed_at_utc"]
                    )
                raise ConflictingFinalCheckpointError(
                    f"Conflicting second FINAL checkpoint refused for election {election_id}"
                )

            writer_sig = submission.writer_signature or ""
            verified_writer_key = self._verify_writer_auth(
                election_id=election_id,
                canonical_bytes=canonical_bytes,
                signature_hex=writer_sig,
                provided_public_key=submission.writer_public_key
            )

            replay_audit = self._verify_state_and_consistency(
                state=state,
                record=record,
                checkpoint_digest=checkpoint_digest,
                consistency_proof_hex=submission.consistency_proof
            )

            audit_entry, _ = self.storage.record_checkpoint(
                election_id=election_id,
                manifest_digest=record.manifest_digest,
                tree_size=record.tree_size,
                merkle_root=record.merkle_root,
                checkpoint_sequence=record.checkpoint_sequence,
                checkpoint_kind="FINAL",
                checkpoint_digest=checkpoint_digest,
                canonical_json=canonical_str,
                previous_checkpoint_digest=record.previous_checkpoint_digest,
                writer_signature=writer_sig,
                writer_public_key=verified_writer_key,
                witness_signature_fn=self.key_manager.sign_witness_ack,
                witness_public_key=self.public_key_hex
            )

            return FinalCheckpointResponse(
                status="FINAL",
                election_id=election_id,
                checkpoint_sequence=audit_entry["checkpoint_sequence"],
                witness_sequence=audit_entry["witness_sequence"],
                previous_witness_sequence=audit_entry["previous_witness_sequence"],
                checkpoint_digest=audit_entry["checkpoint_digest"],
                checkpoint=json.loads(audit_entry["checkpoint_canonical_json"]),
                witness_public_key=audit_entry["witness_public_key"],
                witness_signature=audit_entry["witness_signature"],
                is_final=True,
                witnessed_at_utc=audit_entry["witnessed_at_utc"]
            )

        # Case 2: Sealing existing latest checkpoint
        audit_entry, _ = self.storage.seal_final_existing(
            election_id=election_id,
            witness_signature_fn=self.key_manager.sign_witness_ack,
            witness_public_key=self.public_key_hex
        )

        return FinalCheckpointResponse(
            status="FINAL",
            election_id=election_id,
            checkpoint_sequence=audit_entry["checkpoint_sequence"],
            witness_sequence=audit_entry["witness_sequence"],
            previous_witness_sequence=audit_entry["previous_witness_sequence"],
            checkpoint_digest=audit_entry["checkpoint_digest"],
            checkpoint=json.loads(audit_entry["checkpoint_canonical_json"]),
            witness_public_key=audit_entry["witness_public_key"],
            witness_signature=audit_entry["witness_signature"],
            is_final=True,
            witnessed_at_utc=audit_entry["witnessed_at_utc"]
        )

    def get_final(self, election_id: str) -> FinalCheckpointResponse:
        """Fetch signed FINAL checkpoint for election."""
        state = self.storage.get_election_state(election_id)
        if not state:
            raise ElectionNotFoundError(f"Election {election_id} not found")

        if state["is_final"] != 1:
            raise FinalCheckpointNotFoundError(
                f"Election {election_id} has not been sealed with FINAL checkpoint"
            )

        audit_entry = self.storage.get_final_checkpoint(election_id)
        if not audit_entry:
            raise FinalCheckpointNotFoundError(
                f"No FINAL checkpoint audit record found for election {election_id}"
            )

        return FinalCheckpointResponse(
            status="FINAL",
            election_id=election_id,
            checkpoint_sequence=audit_entry["checkpoint_sequence"],
            witness_sequence=audit_entry["witness_sequence"],
            previous_witness_sequence=audit_entry["previous_witness_sequence"],
            checkpoint_digest=audit_entry["checkpoint_digest"],
            checkpoint=json.loads(audit_entry["checkpoint_canonical_json"]),
            witness_public_key=audit_entry["witness_public_key"],
            witness_signature=audit_entry["witness_signature"],
            is_final=True,
            witnessed_at_utc=audit_entry["witnessed_at_utc"]
        )

    def get_latest(self, election_id: str) -> WitnessAcknowledgement:
        """Fetch latest witnessed checkpoint acknowledgement."""
        state = self.storage.get_election_state(election_id)
        if not state:
            raise ElectionNotFoundError(f"Election {election_id} not found")

        audit_entry = self.storage.get_latest_checkpoint(election_id)
        if not audit_entry:
            raise ElectionNotFoundError(f"No checkpoint found for election {election_id}")

        return WitnessAcknowledgement(
            status="ACCEPTED",
            election_id=election_id,
            checkpoint_sequence=audit_entry["checkpoint_sequence"],
            witness_sequence=audit_entry["witness_sequence"],
            previous_witness_sequence=audit_entry["previous_witness_sequence"],
            checkpoint_digest=audit_entry["checkpoint_digest"],
            checkpoint=json.loads(audit_entry["checkpoint_canonical_json"]),
            witness_public_key=audit_entry["witness_public_key"],
            witness_signature=audit_entry["witness_signature"],
            witnessed_at_utc=audit_entry["witnessed_at_utc"]
        )
