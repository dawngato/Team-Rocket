"""Ed25519 digital signatures for witness and auditor attestations per RFC 8032.

This module provides Ed25519 cryptographic signing and verification:
* Raw 32 byte private seed and public key representation
* 64 byte deterministic Ed25519 signatures
* Witness checkpoint signing and verification
* Auditor report attestation signing and verification
* URL safe base64 encoding helpers
"""

import base64
from typing import Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519

from himvote_crypto.exceptions import Ed25519Error, InvalidSignatureError


def generate_keypair() -> Tuple[bytes, bytes]:
    """Generate an Ed25519 key pair.

    Returns:
        Tuple of (private_bytes_32, public_bytes_32).
    """
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_bytes = private_key.private_bytes_raw()
    pub_bytes = public_key.public_bytes_raw()
    return priv_bytes, pub_bytes


def sign(private_key_bytes: bytes, message: bytes) -> bytes:
    """Sign a message using an Ed25519 private key seed.

    Parameters:
        private_key_bytes: Exactly 32 raw bytes of private key seed.
        message: Raw message bytes to sign.

    Returns:
        64 byte Ed25519 signature.
    """
    if len(private_key_bytes) != 32:
        raise Ed25519Error(
            f"Private key must be exactly 32 bytes, got {len(private_key_bytes)}"
        )
    try:
        priv = ed25519.Ed25519PrivateKey.from_private_bytes(private_key_bytes)
        return priv.sign(message)
    except Exception as exc:
        raise Ed25519Error(f"Ed25519 signing failed: {exc}") from exc


def verify(public_key_bytes: bytes, message: bytes, signature: bytes) -> bool:
    """Verify an Ed25519 signature against a message and public key.

    Parameters:
        public_key_bytes: Exactly 32 raw bytes of public key.
        message: Raw message bytes that were signed.
        signature: Exactly 64 byte signature to verify.

    Returns:
        True if the signature is valid, False otherwise.
    """
    if len(public_key_bytes) != 32 or len(signature) != 64:
        return False
    try:
        pub = ed25519.Ed25519PublicKey.from_public_bytes(public_key_bytes)
        pub.verify(signature, message)
        return True
    except (InvalidSignature, ValueError):
        return False


# Convenience aliases
ed25519_sign = sign
ed25519_verify = verify


def sign_checkpoint(
    witness_private_key: bytes,
    canonical_checkpoint_bytes: bytes,
) -> bytes:
    """Sign a canonical checkpoint record using a witness Ed25519 private key."""
    return sign(witness_private_key, canonical_checkpoint_bytes)


def verify_checkpoint(
    witness_public_key: bytes,
    canonical_checkpoint_bytes: bytes,
    signature: bytes,
) -> bool:
    """Verify a witness signature over canonical checkpoint record bytes."""
    return verify(witness_public_key, canonical_checkpoint_bytes, signature)


def sign_attestation(
    auditor_private_key: bytes,
    canonical_report_bytes: bytes,
) -> bytes:
    """Sign an audit verification report using an auditor Ed25519 private key."""
    return sign(auditor_private_key, canonical_report_bytes)


def verify_attestation(
    auditor_public_key: bytes,
    canonical_report_bytes: bytes,
    signature: bytes,
) -> bool:
    """Verify an auditor attestation signature over report bytes."""
    return verify(auditor_public_key, canonical_report_bytes, signature)


def b64url_encode(data: bytes) -> str:
    """Encode bytes to URL safe unpadded base64 string."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(s: str) -> bytes:
    """Decode URL safe base64 string handling missing padding."""
    pad_len = (4 - (len(s) % 4)) % 4
    padded = s + ("=" * pad_len)
    return base64.urlsafe_b64decode(padded.encode("ascii"))
