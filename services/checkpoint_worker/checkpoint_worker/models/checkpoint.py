"""
Checkpoint model representing himvote.checkpoint.v1 schema.
Conforms strictly to Section 5.4 of HimVote specification.
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator
from checkpoint_worker.crypto.canonical_json import canonical_json, compute_canonical_digest


class CheckpointRecord(BaseModel):
    """
    himvote.checkpoint.v1 canonical checkpoint record.
    All fields are serialized deterministically per RFC 8785.
    """
    schema_version: str = Field(
        default="himvote.checkpoint.v1",
        alias="schema",
    )
    election_id: str
    manifest_digest: str
    tree_size: int
    merkle_root: str
    previous_checkpoint_digest: Optional[str] = None
    last_leaf_index: Optional[int] = None
    last_leaf_digest: Optional[str] = None
    issued_count: int
    issuance_ledger_digest: str
    roster_commitment: str
    protocol_version: str = "1.0.0"
    checkpoint_kind: Literal["INCREMENTAL", "FINAL"] = "INCREMENTAL"
    checkpoint_sequence: int

    @field_validator("tree_size", "issued_count", "checkpoint_sequence")
    @classmethod
    def validate_non_negative_int(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Numeric values must be non negative")
        return value

    def to_canonical_dict(self) -> dict:
        """
        Produce Python dictionary with strict field naming for canonical serialization.
        """
        return {
            "checkpoint_kind": self.checkpoint_kind,
            "checkpoint_sequence": self.checkpoint_sequence,
            "election_id": self.election_id,
            "issuance_ledger_digest": self.issuance_ledger_digest,
            "issued_count": self.issued_count,
            "last_leaf_digest": self.last_leaf_digest,
            "last_leaf_index": self.last_leaf_index,
            "manifest_digest": self.manifest_digest,
            "merkle_root": self.merkle_root,
            "previous_checkpoint_digest": self.previous_checkpoint_digest,
            "protocol_version": self.protocol_version,
            "roster_commitment": self.roster_commitment,
            "schema": self.schema_version,
            "tree_size": self.tree_size,
        }

    def to_canonical_bytes(self) -> bytes:
        """
        Convert to RFC 8785 canonical JSON bytes.
        """
        return canonical_json(self.to_canonical_dict())

    def compute_digest(self) -> str:
        """
        Compute SHA256 hex digest of canonical checkpoint bytes.
        """
        return compute_canonical_digest(self.to_canonical_dict())
