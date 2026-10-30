#!/usr/bin/env python3
"""
HimVote Environment Configuration Validator
===========================================

Validates configuration variables before service startup and deployment.
Ensures zero secret leakage: errors report variable names and criteria,
never secret contents or values.

Zero hyphens or dashes used in docstrings and comments.
"""
from __future__ import annotations

import os
import re
import sys
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

WEAK_PASSWORD_PATTERNS = {
    "himvote_identity",
    "himvote_casting",
    "himvote_redis",
    "change_me",
    "changeme",
    "password",
    "admin",
    "root",
    "123456",
    "12345678",
}

ETH_ADDRESS_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")


class ConfigValidationError:
    def __init__(self, variable: str, reason: str):
        self.variable = variable
        self.reason = reason

    def __str__(self) -> str:
        return f"Configuration Error [{self.variable}]: {self.reason}"


def validate_environment(env: Optional[Dict[str, str]] = None) -> List[ConfigValidationError]:
    """
    Validate environment dictionary. Defaults to os.environ if not provided.
    Returns list of validation errors.
    """
    if env is None:
        env = dict(os.environ)

    errors: List[ConfigValidationError] = []

    app_env = env.get("APP_ENV", env.get("ENVIRONMENT", "development")).lower().strip()
    is_production = app_env in {"production", "staging", "prod"}

    # Required variables across all environments
    required_always = [
        "LOG_LEVEL",
    ]

    # Required variables in production
    required_production = [
        "IDENTITY_DB_PASSWORD",
        "CASTING_DB_PASSWORD",
        "REDIS_PASSWORD",
        "AUDITOR_PUBLIC_KEY_FINGERPRINT",
        "WITNESS_KEY_ID",
    ]

    for var in required_always:
        if not env.get(var):
            errors.append(ConfigValidationError(var, "Variable is required and must not be empty"))

    if is_production:
        for var in required_production:
            val = env.get(var, "")
            if not val:
                errors.append(ConfigValidationError(var, "Variable is required in production environments"))
                continue

            # Check weak password
            val_lower = val.lower().strip()
            if val_lower in WEAK_PASSWORD_PATTERNS:
                errors.append(ConfigValidationError(var, "Value matches known weak or default password pattern"))

            # Check entropy / length
            if "PASSWORD" in var and len(val) < 16:
                errors.append(ConfigValidationError(var, "Production password must be at least 16 characters in length"))

    # Validate URLs if present
    url_vars = [
        "IDENTITY_API_BASE",
        "CASTING_API_BASE",
        "ADMIN_API_BASE",
        "WITNESS_BASE",
        "CHAIN_RPC_URL",
    ]

    for var in url_vars:
        val = env.get(var)
        if val:
            parsed = urlparse(val)
            if not parsed.scheme or not parsed.netloc:
                errors.append(ConfigValidationError(var, "Value is not a valid URL format"))
            elif is_production and parsed.scheme != "https" and not parsed.netloc.startswith(("localhost", "127.0.0.1", "chain_node", "identity_issuer", "casting", "witness")):
                errors.append(ConfigValidationError(var, "Production external URL must use HTTPS scheme"))

    # Validate Chain Contract Address if present
    contract_addr = env.get("CHAIN_CONTRACT_ADDRESS")
    if contract_addr and contract_addr not in {"CHANGE_ME", "0x0000000000000000000000000000000000000000"}:
        if not ETH_ADDRESS_PATTERN.match(contract_addr):
            errors.append(ConfigValidationError("CHAIN_CONTRACT_ADDRESS", "Must be a valid 20 byte hexadecimal address starting with 0x"))

    # Validate Chain ID if present
    chain_id = env.get("CHAIN_ID")
    if chain_id:
        try:
            cid = int(chain_id)
            if cid <= 0:
                errors.append(ConfigValidationError("CHAIN_ID", "Chain ID must be a positive integer"))
        except ValueError:
            errors.append(ConfigValidationError("CHAIN_ID", "Chain ID must be numeric"))

    return errors


def main() -> int:
    env_file = sys.argv[1] if len(sys.argv) > 1 else None
    target_env = dict(os.environ)

    if env_file and os.path.isfile(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    target_env[k.strip()] = v.strip().strip("'\"")

    errors = validate_environment(target_env)
    if errors:
        print(f"FAILED: {len(errors)} configuration validation error(s) detected:")
        for err in errors:
            print(f"  - {err}")
        return 1

    app_env = target_env.get("APP_ENV", target_env.get("ENVIRONMENT", "development"))
    print(f"SUCCESS: Environment configuration valid for tier [{app_env}].")
    return 0


if __name__ == "__main__":
    sys.exit(main())
