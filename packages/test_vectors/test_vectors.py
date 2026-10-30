"""
Unit tests executing golden test vectors verification.
"""

from pathlib import Path
import sys

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from packages.test_vectors.verify_vectors import verify_all


def test_golden_test_vectors():
    """Verify all golden test vectors RFC 8785, RFC 9162, and RFC 9474."""
    verify_all()
