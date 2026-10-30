"""
Configuration module for HimVote Identity Issuer service.
Production grade settings using pydantic or environment variables.
"""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE_DIR}/identity.db",
)

# Bootstrap configuration
BOOTSTRAP_ALLOWED = os.getenv("BOOTSTRAP_ALLOWED", "true").lower() in ("true", "1", "yes")
BOOTSTRAP_INVITATION_TOKEN = os.getenv("BOOTSTRAP_INVITATION_TOKEN", "bootstrap_claim_token_initial_secret")

# Security and session configuration
SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", "8"))
RECOVERY_EXPIRE_HOURS = int(os.getenv("RECOVERY_EXPIRE_HOURS", "1"))
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
