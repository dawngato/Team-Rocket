"""
RFC 8785 JSON Canonicalization Scheme (JCS) implementation.
Ensures deterministic UTF 8 bytes representation across all languages.
Strict rules:
* UTF 8 encoding without BOM
* Keys sorted by UTF 16 code units in ascending order
* No whitespace between tokens
* Numbers formatted without exponent where applicable
* Rejection of float types as per HimVote specification
"""

import json
from typing import Any


class CanonicalJsonError(ValueError):
    """Raised when canonical serialization encounters invalid data."""
    pass


def _utf16_sort_key(s: str) -> bytes:
    """Return UTF 16 big endian byte representation for strict RFC 8785 key ordering."""
    return s.encode("utf-16-be")


def canonicalize_value(obj: Any) -> Any:
    """Recursively validate and order data structures for RFC 8785 compliance."""
    if isinstance(obj, float):
        raise CanonicalJsonError("Floating point values are forbidden by HimVote canonical specification")
    if isinstance(obj, (int, str, bool)) or obj is None:
        return obj
    if isinstance(obj, dict):
        ordered = {}
        for k in sorted(obj.keys(), key=_utf16_sort_key):
            if not isinstance(k, str):
                raise CanonicalJsonError(f"Dictionary keys must be strings, got {type(k).__name__}")
            ordered[k] = canonicalize_value(obj[k])
        return ordered
    if isinstance(obj, (list, tuple)):
        return [canonicalize_value(item) for item in obj]
    raise CanonicalJsonError(f"Unsupported data type for canonicalization: {type(obj).__name__}")


def canonical_json_bytes(obj: Any) -> bytes:
    """Serialize object to RFC 8785 canonical UTF 8 JSON bytes."""
    normalized = canonicalize_value(obj)
    serialized = json.dumps(
        normalized,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False
    )
    return serialized.encode("utf-8")


def canonical_json_str(obj: Any) -> str:
    """Serialize object to RFC 8785 canonical JSON string."""
    return canonical_json_bytes(obj).decode("utf-8")
