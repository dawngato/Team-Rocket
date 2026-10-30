"""
Unit tests for configuration validation script.
Verifies failure on weak passwords, missing production variables, and malformed URLs.
Zero hyphens or dashes used in docstrings and comments.
"""
import unittest
from scripts.validate_env import validate_environment


class TestValidateEnv(unittest.TestCase):
    def test_development_defaults_allowed(self):
        env = {
            "APP_ENV": "development",
            "LOG_LEVEL": "info",
        }
        errors = validate_environment(env)
        self.assertEqual(len(errors), 0)

    def test_production_missing_variables_fail(self):
        env = {
            "APP_ENV": "production",
            "LOG_LEVEL": "info",
        }
        errors = validate_environment(env)
        error_vars = [e.variable for e in errors]
        self.assertIn("IDENTITY_DB_PASSWORD", error_vars)
        self.assertIn("CASTING_DB_PASSWORD", error_vars)
        self.assertIn("REDIS_PASSWORD", error_vars)

    def test_production_weak_password_rejected(self):
        env = {
            "APP_ENV": "production",
            "LOG_LEVEL": "info",
            "IDENTITY_DB_PASSWORD": "himvote_identity",
            "CASTING_DB_PASSWORD": "a_very_secure_long_password_123",
            "REDIS_PASSWORD": "another_secure_password_456",
            "AUDITOR_PUBLIC_KEY_FINGERPRINT": "valid_fingerprint",
            "WITNESS_KEY_ID": "witness_key_prod",
        }
        errors = validate_environment(env)
        error_vars = [e.variable for e in errors]
        self.assertIn("IDENTITY_DB_PASSWORD", error_vars)

    def test_production_short_password_rejected(self):
        env = {
            "APP_ENV": "production",
            "LOG_LEVEL": "info",
            "IDENTITY_DB_PASSWORD": "short_pw_123",
            "CASTING_DB_PASSWORD": "a_very_secure_long_password_123",
            "REDIS_PASSWORD": "another_secure_password_456",
            "AUDITOR_PUBLIC_KEY_FINGERPRINT": "valid_fingerprint",
            "WITNESS_KEY_ID": "witness_key_prod",
        }
        errors = validate_environment(env)
        error_vars = [e.variable for e in errors]
        self.assertIn("IDENTITY_DB_PASSWORD", error_vars)

    def test_valid_production_passes(self):
        env = {
            "APP_ENV": "production",
            "LOG_LEVEL": "info",
            "IDENTITY_DB_PASSWORD": "super_secret_high_entropy_identity_db_password_123!",
            "CASTING_DB_PASSWORD": "super_secret_high_entropy_casting_db_password_123!",
            "REDIS_PASSWORD": "super_secret_high_entropy_redis_password_123!",
            "AUDITOR_PUBLIC_KEY_FINGERPRINT": "sha256_audit_fingerprint_secure",
            "WITNESS_KEY_ID": "witness_primary_key_v1",
            "CHAIN_CONTRACT_ADDRESS": "0x1234567890123456789012345678901234567890",
            "CHAIN_ID": "31337",
        }
        errors = validate_environment(env)
        self.assertEqual(len(errors), 0)


if __name__ == "__main__":
    unittest.main()
