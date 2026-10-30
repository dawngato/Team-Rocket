"""
Structured test audit reporter matching Section 12.4 of prompt.md.
Records test ID, seed, manifest digest, engine version, verifier SHA256,
expected and actual results, database state summary, and postconditions.
Outputs reports to JSON and formats audit summaries.
"""

import hashlib
import json
import os
from typing import Any, Dict, List, Optional


def get_verifier_sha256() -> str:
    """Compute sha256 checksum of the verifier implementation file."""
    verifier_path = os.path.join(os.path.dirname(__file__), "verifier.py")
    if os.path.exists(verifier_path):
        with open(verifier_path, "rb") as f:
            return f"sha256:{hashlib.sha256(f.read()).hexdigest()}"
    return "sha256:unknown"


class AuditTestRecord:
    """Represents an execution record for a security or integration test."""

    def __init__(
        self,
        test_id: str,
        seed: int,
        manifest_digest: str,
        engine_version: str,
        expected_result: str,
        actual_result: str,
        database_state_summary: Dict[str, Any],
        postconditions: List[str],
        passed: bool,
        notes: str = ""
    ):
        self.test_id = test_id
        self.seed = seed
        self.manifest_digest = manifest_digest
        self.engine_version = engine_version
        self.verifier_sha256 = get_verifier_sha256()
        self.expected_result = expected_result
        self.actual_result = actual_result
        self.database_state_summary = database_state_summary
        self.postconditions = postconditions
        self.passed = passed
        self.notes = notes

    def to_dict(self) -> Dict[str, Any]:
        return {
            "test_id": self.test_id,
            "seed": self.seed,
            "manifest_digest": self.manifest_digest,
            "engine_version": self.engine_version,
            "verifier_sha256": self.verifier_sha256,
            "expected_result": self.expected_result,
            "actual_result": self.actual_result,
            "database_state_summary": self.database_state_summary,
            "postconditions": self.postconditions,
            "passed": self.passed,
            "notes": self.notes
        }

    def save_json(self, directory: str) -> str:
        """Save report to specified directory."""
        os.makedirs(directory, exist_ok=True)
        file_path = os.path.join(directory, f"{self.test_id}.json")
        with open(file_path, "w", encoding="utf_8") as f:
            json.dump(self.to_dict(), f, indent=2, sort_keys=True)
        return file_path
