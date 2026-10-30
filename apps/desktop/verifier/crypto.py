"""Small standard-library cryptographic verification helpers.

This module verifies detached RSA PKCS#1 v1.5 SHA-256 signatures for the
synthetic evidence wrapper.  It does not implement an election protocol,
ballot encryption, trustee decryption, or a native Helios/Belenios verifier.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
from dataclasses import dataclass


class CryptoFormatError(ValueError):
    """Raised when a trusted key or signature has an invalid representation."""


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(value: str) -> bytes:
    if not isinstance(value, str) or not value or any(ch.isspace() for ch in value):
        raise CryptoFormatError("signature must be a non-empty unpadded base64url string")
    if any(ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" for ch in value):
        raise CryptoFormatError("signature contains invalid base64url characters")
    try:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except (ValueError, binascii.Error) as exc:
        raise CryptoFormatError("invalid base64url signature") from exc


@dataclass(frozen=True)
class RSAPublicKey:
    key_id: str
    algorithm: str
    modulus: int
    exponent: int


def parse_public_key(value: object, *, expected_key_id: str | None = None) -> RSAPublicKey:
    if not isinstance(value, dict):
        raise CryptoFormatError("trusted key must be an object")
    key_id = value.get("key_id")
    algorithm = value.get("algorithm")
    modulus_hex = value.get("n")
    exponent = value.get("e")
    if not isinstance(key_id, str) or not key_id:
        raise CryptoFormatError("trusted key key_id is required")
    if expected_key_id is not None and key_id != expected_key_id:
        raise CryptoFormatError(f"unexpected trusted key id {key_id!r}")
    if algorithm != "RSA-PKCS1-v1_5-SHA256":
        raise CryptoFormatError(f"unsupported signature algorithm: {algorithm!r}")
    if not isinstance(modulus_hex, str) or not modulus_hex or len(modulus_hex) % 2:
        raise CryptoFormatError("trusted RSA modulus must be an even-length hex string")
    try:
        modulus = int(modulus_hex, 16)
    except ValueError as exc:
        raise CryptoFormatError("trusted RSA modulus is not hexadecimal") from exc
    if not isinstance(exponent, int) or exponent < 3 or exponent % 2 == 0:
        raise CryptoFormatError("trusted RSA exponent is invalid")
    if modulus.bit_length() < 1024 or modulus % 2 == 0:
        raise CryptoFormatError("trusted RSA modulus is too small or invalid")
    return RSAPublicKey(key_id, algorithm, modulus, exponent)


_SHA256_DIGEST_INFO_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")


def verify_rsa_pkcs1_sha256(data: bytes, signature_b64url: str, key: RSAPublicKey) -> bool:
    """Verify a detached RSA PKCS#1 v1.5 SHA-256 signature."""

    try:
        signature = b64url_decode(signature_b64url)
    except CryptoFormatError:
        return False
    key_size = (key.modulus.bit_length() + 7) // 8
    if len(signature) != key_size:
        return False
    encoded_message = pow(int.from_bytes(signature, "big"), key.exponent, key.modulus).to_bytes(
        key_size, "big"
    )
    digest_info = _SHA256_DIGEST_INFO_PREFIX + hashlib.sha256(data).digest()
    if key_size < len(digest_info) + 11:
        return False
    expected = b"\x00\x01" + b"\xff" * (key_size - len(digest_info) - 3) + b"\x00" + digest_info
    return hmac.compare_digest(encoded_message, expected)


def sign_rsa_pkcs1_sha256_for_fixture(data: bytes, modulus: int, private_exponent: int) -> str:
    """Sign fixture data; private keys are confined to synthetic fixture code."""

    key_size = (modulus.bit_length() + 7) // 8
    digest_info = _SHA256_DIGEST_INFO_PREFIX + hashlib.sha256(data).digest()
    if key_size < len(digest_info) + 11:
        raise CryptoFormatError("fixture RSA modulus is too small")
    encoded_message = b"\x00\x01" + b"\xff" * (key_size - len(digest_info) - 3) + b"\x00" + digest_info
    signature = pow(int.from_bytes(encoded_message, "big"), private_exponent, modulus)
    return b64url_encode(signature.to_bytes(key_size, "big"))
