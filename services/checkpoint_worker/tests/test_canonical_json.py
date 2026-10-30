"""
Unit tests for RFC 8785 Canonical JSON serialization.
"""

import hashlib
import pytest
from checkpoint_worker.crypto.canonical_json import (
    canonical_json,
    compute_canonical_digest,
)


def test_canonical_json_key_sorting():
    """
    Keys must be sorted strictly in UTF 16 code unit order.
    """
    input_data = {
        "z": 1,
        "a": "alpha",
        "m": {"delta": 4, "beta": 2},
    }
    canonical_bytes = canonical_json(input_data)
    expected_str = '{"a":"alpha","m":{"beta":2,"delta":4},"z":1}'
    assert canonical_bytes.decode("utf-8") == expected_str


def test_canonical_json_no_whitespace():
    """
    Whitespace around delimiters must be omitted.
    """
    input_data = {"key": [1, 2, 3], "flag": True, "value": None}
    canonical_bytes = canonical_json(input_data)
    assert b" " not in canonical_bytes
    assert b"\n" not in canonical_bytes
    assert b"\t" not in canonical_bytes


def test_canonical_json_disallow_floats():
    """
    Floating point numbers must raise TypeError per HimVote specification.
    """
    with pytest.raises(TypeError, match="disallowed"):
        canonical_json({"ratio": 3.14159})


def test_canonical_digest():
    """
    Digest computation must match direct SHA256 of canonical bytes.
    """
    data = {"election_id": "elec_123", "tree_size": 10}
    digest = compute_canonical_digest(data)
    expected_digest = hashlib.sha256(canonical_json(data)).hexdigest()
    assert digest == expected_digest


def test_canonical_json_invalid_types():
    """
    Non string keys or unsupported types must raise TypeError.
    """
    with pytest.raises(TypeError, match="must be strings"):
        canonical_json({123: "invalid_key"})

    with pytest.raises(TypeError, match="Unsupported data type"):
        canonical_json({"custom_obj": object()})

