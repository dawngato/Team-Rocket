"""
Unit tests for administrator invitations, role grant requests, and two person approvals.
Enforces separation of duties: creators can never approve their own requests.
"""

from datetime import datetime, timedelta, timezone
import hashlib
from HimVote.services.identity_issuer.models import User, RoleDefinition, RoleAssignment, Session as UserSession
from HimVote.services.identity_issuer.crypto.hashing import hash_password


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
        expires_at=datetime.now(timezone.utc) + timedelta(hours=4),
    )
    db_session.add(session)
    db_session.commit()

    return user, raw_token


def test_admin_invitations_and_role_requests(client, db_session):
    """Verify administrator invitation creation and role grant submission."""
    admin_user, admin_token = create_authenticated_user(
        db_session, "admin1@institution.edu", "administrator", "ADM001"
    )

    # Step 1: Create administrator invitation
    inv_resp = client.post(
        "/v1/admin/invitations",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": "newadmin@institution.edu", "role": "administrator", "scope": "department_cse"},
    )
    assert inv_resp.status_code == 201
    assert inv_resp.json()["status"] == "invitation_created"

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
