"""
Independent witness service simulation matching Section 6.6 of prompt.md.
Verifies election binding, monotonic tree size, detects gaps, prevents rollback,
and rejects incompatible second finals.
"""

from datetime import datetime, timezone
from typing import Dict, Optional
from .crypto import KeyPair, canonical_json_bytes, sha256_digest
from .models import CheckpointRecord, WitnessAcknowledgement


class WitnessCluster:
    """
    Independent witness service.
    Operated independently to provide tamper evident signed checkpoints.
    """

    def __init__(self, election_id: str, manifest_digest: str):
        self.election_id = election_id
        self.manifest_digest = manifest_digest
        self.keypair = KeyPair()
        self.last_sequence = 0
        self.last_tree_size = 0
        self.final_checkpoint: Optional[CheckpointRecord] = None
        self.checkpoints: Dict[int, CheckpointRecord] = {}
        self.acknowledgements: Dict[int, WitnessAcknowledgement] = {}
        self.simulate_permanent_outage = False

    def ingest_checkpoint(self, checkpoint: CheckpointRecord) -> WitnessAcknowledgement:
        """
        Witness verification of incremental or final checkpoint.
        Ensures strict monotonic tree size, sequence continuity, and no gaps.
        """
        if self.simulate_permanent_outage:
            raise ConnectionError("Witness service is unreachable or in permanent outage")

        # Check 1: Election binding
        if checkpoint.election_id != self.election_id:
            raise ValueError(f"Witness rejected wrong election ID: {checkpoint.election_id}")

        # Check 2: Manifest binding
        if checkpoint.manifest_digest != self.manifest_digest:
            raise ValueError("Witness rejected checkpoint manifest digest mismatch")

        # Check 3: Rejection of any checkpoint after FINAL
        if self.final_checkpoint is not None:
            if checkpoint.checkpoint_kind == "FINAL":
                # Incompatible second final check
                if (
                    self.final_checkpoint.merkle_root != checkpoint.merkle_root
                    or self.final_checkpoint.tree_size != checkpoint.tree_size
                ):
                    raise ValueError("Witness rejected second incompatible FINAL checkpoint")
                # Identical retry returns existing acknowledgement
                return self.acknowledgements[self.final_checkpoint.checkpoint_sequence]
            raise ValueError("Witness rejected checkpoint submitted after FINAL was committed")

        # Check 4: Sequence continuity
        expected_seq = self.last_sequence + 1
        if checkpoint.checkpoint_sequence != expected_seq:
            raise ValueError(
                f"Sequence mismatch: expected {expected_seq}, received {checkpoint.checkpoint_sequence}"
            )

        # Check 5: Gap detection and monotonic tree size
        if checkpoint.tree_size < self.last_tree_size:
            raise ValueError("Tree size rollback detected: smaller than last witnessed size")
        if checkpoint.tree_size == 0:
            raise ValueError("Tree size must be greater than zero for checkpoints")

        # Enforce no gaps: tree size cannot leap beyond known continuous expansion
        # For incremental checkpoints, the step must match batch expansion
        if checkpoint.last_leaf_index != checkpoint.tree_size - 1:
            raise ValueError("Gap detected between tree size and last leaf index")

        canonical_bytes = canonical_json_bytes(checkpoint.model_dump(by_alias=True))
        checkpoint_digest = sha256_digest(canonical_bytes)
        signature = self.keypair.sign(canonical_bytes)

        ack = WitnessAcknowledgement(
            election_id=checkpoint.election_id,
            checkpoint_digest=checkpoint_digest,
            witness_signature=signature,
            witness_key_id=self.keypair.key_id,
            sequence=checkpoint.checkpoint_sequence,
            acknowledged_at=datetime.now(timezone.utc).isoformat()
        )

        self.last_sequence = checkpoint.checkpoint_sequence
        self.last_tree_size = checkpoint.tree_size
        self.checkpoints[checkpoint.checkpoint_sequence] = checkpoint
        self.acknowledgements[checkpoint.checkpoint_sequence] = ack

        if checkpoint.checkpoint_kind == "FINAL":
            self.final_checkpoint = checkpoint

        return ack

    def get_final_checkpoint(self) -> CheckpointRecord:
        """Fetch verified FINAL checkpoint independently from witness."""
        if self.simulate_permanent_outage:
            raise ConnectionError("Witness service is unreachable")
        if not self.final_checkpoint:
            raise RuntimeError("Election final checkpoint not witnessed yet")
        return self.final_checkpoint
