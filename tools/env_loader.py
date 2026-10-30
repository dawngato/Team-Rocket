"""
HimVote Environment Loader and Configuration Validator
Provides utilities to load, inspect, validate, and export environment settings.
Zero dashes or hyphens used in docstrings and comments.
"""

import os
import sys
import re
from typing import Dict, List, Tuple, Any, Optional

REQUIRED_VARIABLES = [
    "APP_ENV",
    "APP_DEBUG",
    "APP_VERSION",
    "IDENTITY_API_BASE",
    "IDENTITY_DB_HOST",
    "IDENTITY_DB_PORT",
    "IDENTITY_DB_NAME",
    "IDENTITY_DB_USER",
    "IDENTITY_DB_PASSWORD",
    "IDENTITY_DB_SSL_MODE",
    "CASTING_API_BASE",
    "CASTING_DB_HOST",
    "CASTING_DB_PORT",
    "CASTING_DB_NAME",
    "CASTING_DB_USER",
    "CASTING_DB_PASSWORD",
    "CASTING_DB_SSL_MODE",
    "ADMIN_API_BASE",
    "ELECTION_ENGINE_BASE",
    "CHECKPOINT_WORKER_BASE",
    "WITNESS_BASE",
    "WITNESS_PUBLIC_KEY",
    "WITNESS_KEY_ID",
    "ANCHOR_RELAYER_BASE",
    "CHAIN_RPC_URL",
    "CHAIN_ID",
    "CHAIN_CONTRACT_ADDRESS",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
    "GATEWAY_HOST",
    "GATEWAY_PORT",
    "AUDITOR_PUBLIC_KEY_FINGERPRINT",
    "VERIFIER_PATH",
]

PORT_VARIABLES = [
    "IDENTITY_DB_PORT",
    "CASTING_DB_PORT",
    "REDIS_PORT",
    "GATEWAY_PORT",
]

URL_VARIABLES = [
    "IDENTITY_API_BASE",
    "CASTING_API_BASE",
    "ADMIN_API_BASE",
    "ELECTION_ENGINE_BASE",
    "CHECKPOINT_WORKER_BASE",
    "WITNESS_BASE",
    "ANCHOR_RELAYER_BASE",
    "CHAIN_RPC_URL",
]

BOOLEAN_VARIABLES = [
    "APP_DEBUG",
    "GATEWAY_TLS_ENABLED",
    "LOG_REDACTION_ENABLED",
    "BOOTSTRAP_ALLOWED",
]

DEV_DEFAULTS = {
    "APP_ENV": "local",
    "APP_DEBUG": "true",
    "APP_VERSION": "2.0.0",
    "IDENTITY_API_BASE": "http://localhost:8081",
    "IDENTITY_DB_HOST": "localhost",
    "IDENTITY_DB_PORT": "5432",
    "IDENTITY_DB_NAME": "himvote_identity",
    "IDENTITY_DB_USER": "himvote_identity",
    "IDENTITY_DB_PASSWORD": "himvote_identity_dev_password",
    "IDENTITY_DB_SSL_MODE": "disable",
    "CASTING_API_BASE": "http://localhost:8082",
    "CASTING_DB_HOST": "localhost",
    "CASTING_DB_PORT": "5433",
    "CASTING_DB_NAME": "himvote_casting",
    "CASTING_DB_USER": "himvote_casting",
    "CASTING_DB_PASSWORD": "himvote_casting_dev_password",
    "CASTING_DB_SSL_MODE": "disable",
    "ADMIN_API_BASE": "http://localhost:8083",
    "ELECTION_ENGINE_BASE": "http://localhost:8084",
    "CHECKPOINT_WORKER_BASE": "http://localhost:8085",
    "WITNESS_BASE": "http://localhost:8086",
    "WITNESS_PUBLIC_KEY": "dev_witness_public_key_hex_placeholder",
    "WITNESS_KEY_ID": "local_witness_key",
    "ANCHOR_RELAYER_BASE": "http://localhost:8087",
    "ANCHOR_RELAYER_KEY_ID": "local_relayer_key",
    "ANCHOR_RELAYER_SPENDING_LIMIT": "1000000000000000000",
    "CHAIN_RPC_URL": "http://localhost:8545",
    "CHAIN_ID": "31337",
    "CHAIN_CONTRACT_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "CHAIN_CODE_HASH": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "CHAIN_FINALITY_CONFIRMATIONS": "1",
    "REDIS_HOST": "localhost",
    "REDIS_PORT": "6379",
    "REDIS_PASSWORD": "himvote_redis_dev_secret",
    "GATEWAY_HOST": "localhost",
    "GATEWAY_PORT": "8080",
    "GATEWAY_TLS_ENABLED": "false",
    "CORS_ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:8080",
    "OIDC_ISSUER_URL": "https://auth.university.example.ac.in",
    "OIDC_CLIENT_ID": "himvote_university_client",
    "OIDC_CLIENT_SECRET": "university_oidc_dev_secret",
    "SAML_METADATA_URL": "https://auth.university.example.ac.in/saml/metadata",
    "MFA_ISSUER": "HimVote",
    "MFA_WINDOW": "1",
    "MFA_RATE_LIMIT": "5",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317",
    "LOG_LEVEL": "info",
    "LOG_REDACTION_ENABLED": "true",
    "BOOTSTRAP_ALLOWED": "true",
    "KMS_PROVIDER": "local",
    "KMS_KEY_RING": "himvote_dev_keyring",
    "KMS_KEY_LOCATION": "local",
    "KMS_KEY_RING_ID": "himvote_dev_ring_id",
    "AUDITOR_PUBLIC_KEY_FINGERPRINT": "SHA256_AUDITOR_FINGERPRINT_DEV_KEY",
    "AUDITOR_PUBLIC_KEY": "dev_auditor_public_key_hex",
    "TRUST_PINS_PATH": "./fixtures/trust_pins_dev.json",
    "VERIFIER_PATH": "./verifier/verify.py",
    "VERIFIER_SHA256": "dev_verifier_sha256_hash",
    "DESKTOP_CODE_SIGN_CERT": "dev_certificate_placeholder",
    "DESKTOP_UPDATE_CHANNEL": "dev",
    "ANDROID_SIGNING_KEYSTORE": "dev_keystore.jks",
    "ANDROID_SIGNING_ALIAS": "himvote_dev",
    "ANDROID_PLAY_INTEGRITY_KEY": "dev_play_integrity_key",
    "IOS_TEAM_ID": "TEAM123456",
    "IOS_CODE_SIGN_IDENTITY": "Apple Development",
    "ELECTION_MIN_ANONYMOUS_TURNOUT": "10",
    "ELECTION_PRIVACY_LIMITED_THRESHOLD": "5",
    "WITNESS_LAG_TOLERANCE_SECONDS": "60",
    "ANCHOR_FINALITY_CONFIRMATIONS": "1",
    "ISSUANCE_WINDOW_START": "2026_11_01T00:00:00Z",
    "ISSUANCE_WINDOW_CUTOFF": "2026_11_02T00:00:00Z",
    "ELECTION_OPEN_AT_UTC": "2026_11_02T01:00:00Z",
    "ELECTION_CLOSE_AT_UTC": "2026_11_03T01:00:00Z",
}


def parse_env_file(filepath: str):
    """
    Parse a key value env file into a dictionary.
    Ignores empty lines and comments starting with number sign.
    """
    env_vars: Dict[str, str] = {}
    if not os.path.isfile(filepath):
        return env_vars

    with open(filepath, "r", encoding="utf_8") as fh:
        for line in fh:
            line_clean = line.strip()
            if not line_clean or line_clean.startswith("#"):
                continue
            if "=" in line_clean:
                key, val = line_clean.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"\'')
                env_vars[key] = val
    return env_vars


def load_environment(filepath: Optional[str] = None, override: bool = False):
    """
    Load environment variables from file into os.environ.
    Returns the dictionary of loaded variables.
    """
    if filepath is None:
        possible_paths = [
            os.path.join(os.getcwd(), ".env"),
            os.path.join(os.getcwd(), "HimVote", ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
        ]
        for p in possible_paths:
            if os.path.isfile(p):
                filepath = os.path.abspath(p)
                break

    if not filepath or not os.path.isfile(filepath):
        return {}

    loaded = parse_env_file(filepath)
    for key, val in loaded.items():
        if override or key not in os.environ:
            os.environ[key] = val
    return loaded


def validate_environment(
    env_dict: Optional[Dict[str, str]] = None,
    example_path: Optional[str] = None,
):
    """
    Validates provided environment dictionary or active os.environ.
    Returns tuple of success flag, error list, and warning list.
    """
    if env_dict is None:
        env_dict = dict(os.environ)

    errors: List[str] = []
    warnings: List[str] = []

    # Check required variables
    for req in REQUIRED_VARIABLES:
        if req not in env_dict or not env_dict[req]:
            errors.append(f"Missing required environment variable: {req}")
        elif "CHANGE_ME" in env_dict[req]:
            warnings.append(f"Variable {req} contains placeholder value: {env_dict[req]}")

    # Check port formats
    for port_var in PORT_VARIABLES:
        val = env_dict.get(port_var)
        if val:
            try:
                num = int(val)
                if num < 1 or num > 65535:
                    errors.append(f"Variable {port_var} has out of range port: {val}")
            except ValueError:
                errors.append(f"Variable {port_var} must be an integer: {val}")

    # Check boolean variables
    for bool_var in BOOLEAN_VARIABLES:
        val = env_dict.get(bool_var)
        if val and val.lower() not in ["true", "false", "0", "1"]:
            warnings.append(f"Variable {bool_var} should be boolean true or false, got: {val}")

    # Check URL formats
    url_pattern = re.compile(r"^https?://[^\s/:]+(?::\d+)?(?:/.*)?$")
    for url_var in URL_VARIABLES:
        val = env_dict.get(url_var)
        if val and not val.startswith("CHANGE_ME"):
            if not url_pattern.match(val):
                warnings.append(f"Variable {url_var} does not match expected URL structure: {val}")

    success = len(errors) == 0
    return success, errors, warnings


def generate_dev_env(target_path: str, overwrite: bool = False):
    """
    Generates a developer .env file populated with local testing defaults.
    """
    if os.path.exists(target_path) and not overwrite:
        print(f"Target file already exists: {target_path}")
        return False

    with open(target_path, "w", encoding="utf_8") as fh:
        fh.write("# HimVote local development configuration\n")
        fh.write("# Generated automatically for local verification\n\n")
        for key, val in DEV_DEFAULTS.items():
            fh.write(f"{key}={val}\n")

    print(f"Generated development environment at: {target_path}")
    return True


def print_report(success: bool, errors: List[str], warnings: List[str]):
    """
    Print validation results to console.
    """
    print("=" * 60)
    print("HimVote Environment Validation Report")
    print("=" * 60)
    print(f"Overall Status: {'PASSED' if success else 'FAILED'}")
    print(f"Errors count: {len(errors)}")
    print(f"Warnings count: {len(warnings)}")

    if errors:
        print("\nErrors:")
        for err in errors:
            print(f"  * [ERROR] {err}")

    if warnings:
        print("\nWarnings:")
        for warn in warnings:
            print(f"  * [WARN] {warn}")

    print("=" * 60)


def main():
    """
    CLI entry point for developer tools.
    """
    args = sys.argv[1:]
    command = args[0] if args else "check"

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env_file = os.path.join(base_dir, ".env")
    example_file = os.path.join(base_dir, ".env.example")

    if command == "generate_dev":
        success = generate_dev_env(env_file, overwrite=True)
        return 0 if success else 1

    if command in ["check", "validate"]:
        target_to_read = env_file if os.path.isfile(env_file) else example_file
        print(f"Validating configuration source: {target_to_read}")
        env_data = parse_env_file(target_to_read)
        success, errors, warnings = validate_environment(env_data, example_file)
        print_report(success, errors, warnings)
        return 0 if success else 1

    print(f"Unknown command: {command}")
    print("Available commands: check, validate, generate_dev")
    return 1


if __name__ == "__main__":
    sys.exit(main())
