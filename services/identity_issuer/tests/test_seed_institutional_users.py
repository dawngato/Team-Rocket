"""
Unit tests for institutional user seeding and authentication.
Verifies arungaming1973@gmail.com seeded with administrator role and super_admin capability,
and verifies authentication with Admin123! and UserPassword123!.
"""

from services.identity_issuer.database import seed_institutional_users
from services.identity_issuer.routers.deps import get_user_roles


def test_seed_institutional_users_default_admin(db_session, client):
    """Verify arungaming1973@gmail.com is seeded with administrator role and can log in."""
    user = seed_institutional_users(db_session)
    assert user.email == "arungaming1973@gmail.com"
    assert user.status == "ACTIVE"

    roles = get_user_roles(user, db_session)
    assert "administrator" in roles

    # Login with Admin123!
    resp1 = client.post(
        "/v1/auth/login",
        json={"email": "arungaming1973@gmail.com", "password": "Admin123!"},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["role"] == "administrator"
    assert len(data1["session_token"]) > 0

    # Login with UserPassword123!
    resp2 = client.post(
        "/v1/auth/login",
        json={"email": "arungaming1973@gmail.com", "password": "UserPassword123!"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["role"] == "administrator"
    assert len(data2["session_token"]) > 0


def test_seed_institutional_users_with_super_admin_capability(db_session):
    """Verify super_admin capability when requested."""
    user = seed_institutional_users(db_session, grant_super_admin=True)
    roles = get_user_roles(user, db_session)
    assert "administrator" in roles
    assert "super_admin" in roles
