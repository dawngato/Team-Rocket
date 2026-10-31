"""
Unit tests for authentication, session handling, recovery, and TOTP MFA flows.
"""

import pyotp
from services.identity_issuer.models import User, MfaCredential, RoleDefinition, RoleAssignment
from services.identity_issuer.crypto.hashing import hash_password


def test_user_login_logout_and_session(client, db_session):
    """Verify password authentication, session token issuance, and logout."""
    pwd_hash, pwd_params = hash_password("SecretVoterPassword123!")
    user = User(
        external_id="VOTER_1001",
        email="voter1@institution.edu",
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
        mfa_enrolled=False,
    )
    db_session.add(user)
    db_session.commit()

    # Step 1: Successful login
    login_resp = client.post(
        "/v1/auth/login",
        json={"email": "voter1@institution.edu", "password": "SecretVoterPassword123!"},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert data["user_id"] == user.id
    assert data["mfa_required"] is False
    token = data["session_token"]
    assert len(token) > 0

    profile_resp = client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_resp.status_code == 200
    profile = profile_resp.json()
    assert profile["user_id"] == user.id
    assert profile["email"] == user.email
    assert profile["roles"] == []
    assert profile["scopes"] == []
    assert profile["mfa_authenticated"] is False

    # Step 2: Failed login with invalid password
    bad_login = client.post(
        "/v1/auth/login",
        json={"email": "voter1@institution.edu", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # Step 3: Logout terminates session
    logout_resp = client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["status"] == "logged_out"


def test_user_login_with_totp_mfa(client, db_session):
    """Verify login flow for user with enrolled TOTP multi factor authentication."""
    pwd_hash, pwd_params = hash_password("PrivilegedAdminPassword123!")
    user = User(
        external_id="ADMIN_2001",
        email="officer@institution.edu",
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
        mfa_enrolled=True,
    )
    db_session.add(user)
    db_session.flush()

    totp_secret = pyotp.random_base32()
    mfa_cred = MfaCredential(
        user_id=user.id,
        type="totp",
        secret_hash=totp_secret,
    )
    db_session.add(mfa_cred)
    db_session.commit()

    # Step 1: Login without MFA token returns mfa_required is True
    no_mfa_resp = client.post(
        "/v1/auth/login",
        json={"email": "officer@institution.edu", "password": "PrivilegedAdminPassword123!"},
    )
    assert no_mfa_resp.status_code == 200
    assert no_mfa_resp.json()["mfa_required"] is True
    assert no_mfa_resp.json()["session_token"] == ""

    # Step 2: Login with valid TOTP token succeeds
    valid_totp = pyotp.TOTP(totp_secret).now()
    mfa_login_resp = client.post(
        "/v1/auth/login",
        json={
            "email": "officer@institution.edu",
            "password": "PrivilegedAdminPassword123!",
            "mfa_token": valid_totp,
        },
    )
    assert mfa_login_resp.status_code == 200
    assert mfa_login_resp.json()["mfa_required"] is False
    assert len(mfa_login_resp.json()["session_token"]) > 0


def test_account_recovery_flow(client, db_session):
    """Verify local recovery token delivery, one time reset, and revocation."""
    pwd_hash, pwd_params = hash_password("RecoveryTestPass123!")
    user = User(
        external_id="REC_USER_1",
        email="recovery_user@institution.edu",
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
    )
    db_session.add(user)
    db_session.commit()

    resp = client.post(
        "/v1/auth/recover",
        json={"email": "recovery_user@institution.edu"},
    )
    assert resp.status_code == 202
    assert resp.json()["status"] == "recovery_initiated"
    recovery_token = resp.json()["development_token"]

    login_resp = client.post(
        "/v1/auth/login",
        json={"email": "recovery_user@institution.edu", "password": "RecoveryTestPass123!"},
    )
    assert login_resp.status_code == 200
    old_token = login_resp.json()["session_token"]

    reset_resp = client.post(
        "/v1/auth/reset",
        json={"token": recovery_token, "password": "RecoveryTestPass456!"},
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["sessions_revoked"] is True

    old_session_resp = client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {old_token}"},
    )
    assert old_session_resp.status_code == 401

    new_login_resp = client.post(
        "/v1/auth/login",
        json={"email": "recovery_user@institution.edu", "password": "RecoveryTestPass456!"},
    )
    assert new_login_resp.status_code == 200

    replay_resp = client.post(
        "/v1/auth/reset",
        json={"token": recovery_token, "password": "RecoveryTestPass789!"},
    )
    assert replay_resp.status_code == 400


def test_recovery_does_not_return_tokens_outside_development(client, db_session, monkeypatch):
    """Ensure production responses never expose recovery tokens in JSON."""
    from services.identity_issuer.routers import auth as auth_router

    pwd_hash, pwd_params = hash_password("RecoveryTestPass123!")
    user = User(
        external_id="REC_USER_2",
        email="recovery_user_2@institution.edu",
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
    )
    db_session.add(user)
    db_session.commit()

    monkeypatch.setattr(auth_router, "APP_ENV", "production")
    resp = client.post(
        "/v1/auth/recover",
        json={"email": "recovery_user_2@institution.edu"},
    )
    assert resp.status_code == 503
    assert "delivery is not configured" in resp.json()["detail"]


def test_identity_cors_rejects_untrusted_origin(client):
    """Credential origin CORS allows only configured origins."""
    response = client.options(
        "/v1/auth/login",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_rate_limiter_blocks_repeated_failed_logins(client, db_session):
    """Verify rate limiter blocks repeated failed logins with 429."""
    email = "ratelimit_victim@institution.edu"
    pwd_hash, pwd_params = hash_password("ValidPassword123!")
    user = User(
        external_id="RL_USER_1",
        email=email,
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
    )
    db_session.add(user)
    db_session.commit()

    # 5 failed attempts
    for _ in range(5):
        resp = client.post(
            "/v1/auth/login",
            json={"email": email, "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    # 6th attempt is throttled with 429 Too Many Requests
    blocked_resp = client.post(
        "/v1/auth/login",
        json={"email": email, "password": "ValidPassword123!"},
    )
    assert blocked_resp.status_code == 429
    assert "Too many" in blocked_resp.json()["detail"]
