"""Unit tests for RFC 8785 JSON Canonicalization Scheme (JCS)."""

import pytest
from himvote_crypto.exceptions import (
    DuplicateKeyError,
    FloatNotPermittedError,
    InvalidUnicodeError,
)
from himvote_crypto.jcs import (
    canonical_digest,
    canonical_digest_hex,
    canonicalize,
    canonicalize_json_string,
    loads,
)


def test_jcs_literal_primitives():
    """Verify serialization of JSON literal primitives null, true, false, and integers."""
    assert canonicalize(None) == b"null"
    assert canonicalize(True) == b"true"
    assert canonicalize(False) == b"false"
    assert canonicalize(0) == b"0"
    assert canonicalize(42) == b"42"
    assert canonicalize(-17) == b"-17"


def test_jcs_string_escaping_rules():
    """Verify string escaping adheres to RFC 8785 Section 3.2.2.2."""
    assert canonicalize("hello") == b'"hello"'
    assert canonicalize('quote: " and slash: \\') == b'"quote: \\" and slash: \\\\"'
    assert canonicalize("line1\nline2\ttab") == b'"line1\\nline2\\ttab"'
    assert canonicalize("form\ffeed\bback\rcarriage") == b'"form\\ffeed\\bback\\rcarriage"'
    assert canonicalize("\x00\x1f") == b'"\\u0000\\u001f"'
    assert canonicalize("forward / slash") == b'"forward / slash"'
    assert canonicalize("Unicode: \u20ac, \U0001f600") == "Unicode: \u20ac, \U0001f600".encode("utf-8").join([b'"', b'"'])


def test_jcs_unicode_lone_surrogate_rejection():
    """Verify that lone surrogates are rejected with InvalidUnicodeError."""
    with pytest.raises(InvalidUnicodeError):
        canonicalize("\ud800")
    with pytest.raises(InvalidUnicodeError):
        canonicalize("\udfff")


def test_jcs_utf16_code_unit_sorting():
    """Verify RFC 8785 Section 3.2.3 UTF_16 code unit property key sorting."""
    sample = {
        "\u20ac": "Euro Sign",
        "\r": "Carriage Return",
        "\ufb33": "Hebrew Letter Dalet With Dagesh",
        "1": "One",
        "\U0001f600": "Emoji: Grinning Face",
        "\u0080": "Control",
        "\u00f6": "Latin Small Letter O With Diaeresis",
    }
    canon_bytes = canonicalize(sample)
    expected_order = [
        "Carriage Return",
        "One",
        "Control",
        "Latin Small Letter O With Diaeresis",
        "Euro Sign",
        "Emoji: Grinning Face",
        "Hebrew Letter Dalet With Dagesh",
    ]
    parsed = loads(canon_bytes)
    assert list(parsed.values()) == expected_order


def test_jcs_strict_duplicate_key_rejection():
    """Verify that parsing JSON with duplicate keys raises DuplicateKeyError."""
    duplicate_json = '{"user_id": 10, "role": "STUDENT", "user_id": 20}'
    with pytest.raises(DuplicateKeyError) as exc_info:
        loads(duplicate_json)
    assert exc_info.value.key == "user_id"


def test_jcs_duplicate_key_in_nested_object():
    """Verify duplicate keys inside nested objects are caught."""
    nested_json = '{"election": {"id": "el1", "id": "el2"}}'
    with pytest.raises(DuplicateKeyError):
        loads(nested_json)


def test_jcs_float_prohibition():
    """Verify that floating point values are strictly rejected by default."""
    record = {"election_id": "test", "tally_count": 100, "ratio": 0.95}
    with pytest.raises(FloatNotPermittedError):
        canonicalize(record, allow_floats=False)


def test_jcs_nested_containers_and_digest():
    """Verify nested dictionary and list serialization and digest computation."""
    obj = {
        "b": [3, 2, 1],
        "a": {"z": None, "y": True, "x": False},
    }
    expected = b'{"a":{"x":false,"y":true,"z":null},"b":[3,2,1]}'
    assert canonicalize(obj) == expected
    assert len(canonical_digest(obj)) == 32
    assert len(canonical_digest_hex(obj)) == 64


def test_jcs_canonicalize_json_string():
    """Verify canonicalize_json_string reorders keys and removes whitespace."""
    raw = '  {  "z" : 1 ,  "a" : [ true , null ]  }  '
    expected = b'{"a":[true,null],"z":1}'
    assert canonicalize_json_string(raw) == expected
