"""
Unit tests for HimVote cross service integration verification tool.
Validates verifier checks on directory structure, ports, and configuration files.
Zero hyphens or dashes used in docstrings and comments.
"""

import os
import unittest
from tools.verify_integrations import (
    IntegrationVerifier,
    EXPECTED_PORTS,
    EXPECTED_DIRECTORIES,
    EXPECTED_TEST_VECTORS,
)


class TestIntegrationVerifier(unittest.TestCase):
    """
    Test suite for IntegrationVerifier class.
    """

    def setUp(self):
        """
        Setup root directory reference.
        """
        self.root_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..")
        )
        self.verifier = IntegrationVerifier(self.root_dir)

    def test_expected_ports_dictionary(self):
        """
        Confirms canonical port assignments match the architecture specification.
        """
        self.assertEqual(EXPECTED_PORTS["gateway"], 8080)
        self.assertEqual(EXPECTED_PORTS["web"], 3000)
        self.assertEqual(EXPECTED_PORTS["identity_issuer"], 8081)
        self.assertEqual(EXPECTED_PORTS["casting"], 8082)
        self.assertEqual(EXPECTED_PORTS["admin_api"], 8083)
        self.assertEqual(EXPECTED_PORTS["election_engine"], 8084)
        self.assertEqual(EXPECTED_PORTS["checkpoint_worker"], 8085)
        self.assertEqual(EXPECTED_PORTS["witness"], 8086)
        self.assertEqual(EXPECTED_PORTS["anchor_relayer"], 8087)
        self.assertEqual(EXPECTED_PORTS["chain_node"], 8545)
        self.assertEqual(EXPECTED_PORTS["redis"], 6379)
        self.assertEqual(EXPECTED_PORTS["identity_db"], 5432)
        self.assertEqual(EXPECTED_PORTS["casting_db"], 5432)

    def test_expected_directories_present(self):
        """
        Confirms all architectural directories exist in workspace.
        """
        for rel_dir in EXPECTED_DIRECTORIES:
            full_path = os.path.join(self.root_dir, rel_dir)
            self.assertTrue(
                os.path.isdir(full_path),
                f"Required directory must exist: {rel_dir}",
            )

    def test_expected_test_vectors_present(self):
        """
        Confirms all canonical test vectors exist.
        """
        for rel_file in EXPECTED_TEST_VECTORS:
            full_path = os.path.join(self.root_dir, rel_file)
            self.assertTrue(
                os.path.isfile(full_path),
                f"Test vector file must exist: {rel_file}",
            )

    def test_run_all_checks_passes(self):
        """
        Confirms full verification suite passes on current repository state.
        """
        success = self.verifier.run_all_checks()
        self.assertTrue(success, f"Verification failed with errors: {self.verifier.errors}")
        self.assertEqual(len(self.verifier.errors), 0)


if __name__ == "__main__":
    unittest.main()
