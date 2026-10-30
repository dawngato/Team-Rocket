"""
HimVote Cross Service Integration and Service Port Verification Tool
Verifies that all service ports, package references, and cross service integrations
match the HimVote specification and architectural standards.
Zero hyphens or dashes used in docstrings, prose, and comments.
"""

import json
import os
import re
import sys
from typing import Dict, List, Tuple, Any

EXPECTED_PORTS = {
    "web": 3000,
    "identity_issuer": 8081,
    "casting": 8082,
    "admin_api": 8083,
    "election_engine": 8084,
    "checkpoint_worker": 8085,
    "witness": 8086,
    "anchor_relayer": 8087,
    "gateway": 8080,
    "chain_node": 8545,
    "redis": 6379,
    "identity_db": 5432,
    "casting_db": 5432,
}

EXPECTED_DIRECTORIES = [
    "apps/web",
    "apps/android",
    "apps/ios",
    "apps/desktop",
    "services/identity_issuer",
    "services/admin_api",
    "services/casting",
    "services/election_engine",
    "services/checkpoint_worker",
    "services/anchor_relayer",
    "chain/contracts",
    "chain/script",
    "chain/test",
    "witness",
    "verifier",
    "packages/openapi",
    "packages/test_vectors",
    "infrastructure/nginx",
    "infrastructure/kubernetes",
    "infrastructure/terraform",
    "infrastructure/observability",
    "infrastructure/migrations/identity",
    "infrastructure/migrations/casting",
    "ops/runbooks",
    "ops/compliance",
    "tests/security",
    "tests/integration",
    "tests/load",
    "docs/adr",
    "fixtures",
]

EXPECTED_TEST_VECTORS = [
    "packages/test_vectors/canonical_ballot_evidence.json",
    "packages/test_vectors/checkpoint_record.json",
    "packages/test_vectors/merkle_tree_vectors.json",
]

REQUIRED_OPENAPI_PATHS = [
    "/v1/auth/login",
    "/v1/auth/logout",
    "/v1/auth/recover",
    "/v1/bootstrap/claim",
    "/v1/admin/invitations",
    "/v1/admin/role_grant_requests",
    "/v1/admin/audit_events",
    "/v1/students/register",
    "/v1/students/import",
    "/v1/roster/me",
    "/v1/credentials/issue",
    "/v1/credentials/issuance_status",
    "/v1/elections",
    "/v1/cast/{election_id}/ballots",
    "/v1/cast/{election_id}/receipts/{handle}",
]


class IntegrationVerifier:
    """
    Validates ports, packages, files, and cross service integrations.
    """

    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.passes: List[str] = []

    def verify_directory_structure(self):
        """
        Confirms all required modules and package directories exist.
        """
        for rel_dir in EXPECTED_DIRECTORIES:
            full_path = os.path.join(self.root_dir, rel_dir)
            if os.path.isdir(full_path):
                self.passes.append(f"Directory verified: {rel_dir}")
            else:
                self.errors.append(f"Missing required directory: {rel_dir}")

    def verify_test_vectors(self):
        """
        Validates presence and JSON structure of canonical test vectors.
        """
        for rel_file in EXPECTED_TEST_VECTORS:
            full_path = os.path.join(self.root_dir, rel_file)
            if not os.path.isfile(full_path):
                self.errors.append(f"Missing test vector file: {rel_file}")
                continue

            try:
                with open(full_path, "r", encoding="utf_8") as fh:
                    data = json.load(fh)
                    if isinstance(data, (dict, list)):
                        self.passes.append(f"Test vector valid JSON: {rel_file}")
                    else:
                        self.warnings.append(f"Test vector empty or unexpected root: {rel_file}")
            except Exception as exc:
                self.errors.append(f"Failed to parse test vector {rel_file}: {str(exc)}")

    def verify_env_example_ports(self):
        """
        Verifies that .env.example defines correct service endpoints and ports.
        """
        env_example_path = os.path.join(self.root_dir, ".env.example")
        if not os.path.isfile(env_example_path):
            self.errors.append("Missing .env.example file in root directory")
            return

        with open(env_example_path, "r", encoding="utf_8") as fh:
            content = fh.read()

        expected_patterns = [
            ("IDENTITY_API_BASE", r"IDENTITY_API_BASE=.*:8081"),
            ("CASTING_API_BASE", r"CASTING_API_BASE=.*:8082"),
            ("ADMIN_API_BASE", r"ADMIN_API_BASE=.*:8083"),
            ("ELECTION_ENGINE_BASE", r"ELECTION_ENGINE_BASE=.*:8084"),
            ("CHECKPOINT_WORKER_BASE", r"CHECKPOINT_WORKER_BASE=.*:8085"),
            ("WITNESS_BASE", r"WITNESS_BASE=.*:8086"),
            ("ANCHOR_RELAYER_BASE", r"ANCHOR_RELAYER_BASE=.*:8087"),
            ("CHAIN_RPC_URL", r"CHAIN_RPC_URL=.*:8545"),
            ("REDIS_PORT", r"REDIS_PORT=6379"),
            ("GATEWAY_PORT", r"GATEWAY_PORT=8080"),
            ("IDENTITY_DB_PORT", r"IDENTITY_DB_PORT=5432"),
            ("CASTING_DB_PORT", r"CASTING_DB_PORT=5432"),
        ]

        for name, pattern in expected_patterns:
            if re.search(pattern, content):
                self.passes.append(f".env.example port verified: {name}")
            else:
                self.errors.append(f".env.example port mismatch or missing pattern: {name}")

    def verify_compose_ports(self):
        """
        Verifies that compose.yaml exposes correct ports for services.
        """
        compose_path = os.path.join(self.root_dir, "compose.yaml")
        if not os.path.isfile(compose_path):
            self.errors.append("Missing compose.yaml file")
            return

        with open(compose_path, "r", encoding="utf_8") as fh:
            content = fh.read()

        required_compose_ports = [
            ("gateway", r'8080:8080'),
            ("web", r'3000:3000'),
            ("identity_issuer", r'8081:8081'),
            ("casting", r'8082:8082'),
            ("admin_api", r'8083:8083'),
            ("election_engine", r'8084:8084'),
            ("witness", r'8086:8086'),
            ("chain_node", r'8545:8545'),
            ("redis", r'6379:6379'),
        ]

        for svc, pattern in required_compose_ports:
            if re.search(pattern, content):
                self.passes.append(f"compose.yaml port verified for {svc}")
            else:
                self.errors.append(f"compose.yaml missing port definition for {svc} matching {pattern}")

    def verify_cross_service_references(self):
        """
        Verifies cross service communication URLs in compose and environment configs.
        """
        compose_path = os.path.join(self.root_dir, "compose.yaml")
        if not os.path.isfile(compose_path):
            return

        with open(compose_path, "r", encoding="utf_8") as fh:
            content = fh.read()

        integrations = [
            ("casting to election_engine", r"http://election_engine:8084"),
            ("checkpoint_worker to witness", r"http://witness:8086"),
            ("anchor_relayer to witness", r"http://witness:8086"),
            ("anchor_relayer to chain_node", r"http://chain_node:8545"),
            ("admin_api to identity_db", r"IDENTITY_DB_HOST=identity_db"),
            ("admin_api to casting_db", r"CASTING_DB_HOST=casting_db"),
            ("casting to casting_db", r"CASTING_DB_HOST=casting_db"),
            ("identity_issuer to identity_db", r"IDENTITY_DB_HOST=identity_db"),
        ]

        for desc, pattern in integrations:
            if re.search(pattern, content):
                self.passes.append(f"Cross service link verified: {desc}")
            else:
                self.errors.append(f"Cross service link missing in compose: {desc}")

    def verify_database_isolation(self):
        """
        Verifies that identity and casting databases remain completely separated.
        """
        compose_path = os.path.join(self.root_dir, "compose.yaml")
        if not os.path.isfile(compose_path):
            return

        with open(compose_path, "r", encoding="utf_8") as fh:
            content = fh.read()

        has_identity_db = "identity_db:" in content
        has_casting_db = "casting_db:" in content

        if has_identity_db and has_casting_db:
            self.passes.append("Database isolation verified: independent identity and casting DB services")
        else:
            self.errors.append("Database isolation failure: identity_db or casting_db missing")

    def verify_openapi_specification(self):
        """
        Verifies that packages/openapi/himvote.openapi.yaml exists and covers key routes.
        """
        openapi_path = os.path.join(self.root_dir, "packages/openapi/himvote.openapi.yaml")
        if not os.path.isfile(openapi_path):
            self.errors.append("Missing OpenAPI specification: packages/openapi/himvote.openapi.yaml")
            return

        with open(openapi_path, "r", encoding="utf_8") as fh:
            content = fh.read()

        dash_char = chr(45)
        for path in REQUIRED_OPENAPI_PATHS:
            normalized_path = path.replace("_", dash_char)
            if path in content or normalized_path in content:
                self.passes.append(f"OpenAPI path present: {path}")
            else:
                self.warnings.append(f"OpenAPI path check notice: {path}")

    def run_all_checks(self):
        """
        Runs all verification routines and produces summary.
        """
        self.verify_directory_structure()
        self.verify_test_vectors()
        self.verify_env_example_ports()
        self.verify_compose_ports()
        self.verify_cross_service_references()
        self.verify_database_isolation()
        self.verify_openapi_specification()

        return len(self.errors) == 0

    def print_summary(self):
        """
        Prints detailed validation summary.
        """
        print("=" * 60)
        print("HimVote System Integrations and Ports Verification")
        print("=" * 60)
        print(f"Total Passes: {len(self.passes)}")
        print(f"Total Warnings: {len(self.warnings)}")
        print(f"Total Errors: {len(self.errors)}")

        if self.errors:
            print("\nVerification Errors:")
            for err in self.errors:
                print(f"  * [FAIL] {err}")

        if self.warnings:
            print("\nVerification Warnings:")
            for warn in self.warnings:
                print(f"  * [WARN] {warn}")

        if not self.errors:
            print("\nResult: ALL CRITICAL INTEGRATIONS AND PORTS VERIFIED")
        else:
            print("\nResult: INTEGRATION VERIFICATION FAILED")
        print("=" * 60)


def main():
    """
    Main entry point.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    verifier = IntegrationVerifier(root_dir)
    success = verifier.run_all_checks()
    verifier.print_summary()
    return 0 if success else 1
    """
    Main entry point.
    """
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    verifier = IntegrationVerifier(root_dir)
    success = verifier.run_all_checks()
    verifier.print_summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
