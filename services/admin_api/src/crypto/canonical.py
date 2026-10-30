"""
Canonical JSON serialization implementing RFC 8785 principles.
Ensures deterministic serialization for digests and signatures.
"""

import json
from typing import Any

try:
    from himvote_crypto.jcs import canonicalize as _reviewed_jcs_canonicalize
except ImportError:
    _reviewed_jcs_canonicalize = None


def canonical_json_bytes(obj: Any) -> bytes:
    """
    Serializes an object to canonical RFC 8785 compliant JSON bytes.
    Keys are lexicographically sorted.
    Whitespace between tokens is removed.
    Floats are strictly rejected per HimVote specification.
    """
    def validate_no_floats(item: Any) -> None:
        if isinstance(item, float):
            raise ValueError("Floats are prohibited in HimVote canonical JSON")
        if isinstance(item, dict):
            for k, v in item.items():
                if not isinstance(k, str):
                    raise ValueError("Dictionary keys must be strings")
                validate_no_floats(v)
        elif isinstance(item, (list, tuple)):
            for v in item:
                validate_no_floats(v)

    validate_no_floats(obj)
    
    if _reviewed_jcs_canonicalize is not None:
        return _reviewed_jcs_canonicalize(obj, allow_floats=False)

    def serialize(item: Any) -> str:
        if isinstance(item, dict):
            keys = sorted(item.keys(), key=lambda key: key.encode("utf-16-be"))
            if any(not isinstance(key, str) for key in keys):
                raise ValueError("Dictionary keys must be strings")
            return "{" + ",".join(f"{json.dumps(key, ensure_ascii=False)}:{serialize(item[key])}" for key in keys) + "}"
        if isinstance(item, (list, tuple)):
            return "[" + ",".join(serialize(value) for value in item) + "]"
        if isinstance(item, str):
            return json.dumps(item, ensure_ascii=False)
        if item is True:
            return "true"
        if item is False:
            return "false"
        if item is None:
            return "null"
        if isinstance(item, int):
            return str(item)
        if isinstance(item, float):
            raise ValueError("Floats are prohibited in HimVote canonical JSON")
        raise TypeError(f"Unsupported canonical JSON value: {type(item).__name__}")

    return serialize(obj).encode("utf-8")


def canonical_json_str(obj: Any) -> str:
    """
    Returns the canonical JSON string.
    """
    return canonical_json_bytes(obj).decode("utf-8")
