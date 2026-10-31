"""
Configuration module for HimVote Identity Issuer service.
Production grade settings using pydantic or environment variables.
"""

import os
from pathlib import Path
from sqlalchemy.engine import URL

# Base directories
BASE_DIR = Path(__file__).resolve().parent

# Production configuration must be explicit. Development defaults are kept only
# for the local fixture stack and are rejected by the bootstrap route when the
# invitation token is missing.
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

# Database configuration. Compose supplies the individual IDENTITY_DB_* values;
# build the URL with SQLAlchemy so passwords containing URL punctuation remain
# valid. DATABASE_URL remains available for explicit deployments and tests.
_configured_database_url = os.getenv("DATABASE_URL", "").strip()
_identity_db_host = os.getenv("IDENTITY_DB_HOST", "").strip()
_identity_db_name = os.getenv("IDENTITY_DB_NAME", "").strip()
_identity_db_user = os.getenv("IDENTITY_DB_USER", "").strip()
_identity_database_url = ""

if _identity_db_host and _identity_db_name and _identity_db_user:
    _identity_database_url = URL.create(
        "postgresql+psycopg2",
        username=_identity_db_user,
        password=os.getenv("IDENTITY_DB_PASSWORD", ""),
        host=_identity_db_host,
        port=int(os.getenv("IDENTITY_DB_PORT", "5432")),
        database=_identity_db_name,
        query={"sslmode": os.getenv("IDENTITY_DB_SSL_MODE", "prefer")},
    ).render_as_string(hide_password=False)

if APP_ENV == "production" and not (_configured_database_url or _identity_database_url):
    raise RuntimeError(
        "DATABASE_URL or IDENTITY_DB_HOST, IDENTITY_DB_NAME, and IDENTITY_DB_USER "
        "must be explicitly configured in production"
    )

DATABASE_URL = (
    _configured_database_url
    or _identity_database_url
    or f"sqlite:///{BASE_DIR}/identity.db"
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
BOOTSTRAP_ADMIN_EMAIL = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "superadmin@hptu.ac.in").strip().lower()

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
ACTIVATION_DELIVERY_MODE = os.getenv("ACTIVATION_DELIVERY_MODE", "development").strip().lower()
ACTIVATION_EXPIRE_HOURS = int(os.getenv("ACTIVATION_EXPIRE_HOURS", "24"))
# Notification delivery is deliberately explicit. `configured` is accepted
# only when the selected transport and public action URL are present.
NOTIFICATION_PROVIDER = os.getenv("NOTIFICATION_PROVIDER", "none").strip().lower()
NOTIFICATION_FROM_EMAIL = os.getenv("NOTIFICATION_FROM_EMAIL", "").strip()
NOTIFICATION_PUBLIC_URL = os.getenv("NOTIFICATION_PUBLIC_URL", "").strip().rstrip("/")
NOTIFICATION_SMTP_HOST = os.getenv("NOTIFICATION_SMTP_HOST", "").strip()
NOTIFICATION_SMTP_PORT = int(os.getenv("NOTIFICATION_SMTP_PORT", "587"))
NOTIFICATION_SMTP_USERNAME = os.getenv("NOTIFICATION_SMTP_USERNAME", "").strip()
NOTIFICATION_SMTP_PASSWORD = os.getenv("NOTIFICATION_SMTP_PASSWORD", "")
NOTIFICATION_SMTP_STARTTLS = os.getenv("NOTIFICATION_SMTP_STARTTLS", "true").strip().lower() in {"1", "true", "yes"}
NOTIFICATION_WEBHOOK_URL = os.getenv("NOTIFICATION_WEBHOOK_URL", "").strip()
NOTIFICATION_WEBHOOK_TOKEN = os.getenv("NOTIFICATION_WEBHOOK_TOKEN", "").strip()

# Cryptography and Key Management
ISSUER_KEY_ID = os.getenv("ISSUER_KEY_ID", "himvote_rsa_issuer_key_v1")
ISSUER_PRIVATE_KEY_PEM = os.getenv("ISSUER_PRIVATE_KEY_PEM", "")
if APP_ENV == "production" and not ISSUER_PRIVATE_KEY_PEM.strip():
    raise RuntimeError("ISSUER_PRIVATE_KEY_PEM must be provided by the production key custody system")
MFA_ISSUER = os.getenv("MFA_ISSUER", "HimVote")
REDIS_URL = os.getenv("REDIS_URL", "").strip() or None

# Argon2id parameters
ARGON2_TIME_COST = int(os.getenv("ARGON2_TIME_COST", "3"))
ARGON2_MEMORY_COST = int(os.getenv("ARGON2_MEMORY_COST", "65536"))
ARGON2_PARALLELISM = int(os.getenv("ARGON2_PARALLELISM", "4"))
ARGON2_HASH_LEN = int(os.getenv("ARGON2_HASH_LEN", "32"))
ARGON2_SALT_LEN = int(os.getenv("ARGON2_SALT_LEN", "16"))
