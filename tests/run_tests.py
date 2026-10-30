"""
HimVote automated test suite runner.
Executes core integrity tests, protocol integration tests, and concurrency load tests.
Aggregates audit postconditions and generates compliance reports.
"""

import os
import sys
import pytest


def main() -> int:
    """Run test suite and enforce all postconditions."""
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(tests_dir)

    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    print("Running HimVote Automated Security and Integration Test Suite...")
    exit_code = pytest.main([tests_dir, "-q"])
    if exit_code == 0:
        print("All Section 12 automated security and protocol tests passed successfully.")
    else:
        print(f"Test suite encountered failures. Exit code: {exit_code}")
    return int(exit_code)


if __name__ == "__main__":
    sys.exit(main())
