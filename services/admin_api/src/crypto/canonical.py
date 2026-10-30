"""
Canonical JSON serialization implementing RFC 8785 principles.
Ensures deterministic serialization for digests and signatures.
"""

import json
from typing import Any


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
    
    encoded = json.dumps(
        obj,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":")
    )
    return encoded.encode("utf-8")


def canonical_json_str(obj: Any) -> str:
    """
    Returns the canonical JSON string.
    """
    return canonical_json_bytes(obj).decode("utf-8")
