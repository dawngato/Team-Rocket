"""Strict JSON parsing and deterministic canonical serialization.

The project evidence format uses a deliberately small JSON subset.  Objects
must not contain duplicate keys and non-finite or floating point values are
rejected so that the bytes signed by one implementation are unambiguous.
"""

from __future__ import annotations

import json
from typing import Any


class CanonicalJSONError(ValueError):
    """Raised when evidence JSON is ambiguous or outside the supported subset."""


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise CanonicalJSONError(f"duplicate JSON object key: {key!r}")
        result[key] = value
    return result


def _reject_constant(token: str) -> Any:
    raise CanonicalJSONError(f"non-finite JSON number is not allowed: {token}")


def _reject_unsupported_numbers(value: Any, path: str = "$" ) -> None:
    if isinstance(value, float):
        raise CanonicalJSONError(f"floating point value is not allowed at {path}")
    if isinstance(value, dict):
        for key, child in value.items():
            _reject_unsupported_numbers(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_unsupported_numbers(child, f"{path}[{index}]")


def parse_json_bytes(data: bytes, *, source: str = "JSON") -> Any:
    """Parse strict UTF-8 JSON while rejecting duplicate keys and floats."""

    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise CanonicalJSONError(f"{source} is not valid UTF-8") from exc
    try:
        value = json.loads(
            text,
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_constant,
        )
    except (json.JSONDecodeError, CanonicalJSONError) as exc:
        if isinstance(exc, CanonicalJSONError):
            raise
        raise CanonicalJSONError(f"{source} is not valid JSON: {exc.msg}") from exc
    _reject_unsupported_numbers(value)
    return value


def canonical_bytes(value: Any) -> bytes:
    """Return the versioned canonical UTF-8 JSON representation used here."""

    _reject_unsupported_numbers(value)
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise CanonicalJSONError(f"value cannot be canonicalized: {exc}") from exc
    return text.encode("utf-8")


def canonical_digest(value: Any) -> str:
    import hashlib

    return hashlib.sha256(canonical_bytes(value)).hexdigest()
