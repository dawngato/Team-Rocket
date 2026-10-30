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
    """Verify account recovery initiation returns accepted status."""
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
