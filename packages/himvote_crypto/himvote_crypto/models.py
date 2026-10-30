"""Canonical data structures for HimVote election evidence per Sections 5.3 and 5.4.

Defines:
* BallotEvidenceRecord: himvote.ballot_evidence.v1
* CheckpointRecord: himvote.checkpoint.v1
* WitnessAcknowledgement
* AuditorAttestation
"""

import hashlib
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from himvote_crypto.jcs import canonical_digest, canonical_digest_hex, canonicalize
from himvote_crypto.merkle import leaf_hash


class StrictRecord(BaseModel):
    """Base model forbidding extra fields and enforcing strict validation."""

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        frozen=True,
    )


class BallotEvidenceRecord(StrictRecord):
    """Canonical ballot evidence record per HimVote Section 5.3.

    Schema: himvote.ballot_evidence.v1
    Fields:
    * schema
    * election_id
    * manifest_digest
    * ballot_id
    * leaf_index
    * credential_nullifier
    * credential_proof_b64url
    * engine_ballot_b64url
    * engine_proofs_b64url
    * engine_record_version
    """

    schema_version: str = Field(
        default="himvote.ballot-evidence.v1",
        alias="schema",
    )
    election_id: str
    manifest_digest: str
    ballot_id: str
    leaf_index: int = Field(ge=0)
    credential_nullifier: str
    credential_proof_b64url: str
    engine_ballot_b64url: str
    engine_proofs_b64url: str
    engine_record_version: str

    @field_validator("schema_version")
    @classmethod
    def validate_schema(cls, v: str) -> str:
        valid_schemas = ("himvote.ballot-evidence.v1", "himvote.ballot_evidence.v1")
        if v not in valid_schemas:
            raise ValueError(f"Unsupported schema version: {v}, expected {valid_schemas[0]}")
        return v

    def to_ordered_dict(self) -> Dict[str, Any]:
        """Convert to dictionary matching RFC 8785 canonical field names."""
        return {
            "schema": self.schema_version,
            "election_id": self.election_id,
            "manifest_digest": self.manifest_digest,
            "ballot_id": self.ballot_id,
            "leaf_index": self.leaf_index,
            "credential_nullifier": self.credential_nullifier,
            "credential_proof_b64url": self.credential_proof_b64url,
            "engine_ballot_b64url": self.engine_ballot_b64url,
            "engine_proofs_b64url": self.engine_proofs_b64url,
            "engine_record_version": self.engine_record_version,
        }

    def canonical_bytes(self) -> bytes:
        """Compute the deterministic RFC 8785 canonical JSON bytes."""
        return canonicalize(self.to_ordered_dict(), allow_floats=False)

    def leaf_hash(self) -> bytes:
        """Compute RFC 9162 leaf hash: SHA256(0x00 || canonical_bytes)."""
        return leaf_hash(self.canonical_bytes())

    def leaf_hash_hex(self) -> str:
        """Compute hexadecimal RFC 9162 leaf hash."""
        return self.leaf_hash().hex()


class CheckpointRecord(StrictRecord):
    """Canonical checkpoint record per HimVote Section 5.4.

    Schema: himvote.checkpoint.v1
    Fields:
    * election_id
    * manifest_digest
    * tree_size
    * merkle_root
    * previous_checkpoint_digest
    * last_leaf_index
    * last_leaf_digest
    * issued_count
    * issuance_ledger_digest
    * roster_commitment
    * protocol_version
    * checkpoint_kind (INCREMENTAL or FINAL)
    * checkpoint_sequence
    """

    schema_version: str = Field(
        default="himvote.checkpoint.v1",
        alias="schema",
    )
    election_id: str
    manifest_digest: str
    tree_size: int = Field(ge=0)
    merkle_root: str
    previous_checkpoint_digest: str
    last_leaf_index: int = Field(ge=-1)
    last_leaf_digest: str
    issued_count: int = Field(ge=0)
    issuance_ledger_digest: str
    roster_commitment: str
    protocol_version: str = Field(default="1.0.0")
    checkpoint_kind: Literal["INCREMENTAL", "FINAL"]
    checkpoint_sequence: int = Field(ge=1)

    @field_validator("schema_version")
    @classmethod
    def validate_schema(cls, v: str) -> str:
        expected = "himvote.checkpoint.v1"
        if v != expected:
            raise ValueError(f"Unsupported schema version: {v}, expected {expected}")
        return v

    def to_ordered_dict(self) -> Dict[str, Any]:
        """Convert to dictionary matching canonical field structure."""
        return {
            "schema": self.schema_version,
            "election_id": self.election_id,
            "manifest_digest": self.manifest_digest,
            "tree_size": self.tree_size,
            "merkle_root": self.merkle_root,
            "previous_checkpoint_digest": self.previous_checkpoint_digest,
            "last_leaf_index": self.last_leaf_index,
            "last_leaf_digest": self.last_leaf_digest,
            "issued_count": self.issued_count,
            "issuance_ledger_digest": self.issuance_ledger_digest,
            "roster_commitment": self.roster_commitment,
            "protocol_version": self.protocol_version,
            "checkpoint_kind": self.checkpoint_kind,
            "checkpoint_sequence": self.checkpoint_sequence,
        }

    def canonical_bytes(self) -> bytes:
        """Compute the deterministic RFC 8785 canonical JSON bytes."""
        return canonicalize(self.to_ordered_dict(), allow_floats=False)

    def digest(self) -> bytes:
        """Compute SHA256 digest of canonical checkpoint bytes."""
        return canonical_digest(self.to_ordered_dict(), allow_floats=False)

    def digest_hex(self) -> str:
        """Compute hexadecimal SHA256 digest of canonical checkpoint bytes."""
        return canonical_digest_hex(self.to_ordered_dict(), allow_floats=False)
