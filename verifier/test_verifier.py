"""
Unit tests for HimVote verifier CLI module.
"""

from pathlib import Path
import sys
import hashlib
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from verifier.verify import (
    EXIT_PASS,
    EXIT_CRYPTO_FAIL,
    EXIT_UNVERIFIABLE,
    EXIT_BAD_ARCHIVE,
    ALL_PROPERTIES,
    canonicalize_json,
    compute_rfc9162_merkle_root,
    format_digest,
    safe_json_loads,
    main,
)


def test_verifier_properties_definition():
    """Verify that all expected audit properties are present."""
    assert len(ALL_PROPERTIES) == 11
    assert "RECORD_INTEGRITY" in ALL_PROPERTIES
    assert "CREDENTIAL_UNIQUENESS" in ALL_PROPERTIES
    assert "ROSTER_ATTESTATION" in ALL_PROPERTIES


def test_verifier_canonicalize_json():
    """Verify RFC 8785 canonical JSON formatting."""
    data = {"b": 2, "a": 1}
    canon = canonicalize_json(data)
    assert canon == b'{"a":1,"b":2}'


def test_verifier_compute_empty_merkle_root():
    """Verify RFC 9162 empty tree hash."""
    empty_root = compute_rfc9162_merkle_root([])
    assert len(empty_root) == 32


def test_verifier_format_digest():
    """Verify digest formatting."""
    raw = b"\x00" * 32
    expected = f"sha256:{hashlib.sha256(raw).hexdigest()}"
    digest = format_digest(raw)
    assert digest == expected


def test_verifier_safe_json_loads():
    """Verify safe JSON loading."""
    result = safe_json_loads('{"status": "ok"}')
    assert result == {"status": "ok"}
