"""
Unit tests for student registration, verification, roster snapshots, and blind credential issuance.
Validates RFC 9474 issuance algorithm, independent roster approval, and slot uniqueness.
"""

from datetime import datetime, timedelta, timezone
import hashlib
from services.identity_issuer.models import User, Session as UserSession
from services.identity_issuer.models import RoleAssignment, RoleDefinition
from services.identity_issuer.crypto.rfc9474 import (
    get_default_issuer,
    client_blind,
    client_finalize,
    client_verify,
)
from services.identity_issuer.tests.test_admin_and_approvals import create_authenticated_user


def test_student_registration_and_verification(client, db_session):
    """Verify student self registration and teacher verification flow."""
    # Step 1: Self registration starts at PENDING_VERIFICATION
    reg_resp = client.post(
        "/v1/students/register",
        json={
            "student_id": "STU2026101",
            "email": "student101@institution.edu",
            "full_name": "Aarav Sharma",
        },
    )
    assert reg_resp.status_code == 202
    assert reg_resp.json()["status"] == "registration_pending_verification"

    # Step 2: Duplicate registration rejected
    dup_resp = client.post(
        "/v1/students/register",
        json={
            "student_id": "STU2026101",
            "email": "student101_alt@institution.edu",
            "full_name": "Aarav Sharma",
        },
    )
    assert dup_resp.status_code == 409

    # Step 3: Teacher verifies student identity
    teacher, teacher_token = create_authenticated_user(
        db_session, "prof_cse@institution.edu", "teacher", "TCH_CSE"
    )
    verify_resp = client.post(
        "/v1/students/STU2026101/verify",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"verified_by": "prof_cse@institution.edu", "department": "Computer Science"},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "student_verified"


def test_teacher_cannot_verify_student_outside_delegated_department(client, db_session):
    """Teacher permissions are scoped to the department in the role assignment."""
    teacher, teacher_token = create_authenticated_user(
        db_session, "scoped_teacher@institution.edu", "teacher", "TCH_SCOPED"
    )
    teacher_role = db_session.query(RoleDefinition).filter_by(name="teacher").one()
    assignment = db_session.query(RoleAssignment).filter_by(
        user_id=teacher.id,
        role_id=teacher_role.id,
    ).one()
    assignment.scope_type = "department"
    assignment.scope_id = "Computer Science"
    db_session.commit()

    register_resp = client.post(
        "/v1/students/register",
        json={
            "student_id": "STU_OUT_OF_SCOPE",
            "email": "out.of.scope@institution.edu",
            "full_name": "Out Of Scope",
        },
    )
    assert register_resp.status_code == 202

    verify_resp = client.post(
        "/v1/students/STU_OUT_OF_SCOPE/verify",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "verified_by": teacher.email,
            "department": "Electrical Engineering",
        },
    )
    assert verify_resp.status_code == 403


def test_roster_snapshot_approval_and_freezing(client, db_session):
    """Verify independent roster approval rule and immutable snapshot freeze."""
    admin, admin_token = create_authenticated_user(
        db_session, "importer_admin@institution.edu", "administrator", "ADM_IMP"
    )

    # Register and verify a student first
    client.post(
        "/v1/students/register",
        json={"student_id": "STU2026201", "email": "stu201@institution.edu", "full_name": "Pooja Thakur"},
    )
    client.post(
        "/v1/students/STU2026201/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"verified_by": admin.email, "department": "Electronics"},
    )

    # Step 1: Administrator creates roster snapshot
    snap_resp = client.post(
        "/v1/roster/snapshots",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"election_id": "election_hptu_2026"},
    )
    assert snap_resp.status_code == 201
    snap_data = snap_resp.json()
    snapshot_id = snap_data["id"]
    assert snap_data["status"] == "DRAFT"
    assert snap_data["eligible_count"] >= 1

    # Step 2: Importer attempting to approve their own snapshot is rejected
    self_approve_resp = client.post(
        f"/v1/roster/snapshots/{snapshot_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert self_approve_resp.status_code == 403
    assert "independent person from the importer" in self_approve_resp.json()["detail"]

    # Step 3: Independent Roster Approver signs snapshot
    approver, approver_token = create_authenticated_user(
        db_session, "roster_sign@institution.edu", "roster_approver", "ROSTER_APP_1"
    )
    approve_resp = client.post(
        f"/v1/roster/snapshots/{snapshot_id}/approve",
        headers={"Authorization": f"Bearer {approver_token}"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "roster_approved"

    # Step 4: Freeze approved snapshot
    freeze_resp = client.post(
        f"/v1/roster/snapshots/{snapshot_id}/freeze",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert freeze_resp.status_code == 200
    assert freeze_resp.json()["status"] == "roster_frozen"


def test_blind_credential_issuance_flow(client, db_session):
    """
    Verify complete RFC 9474 Blind Credential Issuance flow:
    * Membership check in frozen roster
    * Slot reservation and status transitions
    * Blind signing and unblinding
    * Idempotent replay with identical blinded request
    * Rejection of conflicting blinded request
    * Issuance status query
    """
    admin, admin_token = create_authenticated_user(
        db_session, "admin_issuance@institution.edu", "administrator", "ADM_ISS"
    )
    approver, approver_token = create_authenticated_user(
        db_session, "approver_issuance@institution.edu", "roster_approver", "APP_ISS"
    )

    # 1. Register and verify student
    student_id = "STU2026301"
    reg_resp = client.post(
        "/v1/students/register",
        json={"student_id": student_id, "email": "student301@institution.edu", "full_name": "Suresh Kumar"},
    )
    assert reg_resp.status_code == 202

    verify_resp = client.post(
        "/v1/students/STU2026301/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"verified_by": admin.email, "department": "Civil"},
    )
    assert verify_resp.status_code == 200

    student_user = db_session.query(User).filter(User.external_id == student_id).first()
    student_token = f"token_{student_id}"
    token_hash = hashlib.sha256(student_token.encode("utf-8")).hexdigest()
    user_session = UserSession(
        user_id=student_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=4),
    )
    db_session.add(user_session)
    db_session.commit()

    # 2. Snapshot, approve, and freeze roster
    election_id = "election_student_council_2026"
    now = datetime.now(timezone.utc)
    snap_resp = client.post(
        "/v1/roster/snapshots",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "election_id": election_id,
            "issuance_start_utc": (now - timedelta(hours=1)).isoformat(),
            "issuance_cutoff_utc": (now + timedelta(hours=24)).isoformat(),
        },
    )
    snapshot_id = snap_resp.json()["id"]

    client.post(
        f"/v1/roster/snapshots/{snapshot_id}/approve",
        headers={"Authorization": f"Bearer {approver_token}"},
    )
    client.post(
        f"/v1/roster/snapshots/{snapshot_id}/freeze",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # 3. Check student roster eligibility endpoint
    me_resp = client.get(
        "/v1/roster/me",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["eligible"] is True

    # 4. Generate RFC 9474 blinded request on client
    issuer = get_default_issuer()
    public_key = issuer.public_key
    voter_credential_secret = b"himvote:credential:stu301:secret_serial_salt_456"
    blinded_b64url, r = client_blind(voter_credential_secret, public_key)

    # 5. Issue credential
    issue_resp = client.post(
        "/v1/credentials/issue",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"election_id": election_id, "blinded_request": blinded_b64url},
    )
    assert issue_resp.status_code == 200
    issue_data = issue_resp.json()
    assert issue_data["status"] == "DELIVERED"
    blind_sig_resp = issue_data["blind_signature_response"]
    assert len(blind_sig_resp) > 0

    # 6. Client unblinds signature and verifies against original secret
    unblinded_sig = client_finalize(blind_sig_resp, r, public_key)
    assert client_verify(voter_credential_secret, unblinded_sig, public_key) is True

    # 7. Duplicate request with identical blinded request returns stored response
    replay_resp = client.post(
        "/v1/credentials/issue",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"election_id": election_id, "blinded_request": blinded_b64url},
    )
    assert replay_resp.status_code == 200
    assert replay_resp.json()["blind_signature_response"] == blind_sig_resp

    # 8. Duplicate request with DIFFERENT blinded request is rejected with 409 Conflict
    different_blinded_b64url, _ = client_blind(b"different_secret_999", public_key)
    conflict_resp = client.post(
        "/v1/credentials/issue",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"election_id": election_id, "blinded_request": different_blinded_b64url},
    )
    assert conflict_resp.status_code == 409
    assert "Conflicting blinded request rejected" in conflict_resp.json()["detail"]

    # 9. Query issuance status without secrets
    status_resp = client.get(
        f"/v1/credentials/issuance-status?election_id={election_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "DELIVERED"
    assert status_resp.json()["delivered"] is True


def test_teacher_roster_corrections_department_scoped(client, db_session):
    """Verify teachers can only list and submit corrections for their assigned department."""
    from services.identity_issuer.models import Tenant, Campus, Department, StaffProfile, RosterCorrection

    tenant = Tenant(name="Main University", domain="institution.edu")
    db_session.add(tenant)
    db_session.flush()

    campus = Campus(tenant_id=tenant.id, name="Main Campus")
    db_session.add(campus)
    db_session.flush()

    dept_cs = Department(campus_id=campus.id, name="Computer Science", code="CS")
    dept_ee = Department(campus_id=campus.id, name="Electrical Engineering", code="EE")
    db_session.add_all([dept_cs, dept_ee])
    db_session.flush()

    # Teacher assigned to CS
    teacher_cs, token_cs = create_authenticated_user(
        db_session, "teacher_cs@institution.edu", "teacher", "TCH_CS_01"
    )
    # Remove global assignment from create_authenticated_user and add department scoped assignment
    db_session.query(RoleAssignment).filter(RoleAssignment.user_id == teacher_cs.id).delete()
    role_teacher = db_session.query(RoleDefinition).filter_by(name="teacher").first()
    db_session.add(RoleAssignment(
        user_id=teacher_cs.id,
        role_id=role_teacher.id,
        scope_type="department",
        scope_id=dept_cs.code,
    ))
    db_session.commit()

    # 1. Teacher CS attempts to submit correction for EE (must fail 403)
    resp_ee = client.post(
        "/v1/roster/corrections",
        headers={"Authorization": f"Bearer {token_cs}"},
        json={
            "student_id": "ST_EE_101",
            "student_name": "EE Student",
            "department": "EE",
            "correction_type": "ADD_STUDENT",
            "reason": "Missing from roster",
        },
    )
    assert resp_ee.status_code == 403
    assert "assigned department" in resp_ee.json()["detail"]

    # 2. Teacher CS submits correction for CS (must succeed 201)
    resp_cs = client.post(
        "/v1/roster/corrections",
        headers={"Authorization": f"Bearer {token_cs}"},
        json={
            "student_id": "ST_CS_101",
            "student_name": "CS Student",
            "department": "CS",
            "correction_type": "ADD_STUDENT",
            "reason": "Missing from roster",
        },
    )
    assert resp_cs.status_code == 201
    cs_record = resp_cs.json()

    # 3. Add an EE correction directly to DB (submitted by someone else)
    ee_correction = RosterCorrection(
        student_id="ST_EE_999",
        student_name="Other Student",
        department="EE",
        correction_type="REMOVE_STUDENT",
        reason="Transferred",
        status="PENDING",
        submitted_by="other_actor",
    )
    db_session.add(ee_correction)
    db_session.commit()

    # 4. Teacher CS lists corrections: sees CS correction, but NOT EE correction
    list_cs = client.get(
        "/v1/roster/corrections",
        headers={"Authorization": f"Bearer {token_cs}"},
    )
    assert list_cs.status_code == 200
    returned_ids = [c["student_id"] for c in list_cs.json()]
    assert "ST_CS_101" in returned_ids
    assert "ST_EE_999" not in returned_ids

    # 5. Super Admin lists corrections: sees both
    admin, token_admin = create_authenticated_user(
        db_session, "super_admin@institution.edu", "super_admin", "ADM_CORR"
    )
    list_admin = client.get(
        "/v1/roster/corrections",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert list_admin.status_code == 200
    admin_returned_ids = [c["student_id"] for c in list_admin.json()]
    assert "ST_CS_101" in admin_returned_ids
    assert "ST_EE_999" in admin_returned_ids
