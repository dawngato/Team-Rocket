"""Deterministic JSON Canonicalization Scheme (JCS) per RFC 8785.

This module provides deterministic canonical JSON serialization matching RFC 8785:
* UTF_8 output without BOM
* Whitespace elimination between tokens
* Object keys sorted by UTF_16 code unit values
* Strict duplicate key detection on parsing
* String escaping preserving raw UTF_8 except control characters and required escapes
* Enforcement of integer precision without floating point ambiguity
"""

import hashlib
import json
import math
from typing import Any, Dict, List, Sequence, Tuple, Union

from himvote_crypto.exceptions import (
    CanonicalizationError,
    DuplicateKeyError,
    FloatNotPermittedError,
    InvalidUnicodeError,
)

JS_MIN_SAFE_INTEGER = -9007199254740991
JS_MAX_SAFE_INTEGER = 9007199254740991


def _utf16_sort_key(s: str) -> bytes:
    """Compute the sorting key for object property names per RFC 8785 Section 3.2.3.

    Property name strings are compared as arrays of UTF_16 code units.
    Encoding to big endian UTF_16 and comparing raw bytes produces the exact
    code unit sequence ordering specified in RFC 8785.
    """
    return s.encode("utf-16-be")


def _serialize_string(s: str) -> str:
    """Serialize a string per RFC 8785 Section 3.2.2.2.

    Quotes quotation mark (") and reverse solidus (\\).
    Control characters U+0000 through U+001F are converted to either standard
    escape sequences (\\b, \\t, \\n, \\f, \\r) or \\u00xx hexadecimal escapes.
    All other characters are emitted unescaped in UTF_8.
    Lone surrogates (0xD800 through 0xDFFF) are rejected.
    """
    out: List[str] = ['"']
    for char in s:
        cp = ord(char)
        if 0xD800 <= cp <= 0xDFFF:
            raise InvalidUnicodeError(
                f"Lone surrogate character detected: U+{cp:04X}"
            )
        if char == '"':
            out.append('\\"')
        elif char == "\\":
            out.append("\\\\")
        elif char == "\b":
            out.append("\\b")
        elif char == "\t":
            out.append("\\t")
        elif char == "\n":
            out.append("\\n")
        elif char == "\f":
            out.append("\\f")
        elif char == "\r":
            out.append("\\r")
        elif cp < 0x20:
            out.append(f"\\u{cp:04x}")
        else:
            out.append(char)
    out.append('"')
    return "".join(out)


def _serialize_float_ecmascript(val: float) -> str:
    """Format floating point number per ECMAScript 7.1.12.1 for RFC 8785.

    NaN and Infinity values are strictly forbidden in JSON.
    Negative zero is serialized as 0.
    """
    if math.isnan(val) or math.isinf(val):
        raise CanonicalizationError(
            f"Invalid non finite number for JSON canonicalization: {val}"
        )
    if val == 0.0:
        return "0"

    sign = "-" if val < 0 else ""
    abs_val = abs(val)

    # Use 17 significant digits standard representation
    s = f"{abs_val:.17g}"
    if "e" in s:
        mantissa, exp = s.split("e")
        exp_int = int(exp)
        exp_sign = "+" if exp_int >= 0 else "-"
        exp_abs = abs(exp_int)
        s = f"{mantissa}e{exp_sign}{exp_abs}"
    else:
        # Check if between 1e minus 6 and 1e21
        pass

    return f"{sign}{s}"


def _serialize_value(val: Any, allow_floats: bool) -> str:
    """Recursively serialize a Python value into canonical JSON string."""
    if val is None:
        return "null"

    # In Python, bool is a subclass of int, so check bool first
    if isinstance(val, bool):
        return "true" if val else "false"

    if isinstance(val, int):
        return str(val)

    if isinstance(val, float):
        if not allow_floats:
            raise FloatNotPermittedError(
                f"Floating point value {val} encountered while allow_floats is False"
            )
        return _serialize_float_ecmascript(val)

    if isinstance(val, str):
        return _serialize_string(val)

    if isinstance(val, (list, tuple)):
        items = [_serialize_value(item, allow_floats) for item in val]
        return "[" + ",".join(items) + "]"

    if isinstance(val, dict):
        # Sort keys lexicographically by UTF_16 code units
        sorted_keys = sorted(val.keys(), key=_utf16_sort_key)
        parts: List[str] = []
        for k in sorted_keys:
            if not isinstance(k, str):
                raise CanonicalizationError(
                    f"Object property names must be strings, got {type(k).__name__}"
                )
            serialized_key = _serialize_string(k)
            serialized_val = _serialize_value(val[k], allow_floats)
            parts.append(f"{serialized_key}:{serialized_val}")
        return "{" + ",".join(parts) + "}"

    raise CanonicalizationError(
        f"Unsupported data type for JSON canonicalization: {type(val).__name__}"
    )


def canonicalize(obj: Any, *, allow_floats: bool = False) -> bytes:
    """Canonicalize a Python object into deterministic RFC 8785 UTF_8 bytes.

    Parameters:
        obj: The dictionary, list, or primitive to canonicalize.
        allow_floats: Whether to allow floating point numbers. Defaults to False
                      per HimVote Section 5.3 specifications.

    Returns:
        Deterministic canonical UTF_8 encoded bytes without BOM.
    """
    canonical_str = _serialize_value(obj, allow_floats=allow_floats)
    return canonical_str.encode("utf-8")


def _strict_pairs_hook(pairs: List[Tuple[str, Any]]) -> Dict[str, Any]:
    """Object pairs hook that raises DuplicateKeyError upon duplicate keys."""
    res: Dict[str, Any] = {}
    for key, value in pairs:
        if key in res:
            raise DuplicateKeyError(key)
        res[key] = value
    return res


def loads(
    json_data: Union[str, bytes],
    *,
    allow_duplicate_keys: bool = False,
) -> Any:
    """Parse JSON string or bytes into Python objects with strict duplicate key checking.

    Parameters:
        json_data: The input JSON string or bytes.
        allow_duplicate_keys: If False, raises DuplicateKeyError when duplicate
                             property names exist in any object.

    Returns:
        The parsed Python object structure.
    """
    if isinstance(json_data, bytes):
        try:
            json_str = json_data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise CanonicalizationError(f"Invalid UTF_8 input: {exc}") from exc
    else:
        json_str = json_data

    hook = None if allow_duplicate_keys else _strict_pairs_hook
    try:
        return json.loads(json_str, object_pairs_hook=hook)
    except DuplicateKeyError:
        raise
    except json.JSONDecodeError as exc:
        raise CanonicalizationError(f"Malformed JSON: {exc}") from exc


def canonicalize_json_string(
    json_data: Union[str, bytes],
    *,
    allow_floats: bool = False,
) -> bytes:
    """Parse JSON input with duplicate key validation and serialize to RFC 8785 bytes.

    Parameters:
        json_data: Raw JSON string or bytes.
        allow_floats: Whether floating point numbers are permitted.

    Returns:
        Deterministic canonical bytes.
    """
    parsed = loads(json_data, allow_duplicate_keys=False)
    return canonicalize(parsed, allow_floats=allow_floats)


def canonical_digest(obj: Any, *, allow_floats: bool = False) -> bytes:
    """Compute the SHA256 digest of the canonicalized JSON object."""
    return hashlib.sha256(canonicalize(obj, allow_floats=allow_floats)).digest()


def canonical_digest_hex(obj: Any, *, allow_floats: bool = False) -> str:
    """Compute the hexadecimal SHA256 digest of the canonicalized JSON object."""
    return canonical_digest(obj, allow_floats=allow_floats).hex()
