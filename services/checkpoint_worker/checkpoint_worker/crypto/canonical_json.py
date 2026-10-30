"""
RFC 8785 JSON Canonicalization Scheme implementation.
Ensures deterministic serialization without whitespace or floats.
"""

import hashlib
import json
from typing import Any


def canonical_json(obj: Any) -> bytes:
    """
    Serialize Python object into canonical JSON bytes conforming to RFC 8785.
    Keys are sorted by UTF 16 code units.
    No extraneous whitespace is permitted.
    Floats are rejected per HimVote specification.
    """
    def serialize(item: Any) -> str:
        if isinstance(item, dict):
            def utf16_sort_key(key_str: Any) -> bytes:
                if not isinstance(key_str, str):
                    raise TypeError("JSON object keys must be strings")
                return key_str.encode("utf-16-be")

            parts = []
            for k in sorted(item.keys(), key=utf16_sort_key):
                val_str = serialize(item[k])
                parts.append(json.dumps(k, ensure_ascii=False) + ":" + val_str)
            return "{" + ",".join(parts) + "}"
        elif isinstance(item, list):
            parts = [serialize(x) for x in item]
            return "[" + ",".join(parts) + "]"
        elif isinstance(item, str):
            return json.dumps(item, ensure_ascii=False)
        elif isinstance(item, bool):
            return "true" if item else "false"
        elif isinstance(item, int):
            return str(item)
        elif item is None:
            return "null"
        elif isinstance(item, float):
            raise TypeError("Floating point numbers are disallowed in HimVote canonical records")
        else:
            raise TypeError(f"Unsupported data type for canonical serialization: {type(item)}")

    return serialize(obj).encode("utf-8")


def compute_canonical_digest(obj: Any) -> str:
    """
    Compute hex encoded SHA256 digest of canonical JSON serialization.
    """
    raw_bytes = canonical_json(obj)
    return hashlib.sha256(raw_bytes).hexdigest()
