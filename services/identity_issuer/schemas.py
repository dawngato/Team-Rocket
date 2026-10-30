"""
Pydantic v2 schemas for HimVote Identity Issuer.
Conforms directly to packages/openapi/himvote.openapi.yaml.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    mfa_token: Optional[str] = None


class LoginResponse(BaseModel):
    session_token: str
    user_id: str
    role: str
    mfa_required: bool


class RecoveryRequest(BaseModel):
    email: EmailStr


class RecoveryResetRequest(BaseModel):
    token: str = Field(min_length=32)
    password: str = Field(min_length=16)


class BootstrapClaimRequest(BaseModel):
    invitation_token: str
    password: str = Field(min_length=16)


class BootstrapClaimResponse(BaseModel):
    status: str
    user_id: str
    totp_secret: Optional[str] = None
    totp_uri: Optional[str] = None


class AdminInvitationRequest(BaseModel):
    email: EmailStr
    role: str
    scope: str


class RoleGrantRequest(BaseModel):
    user_id: str
    role: str
    scope: str
    justification: str


class ApprovalDecisionRequest(BaseModel):
    decision: str
    reason: str


class AuditEvent(BaseModel):
    id: str
    timestamp: datetime
    actor_id: Optional[str] = None
    action: str
    result: str
    details: Dict[str, Any] = Field(default_factory=dict)


class AuditEventList(BaseModel):
    events: List[AuditEvent]
    total: int


class StudentRegisterRequest(BaseModel):
    student_id: str
    email: EmailStr
    full_name: str = Field(min_length=1)


class StudentRecord(BaseModel):
    student_id: str
    email: EmailStr
    full_name: str
    department: str


class StudentImportRequest(BaseModel):
    source: str
    records: List[StudentRecord]


class StudentVerifyRequest(BaseModel):
    verified_by: str
    department: str


class RosterElection(BaseModel):
    election_id: str
    state: str
    eligible: bool
    credential_status: Optional[str] = "none"


class RosterMeResponse(BaseModel):
    eligible: bool
    elections: List[RosterElection]


class BlindedIssuanceRequest(BaseModel):
    election_id: str
    blinded_request: str


class BlindedIssuanceResponse(BaseModel):
    blind_signature_response: str
    status: str


class IssuanceStatusResponse(BaseModel):
    election_id: str
    status: str
    delivered: bool


class MfaSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class MfaVerifyRequest(BaseModel):
    token: str


class RosterSnapshotCreateRequest(BaseModel):
    election_id: str
    issuance_start_utc: Optional[datetime] = None
    issuance_cutoff_utc: Optional[datetime] = None


class RosterSnapshotResponse(BaseModel):
    id: str
    election_id: str
    roster_version: int
    digest: str
    eligible_count: int
    status: str
    signed_by: Optional[str] = None
    signed_at: Optional[datetime] = None
