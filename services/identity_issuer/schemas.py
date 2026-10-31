"""
Pydantic v2 schemas for HimVote Identity Issuer.
Conforms directly to packages/openapi/himvote.openapi.yaml.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    mfa_token: Optional[str] = None


class LoginResponse(BaseModel):
    session_token: str
    user_id: str
    role: str
    mfa_required: bool


class SessionScope(BaseModel):
    role: str
    scope_type: str
    scope_id: str


class SessionProfile(BaseModel):
    user_id: str
    email: EmailStr
    roles: List[str]
    scopes: List[SessionScope]
    mfa_authenticated: bool


class ProfileUpdateRequest(BaseModel):
    """Strict allowlist for self-service profile attributes."""

    model_config = ConfigDict(extra="forbid")

    display_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    phone_number: Optional[str] = Field(default=None, max_length=16)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("display_name must contain a non-whitespace character")
        if len(normalized) > 80:
            raise ValueError("display_name must be at most 80 characters")
        return normalized

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: Optional[str]) -> Optional[str]:
        if value == "":
            return None
        if value is None:
            return value
        if not value.startswith("+") or not value[1:].isascii() or not value[1:].isdigit():
            raise ValueError("phone_number must use E.164 format, for example +14155552671")
        digits = value[1:]
        if not 8 <= len(digits) <= 15 or digits.startswith("0"):
            raise ValueError("phone_number must contain 8 to 15 E.164 digits")
        return value


class ProfileResponse(BaseModel):
    id: str
    display_name: Optional[str]
    phone_number: Optional[str]
    updated_at: datetime


class InvitationRedeemRequest(BaseModel):
    """Single-use invitation redemption payload."""
    invitation_token: str = Field(min_length=16)
    password: str = Field(min_length=16)


class InvitationRedeemResponse(BaseModel):
    """Result of activating an invited staff account."""
    status: str
    user_id: str
    role: str
    scope: str
    totp_secret: Optional[str] = None
    totp_uri: Optional[str] = None


class RecoveryRequest(BaseModel):
    email: EmailStr


class RecoveryResetRequest(BaseModel):
    token: str = Field(min_length=32)
    password: str = Field(min_length=16)


class AccountActivationRequest(BaseModel):
    activation_token: str = Field(min_length=32)
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


class AdminInvitationRecord(BaseModel):
    id: str
    email: EmailStr
    role: str
    scope: str
    status: str
    delivery_status: str
    expires_at: datetime
    created_at: datetime


class TeacherDirectoryRecord(BaseModel):
    user_id: str
    email: EmailStr
    external_id: str
    status: str
    role: str
    scope: str
    invitation_id: Optional[str] = None


class CreateTeacherRequest(BaseModel):
    full_name: str = Field(min_length=1)
    faculty_id: str = Field(min_length=1)
    email: EmailStr
    department: str = Field(min_length=1)
    # Kept only to provide a clear validation error for legacy callers. The
    # provisioning route rejects every supplied password and uses a one-time
    # invitation instead.
    initial_password: Optional[str] = Field(default=None, min_length=12)


class RosterCorrectionRequest(BaseModel):
    student_id: str = Field(min_length=1)
    student_name: str = Field(min_length=1)
    department: str = Field(min_length=1)
    class_id: Optional[str] = Field(default=None, min_length=1)
    correction_type: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class RosterCorrectionRecord(BaseModel):
    id: str
    student_id: str
    student_name: str
    department: str
    class_id: Optional[str] = None
    correction_type: str
    reason: str
    status: str
    submitted_by: str
    created_at: datetime
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None


class RoleGrantRequest(BaseModel):
    user_id: str
    role: str
    scope: str
    justification: str = Field(min_length=1)


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    reason: str = Field(min_length=1)


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


class DirectRoleAssignRequest(BaseModel):
    user_email_or_id: str = Field(min_length=1)
    role: str = Field(min_length=1)
    scope: str = Field(default="global")


class DirectRoleAssignResponse(BaseModel):
    status: str
    user_id: str
    email: str
    role: str
    scope: str


class RegisteredUserItem(BaseModel):
    id: str
    email: str
    external_id: str
    status: str
    roles: List[str]
    created_at: datetime


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
    verified_by: Optional[str] = None
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
    election_id: str = Field(min_length=1, max_length=255)
    blinded_request: str = Field(min_length=32, max_length=8192)


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
