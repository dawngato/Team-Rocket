"""
Pydantic schemas matching HimVote OpenAPI 3.1.0 specification.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Candidate(BaseModel):
    """Contest candidate schema."""
    id: str
    name: str
    contest: str
    statement: Optional[str] = None


class CreateElectionRequest(BaseModel):
    """Election creation payload for draft election."""
    institution_id: Optional[str] = Field(default=None, min_length=1, max_length=255)
    title: str
    contest: str
    selection_rule: str
    opens_at_utc: str
    closes_at_utc: str
    issuance_cutoff_utc: str
    min_anonymous_turnout: Optional[int] = 10


class UpdateElectionRequest(BaseModel):
    """Election metadata update payload while in draft."""
    title: Optional[str] = None
    contest: Optional[str] = None
    selection_rule: Optional[str] = None
    opens_at_utc: Optional[str] = None
    closes_at_utc: Optional[str] = None
    issuance_cutoff_utc: Optional[str] = None
    min_anonymous_turnout: Optional[int] = None


class ElectionSummary(BaseModel):
    """Compact summary of election state."""
    id: str
    title: str
    state: str
    opens_at_utc: str
    closes_at_utc: str


class Election(BaseModel):
    """Full election detail schema."""
    id: str
    institution_id: Optional[str] = None
    title: str
    state: str
    manifest_digest: str
    opens_at_utc: str
    closes_at_utc: str
    issuance_cutoff_utc: str
    contest: Optional[str] = None
    selection_rule: Optional[str] = None
    eligible_count: Optional[int] = 0
    candidates: Optional[List[Candidate]] = []


class ElectionList(BaseModel):
    """List of elections."""
    elections: List[ElectionSummary]


class StudentRecord(BaseModel):
    """Student entry in election roster."""
    student_id: str
    email: str
    full_name: str
    department: str


class RosterSubmitRequest(BaseModel):
    """Roster submission request."""
    roster_version: str = "v1"
    records: List[StudentRecord]


class RosterApproveRequest(BaseModel):
    """Roster approval signing request by independent approver."""
    roster_version: str = "v1"
    approver_public_key: Optional[str] = None
    approver_signature: Optional[str] = None


class FreezeElectionRequest(BaseModel):
    """Manifest freezing parameters."""
    issuer_key_id: Optional[str] = "issuer_key_default"
    engine_name: Optional[str] = "himvote_engine_v1"
    engine_version: Optional[str] = "1.0.0"
    trustees: Optional[List[str]] = []
    log_key_id: Optional[str] = "log_key_default"
    witness_keys: Optional[List[str]] = []
    auditor_key_fingerprint: Optional[str] = None
    verifier_version: Optional[str] = "1.0.0"
    anchor_policy: Optional[str] = "anchor_required_before_publication"


class CancelElectionRequest(BaseModel):
    """Signed cancellation request."""
    reason: str
    signature: str


class PauseElectionRequest(BaseModel):
    """Pause election request."""
    reason: str


class PublicationRequest(BaseModel):
    """Auditor publication gate verification request."""
    auditor_public_key: str
    auditor_signature: str
    attestation_data: Dict[str, Any]


class PublishedResults(BaseModel):
    """Publicly disclosed election tally and counts."""
    election_id: str
    manifest_digest: str
    tally: Dict[str, Any]
    total_ballots: int
    published_at_utc: str
    privacy_limited: Optional[bool] = False


class EvidencePackage(BaseModel):
    """Election evidence package metadata."""
    election_id: str
    manifest_digest: str
    final_checkpoint_digest: str
    anchor_tx_hash: str
    auditor_signature: str
    evidence_url: Optional[str] = None


class AuditEvent(BaseModel):
    """Admin audit event record."""
    id: str
    timestamp: str
    actor_id: str
    action: str
    result: str
    details: Optional[Dict[str, Any]] = None


class AuditEventList(BaseModel):
    """List of append only audit events."""
    events: List[AuditEvent]
    total: int


class ErrorResponse(BaseModel):
    """Standardized HimVote error payload."""
    error_code: str
    message: str
    request_id: str
    details: Optional[Dict[str, Any]] = None
