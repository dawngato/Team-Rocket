"""
Unit tests for HimVote environment loader tool.
Validates parser, environment loading, format checking, and dev generator.
Zero hyphens or dashes used in docstrings and comments.
"""

import os
import tempfile
import unittest
from tools.env_loader import (
    parse_env_file,
    validate_environment,
    generate_dev_env,
    DEV_DEFAULTS,
)


class TestEnvironmentLoader(unittest.TestCase):
    """
    Test suite for env_loader module functions.
    """

    def test_parse_env_file_basic(self):
        """
        Tests parsing key value pairs from text file.
        """
        content = "APP_ENV=staging\nGATEWAY_PORT=8080\n# comment line\n\nAPP_DEBUG=true\n"
        with tempfile.NamedTemporaryFile("w", delete=False) as tf:
            tf.write(content)
            temp_name = tf.name

        try:
            parsed = parse_env_file(temp_name)
            self.assertEqual(parsed.get("APP_ENV"), "staging")
            self.assertEqual(parsed.get("GATEWAY_PORT"), "8080")
            self.assertEqual(parsed.get("APP_DEBUG"), "true")
            self.assertNotIn("# comment line", parsed)
        finally:
            if os.path.exists(temp_name):
                os.remove(temp_name)

    def test_validate_environment_complete(self):
        """
        Tests validation with complete development configuration.
        """
        success, errors, warnings = validate_environment(DEV_DEFAULTS)
        self.assertTrue(success)
        self.assertEqual(len(errors), 0)

    def test_validate_environment_missing_keys(self):
        """
        Tests validation when mandatory keys are missing.
        """
        partial_config = {"APP_ENV": "local"}
        success, errors, warnings = validate_environment(partial_config)
        self.assertFalse(success)
        self.assertGreater(len(errors), 0)

    def test_validate_environment_invalid_port(self):
        """
        Tests validation when a port is not a valid integer.
        """
        bad_port_config = dict(DEV_DEFAULTS)
        bad_port_config["GATEWAY_PORT"] = "999999"
        success, errors, warnings = validate_environment(bad_port_config)
        self.assertFalse(success)
        found_port_error = any("GATEWAY_PORT" in err for err in errors)
        self.assertTrue(found_port_error)

    def test_generate_dev_env(self):
        """
        Tests automated generation of developer env file.
        """
        with tempfile.NamedTemporaryFile("w", delete=False) as tf:
            target_path = tf.name

        try:
            generated = generate_dev_env(target_path, overwrite=True)
            self.assertTrue(generated)
            parsed = parse_env_file(target_path)
            self.assertEqual(parsed.get("APP_ENV"), "local")
            self.assertEqual(parsed.get("GATEWAY_PORT"), "8080")
        finally:
            if os.path.exists(target_path):
                os.remove(target_path)


if __name__ == "__main__":
    unittest.main()
