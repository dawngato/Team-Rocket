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


def create_authenticated_user(db_session, email: str, role_name: str, external_id: str) -> tuple[User, str]:
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
        scope_type="global",
        scope_id="*",
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
    assert "Self approval forbidden" in self_approve_resp.json()["detail"]

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
