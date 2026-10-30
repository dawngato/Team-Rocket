"""
Pydantic data models for HimVote Checkpoint records and Witness API schemas.
Implements Section 5.4 checkpoint record schema:
election_id, manifest_digest, tree_size, merkle_root, previous_checkpoint_digest,
last_leaf_index, last_leaf_digest, issued_count, issuance_ledger_digest,
roster_commitment, protocol_version, checkpoint_kind, checkpoint_sequence.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class CheckpointKind(str, Enum):
    """Permitted checkpoint kinds per HimVote specification."""
    INCREMENTAL = "INCREMENTAL"
    FINAL = "FINAL"


class CheckpointRecord(BaseModel):
    """
    Canonical checkpoint record matching Section 5.4.
    Rejects extra fields and duplicate keys to enforce canonical representation.
    """
    election_id: str = Field(..., description="Unique election identifier")
    manifest_digest: str = Field(..., description="Hex SHA256 digest of election manifest")
    tree_size: int = Field(..., ge=0, description="Cumulative count of leaves in Merkle tree")
    merkle_root: str = Field(..., description="Hex SHA256 Merkle tree root hash")
    previous_checkpoint_digest: Optional[str] = Field(
        default=None,
        description="Hex digest of previous canonical checkpoint record, null for first"
    )
    last_leaf_index: Optional[int] = Field(
        default=None,
        description="Zero based index of the last leaf, tree_size minus one"
    )
    last_leaf_digest: Optional[str] = Field(
        default=None,
        description="Hex hash of the last leaf inserted"
    )
    issued_count: int = Field(..., ge=0, description="Total credentials issued")
    issuance_ledger_digest: str = Field(..., description="Cryptographic commitment to issuance ledger")
    roster_commitment: str = Field(..., description="Commitment to frozen voter roster")
    protocol_version: str = Field(..., description="Protocol version identifier")
    checkpoint_kind: CheckpointKind = Field(..., description="INCREMENTAL or FINAL")
    checkpoint_sequence: int = Field(..., ge=1, description="Strictly increasing integer sequence number")

    @field_validator("election_id")
    @classmethod
    def validate_election_id(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("election_id cannot be blank")
        return s

    @model_validator(mode="after")
    def validate_tree_invariants(self) -> "CheckpointRecord":
        """Enforce internal consistency between tree_size and last_leaf_index."""
        if self.tree_size == 0:
            if self.last_leaf_index is not None and self.last_leaf_index != -1:
                raise ValueError("last_leaf_index must be null or negative one when tree_size is zero")
        else:
            expected_index = self.tree_size - 1
            if self.last_leaf_index is not None and self.last_leaf_index != expected_index:
                raise ValueError(
                    f"last_leaf_index {self.last_leaf_index} does not match tree_size minus one ({expected_index})"
                )
        return self

    def to_canonical_dict(self) -> Dict[str, Any]:
        """Convert to primitive dictionary ready for RFC 8785 canonical serialization."""
        return {
            "checkpoint_kind": self.checkpoint_kind.value,
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
            "tree_size": self.tree_size,
        }


class CheckpointSubmission(BaseModel):
    """
    Submission payload to POST /checkpoints.
    Supports either nested checkpoint object or flattened fields.
    """
    checkpoint: CheckpointRecord
    consistency_proof: List[str] = Field(
        default_factory=list,
        description="RFC 9162 consistency proof hashes in hexadecimal"
    )
    writer_signature: str = Field(
        ...,
        description="Hex encoded Ed25519 signature from election log writer"
    )
    writer_public_key: Optional[str] = Field(
        default=None,
        description="Optional hex encoded Ed25519 writer public key if not pre pinned"
    )

    @model_validator(mode="before")
    @classmethod
    def allow_flattened_checkpoint(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if "checkpoint" in data and isinstance(data["checkpoint"], dict):
            return data

        # Check if flattened fields are provided
        checkpoint_field_names = {
            "election_id", "manifest_digest", "tree_size", "merkle_root",
            "previous_checkpoint_digest", "last_leaf_index", "last_leaf_digest",
            "issued_count", "issuance_ledger_digest", "roster_commitment",
            "protocol_version", "checkpoint_kind", "checkpoint_sequence"
        }
        if any(f in data for f in checkpoint_field_names):
            nested_checkpoint = {k: data[k] for k in checkpoint_field_names if k in data}
            remaining = {k: v for k, v in data.items() if k not in checkpoint_field_names}
            remaining["checkpoint"] = nested_checkpoint
            return remaining
        return data


class FinalCheckpointSubmission(BaseModel):
    """
    Submission payload to POST /elections/{id}/final.
    Can supply a full final checkpoint record or seal existing checkpoint state.
    """
    checkpoint: Optional[CheckpointRecord] = None
    consistency_proof: List[str] = Field(default_factory=list)
    writer_signature: Optional[str] = None
    writer_public_key: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def allow_flattened_final(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if "checkpoint" in data:
            return data
        checkpoint_field_names = {
            "election_id", "manifest_digest", "tree_size", "merkle_root",
            "previous_checkpoint_digest", "last_leaf_index", "last_leaf_digest",
            "issued_count", "issuance_ledger_digest", "roster_commitment",
            "protocol_version", "checkpoint_kind", "checkpoint_sequence"
        }
        if any(f in data for f in checkpoint_field_names):
            nested_checkpoint = {k: data[k] for k in checkpoint_field_names if k in data}
            remaining = {k: v for k, v in data.items() if k not in checkpoint_field_names}
            remaining["checkpoint"] = nested_checkpoint
            return remaining
        return data


class WitnessAcknowledgement(BaseModel):
    """
    Signed witness acknowledgement returned on accepted checkpoints.
    Binds canonical checkpoint bytes, previous witness sequence, and election ID.
    """
    status: str = Field(default="ACCEPTED")
    election_id: str
    checkpoint_sequence: int
    witness_sequence: int
    previous_witness_sequence: int
    checkpoint_digest: str
    checkpoint: Dict[str, Any]
    witness_public_key: str
    witness_signature: str
    witnessed_at_utc: str


class FinalCheckpointResponse(BaseModel):
    """Signed final checkpoint response returned by GET /elections/{id}/final."""
    status: str = Field(default="FINAL")
    election_id: str
    checkpoint_sequence: int
    witness_sequence: int
    previous_witness_sequence: int
    checkpoint_digest: str
    checkpoint: Dict[str, Any]
    witness_public_key: str
    witness_signature: str
    is_final: bool = True
    witnessed_at_utc: str
