"""
Unit tests for SQLAlchemy 2 models of HimVote Identity cluster.
Validates table creation, relationships, unique constraints, and append only audit triggers.
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from HimVote.services.identity_issuer.models import (
    Tenant,
    Campus,
    Department,
    StaffProfile,
    StudentProfile,
    User,
    RoleDefinition,
    Permission,
    RoleAssignment,
    Invitation,
    ApprovalRequest,
    ApprovalDecision,
    EnrollmentSource,
    StudentVerification,
    Session as UserSession,
    MfaCredential,
    RecoveryRequest,
    AdminAuditEvent,
    ElectionRosterSnapshot,
    RosterMember,
    CredentialIssuanceRecord,
    IssuanceEvent,
    SystemSetting,
)


def test_identity_cluster_models_persisted(db_session):
    """Verify all 22 required identity cluster models can be created and persisted."""
    tenant = Tenant(name="Himachal Pradesh Technical University", domain="hptu.ac.in")
    db_session.add(tenant)
    db_session.flush()

    campus = Campus(tenant_id=tenant.id, name="Main Campus Hamirpur")
    db_session.add(campus)
    db_session.flush()

    dept = Department(campus_id=campus.id, name="Computer Science", code="CSE")
    db_session.add(dept)
    db_session.flush()

    staff = StaffProfile(
        department_id=dept.id,
        employee_id="EMP101",
        full_name="Dr A K Sharma",
        email="aksharma@hptu.ac.in",
    )
    db_session.add(staff)

    student_prof = StudentProfile(
        student_id="HPTU2026001",
        email="student1@hptu.ac.in",
        full_name="Rohit Verma",
        department_id=dept.id,
        campus_id=campus.id,
    )
    db_session.add(student_prof)

    user = User(
        external_id="HPTU2026001",
        email="student1@hptu.ac.in",
        password_hash="$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy",
        password_algorithm="argon2id",
        password_params={"time_cost": 3, "memory_cost": 65536},
        status="ACTIVE",
    )
    db_session.add(user)
    db_session.flush()

    role = RoleDefinition(name="student", description="Student voter")
    perm = Permission(name="vote_cast", description="Permission to cast ballot")
    db_session.add_all([role, perm])
    db_session.flush()

    assignment = RoleAssignment(
        user_id=user.id,
        role_id=role.id,
        scope_type="campus",
        scope_id=campus.id,
    )
    db_session.add(assignment)

    invitation = Invitation(
        email="teacher1@hptu.ac.in",
        role="teacher",
        scope="CSE",
        token_hash="hash_invitation_123",
        invited_by=user.id,
        expires_at=datetime.now(timezone.utc),
    )
    db_session.add(invitation)

    approval_req = ApprovalRequest(
        request_type="role_grant",
        requester_id=user.id,
    )
    db_session.add(approval_req)
    db_session.flush()

    approval_dec = ApprovalDecision(
        request_id=approval_req.id,
        approver_id=user.id,
        decision="approved",
        reason="Verified credentials",
    )
    db_session.add(approval_dec)

    source = EnrollmentSource(name="SIS API", type="sis")
    db_session.add(source)

    verification = StudentVerification(
        student_id=student_prof.id,
        verified_by=user.id,
        department_id=dept.id,
        verification_method="registry_check",
    )
    db_session.add(verification)

    session_rec = UserSession(
        user_id=user.id,
        token_hash="hash_session_abc",
        expires_at=datetime.now(timezone.utc),
    )
    db_session.add(session_rec)

    mfa = MfaCredential(
        user_id=user.id,
        type="totp",
        secret_hash="JBSWY3DPEHPK3PXP",
    )
    db_session.add(mfa)

    recovery = RecoveryRequest(
        user_id=user.id,
        token_hash="hash_recovery_xyz",
        expires_at=datetime.now(timezone.utc),
    )
    db_session.add(recovery)

    audit = AdminAuditEvent(
        actor_id=user.id,
        action="user.login",
        result="success",
        details={"ip": "127.0.0.1"},
    )
    db_session.add(audit)

    snapshot = ElectionRosterSnapshot(
        election_id="elec_2026_01",
        roster_version=1,
        digest="digest_hash_987",
        eligible_count=1,
        created_by=user.id,
    )
    db_session.add(snapshot)

    member = RosterMember(
        election_id="elec_2026_01",
        roster_version=1,
        student_id="HPTU2026001",
        department="CSE",
        verified=True,
    )
    db_session.add(member)

    cred = CredentialIssuanceRecord(
        election_id="elec_2026_01",
        student_id="HPTU2026001",
        blinded_request="blinded_b64url_req",
        request_digest="req_digest_123",
        status="RESERVED",
        issuer_key_id="issuer_key_v1",
        roster_version=1,
    )
    db_session.add(cred)

    issuance_evt = IssuanceEvent(
        election_id="elec_2026_01",
        student_id="HPTU2026001",
        event_type="credential_reserved",
    )
    db_session.add(issuance_evt)

    setting = SystemSetting(key="bootstrap_claimed", value="false")
    db_session.add(setting)

    db_session.commit()

    # Verify query
    assert db_session.query(Tenant).count() == 1
    assert db_session.query(Campus).count() == 1
    assert db_session.query(Department).count() == 1
    assert db_session.query(StaffProfile).count() == 1
    assert db_session.query(StudentProfile).count() == 1
    assert db_session.query(User).count() == 1
    assert db_session.query(RoleDefinition).count() == 1
    assert db_session.query(Permission).count() == 1
    assert db_session.query(RoleAssignment).count() == 1
    assert db_session.query(Invitation).count() == 1
    assert db_session.query(ApprovalRequest).count() == 1
    assert db_session.query(ApprovalDecision).count() == 1
    assert db_session.query(EnrollmentSource).count() == 1
    assert db_session.query(StudentVerification).count() == 1
    assert db_session.query(UserSession).count() == 1
    assert db_session.query(MfaCredential).count() == 1
    assert db_session.query(RecoveryRequest).count() == 1
    assert db_session.query(AdminAuditEvent).count() == 1
    assert db_session.query(ElectionRosterSnapshot).count() == 1
    assert db_session.query(RosterMember).count() == 1
    assert db_session.query(CredentialIssuanceRecord).count() == 1
    assert db_session.query(IssuanceEvent).count() == 1
    assert db_session.query(SystemSetting).count() == 1


def test_admin_audit_event_append_only(db_session):
    """Enforce append only rule: AdminAuditEvent updates and deletes must raise PermissionError."""
    audit = AdminAuditEvent(
        action="security.policy.change",
        result="success",
        details={"policy": "mfa_enforced"},
    )
    db_session.add(audit)
    db_session.commit()

    # Attempt update
    audit.result = "failure"
    with pytest.raises(PermissionError, match="append only"):
        db_session.commit()

    db_session.rollback()

    # Attempt delete
    db_session.delete(audit)
    with pytest.raises(PermissionError, match="append only"):
        db_session.commit()

    db_session.rollback()


def test_credential_issuance_record_uniqueness(db_session):
    """Enforce single slot per student per election via unique constraint."""
    cred1 = CredentialIssuanceRecord(
        election_id="elec_unique_test",
        student_id="STUDENT007",
        blinded_request="req_data_1",
        request_digest="digest_1",
        status="RESERVED",
        issuer_key_id="key1",
        roster_version=1,
    )
    db_session.add(cred1)
    db_session.commit()

    cred2 = CredentialIssuanceRecord(
        election_id="elec_unique_test",
        student_id="STUDENT007",
        blinded_request="req_data_2",
        request_digest="digest_2",
        status="RESERVED",
        issuer_key_id="key1",
        roster_version=1,
    )
    db_session.add(cred2)
    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()
