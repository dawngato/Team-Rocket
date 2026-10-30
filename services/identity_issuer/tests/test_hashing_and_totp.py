"""
Unit tests for Argon2id password hashing and TOTP multi factor authentication.
"""

import pyotp
from services.identity_issuer.crypto.hashing import (
    hash_password,
    verify_password,
    get_default_argon2_parameters,
    dummy_verify,
)
from services.identity_issuer.crypto.totp import (
    generate_totp_secret,
    get_totp_uri,
    verify_totp,
)


def test_argon2id_hashing_and_verification():
    """Verify Argon2id password hashing, recorded parameters, and verification."""
    password = "CorrectHorseBatteryStaple2026!"
    pwd_hash, params = hash_password(password)

    assert pwd_hash.startswith("$argon2id$")
    assert params["algorithm"] == "argon2id"
    assert params["memory_cost"] == 65536
    assert params["time_cost"] == 3

    assert verify_password(pwd_hash, password) is True
    assert verify_password(pwd_hash, "WrongPassword123") is False


def test_argon2id_dummy_verify():
    """Verify dummy verification executes without raising exceptions."""
    dummy_verify()


def test_totp_generation_and_validation():
    """Verify TOTP secret generation, URI construction, and token validation."""
    secret = generate_totp_secret()
    assert len(secret) == 32

    uri = get_totp_uri(secret, "admin@himvote.ac.in", issuer="HimVote")
    assert uri.startswith("otpauth://totp/HimVote:")
    assert "admin" in uri and "himvote.ac.in" in uri

    totp = pyotp.TOTP(secret)
    current_token = totp.now()

    assert verify_totp(secret, current_token) is True
    assert verify_totp(secret, "000000") is False
    assert verify_totp("", current_token) is False
