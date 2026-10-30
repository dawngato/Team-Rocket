"""
Cryptographic signing and verification utilities for checkpoint worker.
Uses reviewed Ed25519 implementation per HimVote specification.
"""

import base64
from typing import Union
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.exceptions import InvalidSignature


def generate_ed25519_keypair() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    """
    Generate fresh Ed25519 keypair.
    Useful for testing and local fixtures.
    """
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    return private_key, public_key


def load_ed25519_private_key(raw_input: Union[str, bytes]) -> Ed25519PrivateKey:
    """
    Load Ed25519 private key from 32 byte raw bytes, hex string, or base64 string.
    """
    if isinstance(raw_input, str):
        raw_input = raw_input.strip()
        if len(raw_input) == 64:
            key_bytes = bytes.fromhex(raw_input)
        else:
            key_bytes = base64.b64decode(raw_input)
    else:
        key_bytes = raw_input

    if len(key_bytes) != 32:
        raise ValueError("Ed25519 private key seed must be exactly 32 bytes")
    return Ed25519PrivateKey.from_private_bytes(key_bytes)


def load_ed25519_public_key(raw_input: Union[str, bytes]) -> Ed25519PublicKey:
    """
    Load Ed25519 public key from 32 byte raw bytes, hex string, or base64 string.
    """
    if isinstance(raw_input, str):
        raw_input = raw_input.strip()
        if len(raw_input) == 64:
            key_bytes = bytes.fromhex(raw_input)
        else:
            key_bytes = base64.b64decode(raw_input)
    else:
        key_bytes = raw_input

    if len(key_bytes) != 32:
        raise ValueError("Ed25519 public key must be exactly 32 bytes")
    return Ed25519PublicKey.from_public_bytes(key_bytes)


def sign_checkpoint_bytes(private_key: Ed25519PrivateKey, canonical_bytes: bytes) -> str:
    """
    Sign canonical checkpoint bytes with log writer private key.
    Returns hex encoded signature string.
    """
    signature = private_key.sign(canonical_bytes)
    return signature.hex()


def compute_witness_signed_message(
    canonical_checkpoint_bytes: bytes,
    previous_witness_sequence: int,
    election_id: str,
) -> bytes:
    """
    Construct unambiguous message bound by witness signature.
    Per Section 5.4, witness signature binds canonical bytes,
    previous witness sequence, and election ID.
    """
    return (
        canonical_checkpoint_bytes
        + b":"
        + str(previous_witness_sequence).encode("utf-8")
        + b":"
        + election_id.encode("utf-8")
    )


def verify_witness_signature(
    public_key: Ed25519PublicKey,
    signature_hex: str,
    canonical_checkpoint_bytes: bytes,
    previous_witness_sequence: int,
    election_id: str,
) -> bool:
    """
    Verify witness signature over canonical checkpoint bytes,
    previous witness sequence, and election ID.
    """
    try:
        sig_bytes = bytes.fromhex(signature_hex)
        message = compute_witness_signed_message(
            canonical_checkpoint_bytes=canonical_checkpoint_bytes,
            previous_witness_sequence=previous_witness_sequence,
            election_id=election_id,
        )
        public_key.verify(sig_bytes, message)
        return True
    except (InvalidSignature, ValueError):
        return False
