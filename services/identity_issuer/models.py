"""
SQLAlchemy 2 database models for the HimVote Identity Cluster.

Models:
* tenants
* campuses
* departments
* staff_profiles
* student_profiles
* users
* role_definitions
* permissions
* role_assignments
* invitations
* approval_requests
* approval_decisions
* enrollment_sources
* student_verifications
* sessions
* mfa_credentials
* recovery_requests
* admin_audit_events (append only)
* election_roster_snapshots
* roster_members
* credential_issuance_records
* issuance_events
* system_settings
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Integer,
    JSON,
    ForeignKey,
    UniqueConstraint,
    event,
)
from sqlalchemy.orm import relationship
from .database import Base


def utcnow() -> datetime:
    """Return the current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    """Generate a random UUID v4 string."""
    return str(uuid.uuid4())


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    campuses = relationship("Campus", back_populates="tenant", cascade="all")


class Campus(Base):
    __tablename__ = "campuses"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="campuses")
    departments = relationship("Department", back_populates="campus", cascade="all")


class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    campus = relationship("Campus", back_populates="departments")
    staff_profiles = relationship("StaffProfile", back_populates="department")
    student_profiles = relationship("StudentProfile", back_populates="department")


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    department_id = Column(String, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(String(100), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    department = relationship("Department", back_populates="staff_profiles")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    department_id = Column(String, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    campus_id = Column(String, ForeignKey("campuses.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    department = relationship("Department", back_populates="student_profiles")
    verifications = relationship("StudentVerification", back_populates="student")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    external_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(80), nullable=True)
    phone_number = Column(String(16), nullable=True)
    password_hash = Column(Text, nullable=False)
    password_algorithm = Column(String(50), nullable=False, default="argon2id")
    password_params = Column(JSON, nullable=False, default=dict)
    status = Column(String(50), nullable=False, default="INVITED")
    mfa_enrolled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    role_assignments = relationship("RoleAssignment", back_populates="user", foreign_keys="[RoleAssignment.user_id]", cascade="all")
    sessions = relationship("Session", back_populates="user", cascade="all")
    mfa_credentials = relationship("MfaCredential", back_populates="user", cascade="all")


class RoleDefinition(Base):
    __tablename__ = "role_definitions"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    role_assignments = relationship("RoleAssignment", back_populates="role_definition")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class RoleAssignment(Base):
    __tablename__ = "role_assignments"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("role_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    scope_type = Column(String(50), nullable=False)
    scope_id = Column(String(255), nullable=False)
    granted_by = Column(String, ForeignKey("users.id"), nullable=True)
    granted_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", "scope_type", "scope_id", name="uq_role_assignment"),
    )

    user = relationship("User", foreign_keys=[user_id], back_populates="role_assignments")
    role_definition = relationship("RoleDefinition", back_populates="role_assignments")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(100), nullable=False)
    scope = Column(String(255), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    invited_by = Column(String, ForeignKey("users.id"), nullable=False)
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), nullable=False, default="PENDING")
    delivery_status = Column(String(50), nullable=False, default="PENDING")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(String, primary_key=True, default=generate_uuid)
    request_type = Column(String(100), nullable=False)
    requester_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    requested_role = Column(String(100), nullable=True)
    requested_scope = Column(String(255), nullable=True)
    approver_id = Column(String, ForeignKey("users.id"), nullable=True)
    decision = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    decided_at = Column(DateTime(timezone=True), nullable=True)

    decisions = relationship("ApprovalDecision", back_populates="request", cascade="all")


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"

    id = Column(String, primary_key=True, default=generate_uuid)
    request_id = Column(String, ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    decision = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    request = relationship("ApprovalRequest", back_populates="decisions")


class EnrollmentSource(Base):
    __tablename__ = "enrollment_sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    config = Column(JSON, nullable=False, default=dict)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class StudentVerification(Base):
    __tablename__ = "student_verifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    verified_by = Column(String, ForeignKey("users.id"), nullable=True)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)
    verification_method = Column(String(50), nullable=False)
    verified_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    student = relationship("StudentProfile", back_populates="verifications")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    is_mfa_authenticated = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_accessed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")


class MfaCredential(Base):
    __tablename__ = "mfa_credentials"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    secret_hash = Column(Text, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    enrolled_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="mfa_credentials")


class RecoveryRequest(Base):
    __tablename__ = "recovery_requests"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="PENDING")
    delivery_status = Column(String(50), nullable=False, default="PENDING")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)


class AccountActivation(Base):
    """Single use password setup token created for a pending account."""

    __tablename__ = "account_activations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="PENDING")
    delivery_status = Column(String(50), nullable=False, default="PENDING")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)


class AdminAuditEvent(Base):
    __tablename__ = "admin_audit_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(200), nullable=False, index=True)
    result = Column(String(50), nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)


# Append only enforcement at ORM level
@event.listens_for(AdminAuditEvent, "before_update")
def receive_before_update(mapper, connection, target):
    raise PermissionError("admin_audit_events table is append only. Updates are forbidden.")


@event.listens_for(AdminAuditEvent, "before_delete")
def receive_before_delete(mapper, connection, target):
    raise PermissionError("admin_audit_events table is append only. Deletes are forbidden.")


class ElectionRosterSnapshot(Base):
    __tablename__ = "election_roster_snapshots"

    id = Column(String, primary_key=True, default=generate_uuid)
    election_id = Column(String(255), nullable=False, index=True)
    roster_version = Column(Integer, nullable=False)
    digest = Column(Text, nullable=False)
    eligible_count = Column(Integer, nullable=False, default=0)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    signed_by = Column(String, ForeignKey("users.id"), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="DRAFT")
    issuance_start_utc = Column(DateTime(timezone=True), nullable=True)
    issuance_cutoff_utc = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("election_id", "roster_version", name="uq_snapshot_version"),
    )


class RosterMember(Base):
    __tablename__ = "roster_members"

    election_id = Column(String(255), primary_key=True, nullable=False)
    roster_version = Column(Integer, primary_key=True, nullable=False)
    student_id = Column(String(255), primary_key=True, nullable=False)
    department = Column(String(255), nullable=False)
    verified = Column(Boolean, nullable=False, default=False)


class CredentialIssuanceRecord(Base):
    __tablename__ = "credential_issuance_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    election_id = Column(String(255), nullable=False, index=True)
    student_id = Column(String(255), nullable=False, index=True)
    blinded_request = Column(Text, nullable=False)
    request_digest = Column(String(255), nullable=False, index=True)
    blind_signature_response = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="RESERVED")
    issuer_key_id = Column(String(255), nullable=False)
    roster_version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("election_id", "student_id", name="uq_credential_election_student"),
    )


class IssuanceEvent(Base):
    __tablename__ = "issuance_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    election_id = Column(String(255), nullable=False, index=True)
    student_id = Column(String(255), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class RosterCorrection(Base):
    """Persisted correction requests; the web client never treats local state as a decision."""

    __tablename__ = "roster_corrections"

    id = Column(String, primary_key=True, default=generate_uuid)
    student_id = Column(String(255), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    class_id = Column(String(255), nullable=True)
    correction_type = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")
    submitted_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    decided_by = Column(String, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
