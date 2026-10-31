"""
Unit tests for administrator invitations, role grant requests, and two person approvals.
Enforces separation of duties: creators can never approve their own requests.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import pyotp
from services.identity_issuer.models import (
    User,
    RoleDefinition,
    RoleAssignment,
    Invitation,
    Session as UserSession,
)
from services.identity_issuer.crypto.hashing import hash_password


def create_authenticated_user(db_session, email: str, role_name: str, external_id: str, scope_id: str = "*", scope_type: str = "global") -> tuple[User, str]:
    """Helper to seed a user with role and active session token."""
    pwd_hash, pwd_params = hash_password("PasswordTest1234!")
    user = User(
        external_id=external_id,
        email=email,
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
    )
    db_session.add(user)
    db_session.flush()

    role = db_session.query(RoleDefinition).filter(RoleDefinition.name == role_name).first()
    if not role:
        role = RoleDefinition(name=role_name, description=f"{role_name} role")
        db_session.add(role)
        db_session.flush()

    assignment = RoleAssignment(
        user_id=user.id,
        role_id=role.id,
        scope_type=scope_type,
        scope_id=scope_id,
    )
    db_session.add(assignment)

    raw_token = f"token_{external_id}"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        is_mfa_authenticated=True,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=4),
    )
    db_session.add(session)
    db_session.commit()

    return user, raw_token


def test_admin_invitations_and_role_requests(client, db_session):
    """Verify administrator invitation creation and role grant submission."""
    admin_user, admin_token = create_authenticated_user(
        db_session, "admin1@institution.edu", "super_admin", "ADM001"
    )

    # Step 1: Create a scoped staff invitation. Ordinary administrators cannot
    # mint another administrator or an independent auditor.
    inv_resp = client.post(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": "newteacher@institution.edu", "role": "teacher", "scope": "department_cse"},
    )
    assert inv_resp.status_code == 201
    assert inv_resp.json()["status"] == "invitation_created"

    # Invitation redemption is a real activation path, not just token creation.
    redeem_resp = client.post(
        "/v1/auth/invitations/redeem",
        json={
            "invitation_token": inv_resp.json()["token"],
            "password": "NewAdminPassword2026!",
        },
    )
    assert redeem_resp.status_code == 201
    redeemed = redeem_resp.json()
    assert redeemed["role"] == "teacher"
    assert redeemed["scope"] == "department_cse"
    invitation = db_session.query(Invitation).filter_by(id=inv_resp.json()["invitation_id"]).one()
    assert invitation.status == "REDEEMED"
    assigned_role = db_session.query(RoleDefinition).filter_by(name="teacher").one()
    assignment = db_session.query(RoleAssignment).filter_by(
        user_id=redeemed["user_id"],
        role_id=assigned_role.id,
        scope_id="department_cse",
    ).one()
    assert assignment.scope_type == "delegated"
    login_resp = client.post(
        "/v1/auth/login",
        json={
            "email": "newteacher@institution.edu",
            "password": "NewAdminPassword2026!",
            "mfa_token": pyotp.TOTP(redeemed["totp_secret"]).now(),
        },
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["mfa_required"] is False

    # A redeemed token cannot provision a second account.
    replay_resp = client.post(
        "/v1/auth/invitations/redeem",
        json={
            "invitation_token": inv_resp.json()["token"],
            "password": "NewAdminPassword2026!",
        },
    )
    assert replay_resp.status_code == 400

    # Step 2: Request role grant for target user
    target_user, _ = create_authenticated_user(
        db_session, "teacher1@institution.edu", "teacher", "TCH001"
    )
    req_resp = client.post(
        "/v1/admin/role-grant-requests",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": target_user.id,
            "role": "election_officer",
            "scope": "annual_election_2026",
            "justification": "Appointed to election committee",
        },
    )
    assert req_resp.status_code == 202
    approval_id = req_resp.json()["approval_id"]

    # Step 3: Self approval is strictly forbidden
    self_approve_resp = client.post(
        f"/v1/approvals/{approval_id}/decision",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"decision": "approved", "reason": "Self approved"},
    )
    assert self_approve_resp.status_code == 403
    assert "forbidden" in self_approve_resp.json()["detail"].lower()

    # Step 4: Independent administrator approves successfully
    second_admin, second_token = create_authenticated_user(
        db_session, "admin2@institution.edu", "administrator", "ADM002"
    )
    approve_resp = client.post(
        f"/v1/approvals/{approval_id}/decision",
        headers={"Authorization": f"Bearer {second_token}"},
        json={"decision": "approved", "reason": "Committee verified"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "decision_recorded"
    target_assignment = db_session.query(RoleAssignment).join(
        RoleDefinition, RoleAssignment.role_id == RoleDefinition.id
    ).filter(
        RoleAssignment.user_id == target_user.id,
        RoleDefinition.name == "election_officer",
        RoleAssignment.scope_id == "annual_election_2026",
    ).one()
    assert target_assignment.scope_type == "delegated"


def test_admin_cannot_delegate_uncontrolled_roles(client, db_session):
    """Ordinary admin workflows cannot mint super admin or auditor roles."""
    admin_user, admin_token = create_authenticated_user(
        db_session, "scoped_admin@institution.edu", "administrator", "ADM_SCOPE"
    )
    target_user, _ = create_authenticated_user(
        db_session, "target_teacher@institution.edu", "teacher", "TCH_SCOPE"
    )

    response = client.post(
        "/v1/admin/role-grant-requests",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": target_user.id,
            "role": "super_admin",
            "scope": "*",
            "justification": "must be rejected",
        },
    )
    assert response.status_code == 403

    response = client.post(
        "/v1/admin/role-grant-requests",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": target_user.id,
            "role": "roster_approver",
            "scope": "*",
            "justification": "must be independently provisioned",
        },
    )
    assert response.status_code == 403

    response = client.post(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": "auditor@institution.edu", "role": "independent_auditor", "scope": "*"},
    )
    assert response.status_code == 403


def test_admin_audit_events_endpoint(client, db_session):
    """Verify admin audit events endpoint provides audit trail."""
    admin_user, admin_token = create_authenticated_user(
        db_session, "auditor_admin@institution.edu", "administrator", "ADM003"
    )

    resp = client.get(
        "/v1/admin/audit-events",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data
    assert "total" in data


def test_scoped_administrator_listings_and_approvals(client, db_session):
    """
    P1-23, P1-24, P1-25 regression test:
    - Administrator listings (invitations, teachers) only show records within assigned scope.
    - Approval queue filtered by approver's scope and excludes unapprovable admin roles.
    - Rejection decision authorization enforced against requested scope and role.
    - Self-rejection is forbidden.
    """
    super_admin, super_token = create_authenticated_user(
        db_session, "super@institution.edu", "super_admin", "SUP001"
    )
    admin_a, token_a = create_authenticated_user(
        db_session, "admin_a@institution.edu", "administrator", "ADMA", scope_id="dept_cs", scope_type="department"
    )
    admin_b, token_b = create_authenticated_user(
        db_session, "admin_b@institution.edu", "administrator", "ADMB", scope_id="dept_ee", scope_type="department"
    )

    # 1. Create invitations in dept_cs and dept_ee via super_admin
    inv_a = client.post(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {super_token}"},
        json={"email": "prof_cs@institution.edu", "role": "teacher", "scope": "dept_cs"},
    )
    assert inv_a.status_code == 201

    inv_b = client.post(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {super_token}"},
        json={"email": "prof_ee@institution.edu", "role": "teacher", "scope": "dept_ee"},
    )
    assert inv_b.status_code == 201

    # P1-23: admin_a should only see dept_cs invitation, not dept_ee
    list_a = client.get(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert list_a.status_code == 200
    inv_emails_a = [item["email"] for item in list_a.json()]
    assert "prof_cs@institution.edu" in inv_emails_a
    assert "prof_ee@institution.edu" not in inv_emails_a

    # Super admin sees both
    list_sup = client.get(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {super_token}"},
    )
    assert list_sup.status_code == 200
    inv_emails_sup = [item["email"] for item in list_sup.json()]
    assert "prof_cs@institution.edu" in inv_emails_sup
    assert "prof_ee@institution.edu" in inv_emails_sup

    # 2. Role grant requests
    target_user, _ = create_authenticated_user(
        db_session, "target_fellow@institution.edu", "teacher", "TFEL001"
    )
    req_cs = client.post(
        "/v1/admin/role-grant-requests",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "user_id": target_user.id,
            "role": "teacher",
            "scope": "dept_cs",
            "justification": "CS Department Teacher",
        },
    )
    assert req_cs.status_code == 202
    approval_cs_id = req_cs.json()["approval_id"]

    req_ee = client.post(
        "/v1/admin/role-grant-requests",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "user_id": target_user.id,
            "role": "teacher",
            "scope": "dept_ee",
            "justification": "EE Department Teacher",
        },
    )
    assert req_ee.status_code == 202
    approval_ee_id = req_ee.json()["approval_id"]

    # P1-24: admin_b approval queue must only show dept_ee request, not dept_cs
    approvals_b = client.get(
        "/v1/admin/approvals?status=pending",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert approvals_b.status_code == 200
    appr_ids_b = [item["id"] for item in approvals_b.json()]
    assert approval_ee_id in appr_ids_b
    assert approval_cs_id not in appr_ids_b

    # P1-25: Rejection authorization is strictly enforced
    # admin_b trying to reject dept_cs request fails with 403 (out of scope)
    rej_out_of_scope = client.post(
        f"/v1/approvals/{approval_cs_id}/decision",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"decision": "rejected", "reason": "Not my department but trying to reject"},
    )
    assert rej_out_of_scope.status_code == 403
    assert "Decision scope exceeds" in rej_out_of_scope.json()["detail"]

    # Self-rejection forbidden: admin_b trying to reject approval_ee_id (which they created) fails with 403
    self_rej = client.post(
        f"/v1/approvals/{approval_ee_id}/decision",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"decision": "rejected", "reason": "Self rejection attempt"},
    )
    assert self_rej.status_code == 403
    assert "Self approval forbidden" in self_rej.json()["detail"]

    # Super admin or authorized non-creator administrator can reject
    valid_rej = client.post(
        f"/v1/approvals/{approval_ee_id}/decision",
        headers={"Authorization": f"Bearer {super_token}"},
        json={"decision": "rejected", "reason": "Legitimate rejection by super admin"},
    )
    assert valid_rej.status_code == 200
    assert valid_rej.json()["status"] == "decision_recorded"
    assert valid_rej.json()["decision"] == "rejected"
