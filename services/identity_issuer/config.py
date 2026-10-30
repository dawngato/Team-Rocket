"""
Configuration module for HimVote Identity Issuer service.
Production grade settings using pydantic or environment variables.
"""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent

# Production configuration must be explicit. Development defaults are kept only
# for the local fixture stack and are rejected by the bootstrap route when the
# invitation token is missing.
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR}/identity.db",
)

# Bootstrap configuration
BOOTSTRAP_ALLOWED = os.getenv(
    "BOOTSTRAP_ALLOWED",
    "true" if APP_ENV == "development" else "false",
).lower() in ("true", "1", "yes")
BOOTSTRAP_INVITATION_TOKEN = os.getenv(
    "BOOTSTRAP_INVITATION_TOKEN",
    "bootstrap_claim_token_initial_secret" if APP_ENV == "development" else "",
)

_configured_origins = os.getenv("IDENTITY_ALLOWED_ORIGINS")
ALLOWED_ORIGINS = [
    item.strip()
    for item in (
        _configured_origins
        if _configured_origins is not None
        else ("http://localhost:3000,http://127.0.0.1:3000" if APP_ENV != "production" else "")
    ).split(",")
    if item.strip()
]

# Security and session configuration
SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", "8"))
RECOVERY_EXPIRE_HOURS = int(os.getenv("RECOVERY_EXPIRE_HOURS", "1"))
# The development delivery mode returns a token only to the local test client.
# Production requires an external delivery adapter before this flow is enabled.
RECOVERY_DELIVERY_MODE = os.getenv("RECOVERY_DELIVERY_MODE", "development").strip().lower()
# Local development may return a one-time invitation token to the test/demo
# caller. Production requires a separately operated notification adapter.
INVITATION_DELIVERY_MODE = os.getenv("INVITATION_DELIVERY_MODE", "development").strip().lower()
INVITATION_EXPIRE_DAYS = int(os.getenv("INVITATION_EXPIRE_DAYS", "7"))

# Cryptography and Key Management
ISSUER_KEY_ID = os.getenv("ISSUER_KEY_ID", "himvote_rsa_issuer_key_v1")
ISSUER_PRIVATE_KEY_PEM = os.getenv("ISSUER_PRIVATE_KEY_PEM", "")
MFA_ISSUER = os.getenv("MFA_ISSUER", "HimVote")

# Argon2id parameters
ARGON2_TIME_COST = int(os.getenv("ARGON2_TIME_COST", "3"))
ARGON2_MEMORY_COST = int(os.getenv("ARGON2_MEMORY_COST", "65536"))
ARGON2_PARALLELISM = int(os.getenv("ARGON2_PARALLELISM", "4"))
ARGON2_HASH_LEN = int(os.getenv("ARGON2_HASH_LEN", "32"))
ARGON2_SALT_LEN = int(os.getenv("ARGON2_SALT_LEN", "16"))
