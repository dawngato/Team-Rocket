"""
Argon2id password hashing with parameter tracking.
HimVote enforces Argon2id for all stored credentials.
"""

from typing import Dict, Any, Tuple
from argon2 import PasswordHasher
from argon2.low_level import Type
from ..config import (
    ARGON2_TIME_COST,
    ARGON2_MEMORY_COST,
    ARGON2_PARALLELISM,
    ARGON2_HASH_LEN,
    ARGON2_SALT_LEN,
)

hasher = PasswordHasher(
    time_cost=ARGON2_TIME_COST,
    memory_cost=ARGON2_MEMORY_COST,
    parallelism=ARGON2_PARALLELISM,
    hash_len=ARGON2_HASH_LEN,
    salt_len=ARGON2_SALT_LEN,
    type=Type.ID,
)


def get_default_argon2_parameters() -> Dict[str, Any]:
    """Return the recorded Argon2id parameters."""
    return {
        "algorithm": "argon2id",
        "time_cost": ARGON2_TIME_COST,
        "memory_cost": ARGON2_MEMORY_COST,
        "parallelism": ARGON2_PARALLELISM,
        "hash_len": ARGON2_HASH_LEN,
        "salt_len": ARGON2_SALT_LEN,
    }


def hash_password(password: str) -> Tuple[str, Dict[str, Any]]:
    """Hash plaintext password with Argon2id and return hash plus parameters."""
    pwd_hash = hasher.hash(password)
    params = get_default_argon2_parameters()
    return pwd_hash, params


def verify_password(hash_value: str, password: str) -> bool:
    """Verify password against stored Argon2id hash."""
    try:
        return hasher.verify(hash_value, password)
    except Exception:
        return False


def dummy_verify() -> None:
    """Run dummy hashing to mitigate timing leaks on invalid email lookups."""
    try:
        hasher.verify("$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy", "dummy")
    except Exception:
        pass
