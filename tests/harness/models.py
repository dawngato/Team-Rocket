"""
Data models and schemas for HimVote audit evidence and checkpoints.
Matches canonical specifications from Section 5.3 and Section 5.4 of prompt.md.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    """Base model enforcing strict validation and forbidden extra attributes."""
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Manifest(StrictModel):
    election_id: str
    title: str
    contests: List[Dict[str, str]]
    candidates: List[Dict[str, str]]
    opens_at_utc: str
    closes_at_utc: str
    issuance_cutoff_utc: str
    version: int = 1


class BallotEvidence(StrictModel):
    schema_name: str = Field(default="himvote.ballot-evidence.v1", alias="schema")
    election_id: str
    manifest_digest: str
    ballot_id: str
    leaf_index: int
    credential_nullifier: str
    credential_proof_b64url: str
    engine_ballot_b64url: str
    engine_proofs_b64url: str
    engine_record_version: str = "electionguard_1.0.0"


class CheckpointRecord(StrictModel):
    schema_name: str = Field(default="himvote.checkpoint.v1", alias="schema")
    election_id: str
    manifest_digest: str
    tree_size: int
    merkle_root: str
    previous_checkpoint_digest: Optional[str] = None
    last_leaf_index: int
    last_leaf_digest: str
    issued_count: int
    issuance_ledger_digest: str
    roster_commitment: str
    protocol_version: str = "himvote_2.0.0"
    checkpoint_kind: str = "INCREMENTAL"
    checkpoint_sequence: int


class WitnessAcknowledgement(StrictModel):
    election_id: str
    checkpoint_digest: str
    witness_signature: str
    witness_key_id: str
    sequence: int
    acknowledged_at: str


class ChainAnchor(StrictModel):
    election_commitment: str
    sequence: int
    digest: str
    previous_digest: Optional[str] = None
    is_final: bool = False
    block_number: int
    block_hash: str
    relayer_address: str


class PublishedResult(StrictModel):
    election_id: str
    manifest_digest: str
    tally: Dict[str, int]
    total_ballots: int
    privacy_limited: bool = False
    auditor_signature: str
    published_at: str
