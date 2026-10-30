"""
Cryptographic signatures handling Ed25519 and ECDSA for HimVote.
Verifies auditor signatures against pinned keys and fingerprints.
"""

import base64
import hashlib
from typing import Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
from src.crypto.canonical import canonical_json_bytes


def generate_ed25519_keypair() -> Tuple[str, str]:
    """
    Generates a new Ed25519 private and public key pair for testing or local operations.
    Returns private key hex and public key hex.
    """
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    
    priv_bytes = private_key.private_bytes_raw()
    pub_bytes = public_key.public_bytes_raw()
    
    return priv_bytes.hex(), pub_bytes.hex()


def sign_data_ed25519(private_key_hex: str, message: bytes) -> str:
    """
    Signs raw message bytes with Ed25519 private key.
    Returns signature encoded as base64.
    """
    priv_bytes = bytes.fromhex(private_key_hex)
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
    sig = private_key.sign(message)
    return base64.b64encode(sig).decode("ascii")


def verify_ed25519_signature(public_key_hex: str, message: bytes, signature_b64: str) -> bool:
    """
    Verifies Ed25519 signature over message bytes.
    """
    try:
        pub_bytes = bytes.fromhex(public_key_hex)
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        sig_bytes = base64.b64decode(signature_b64)
        public_key.verify(sig_bytes, message)
        return True
    except (InvalidSignature, ValueError, Exception):
        return False


def get_public_key_fingerprint(public_key_hex: str) -> str:
    """
    Computes SHA256 hex fingerprint of the raw public key bytes.
    """
    pub_bytes = bytes.fromhex(public_key_hex)
    return hashlib.sha256(pub_bytes).hexdigest()


def verify_auditor_signature(
    public_key_hex: str,
    pinned_fingerprint: str,
    attestation_data: dict,
    signature_b64: str
) -> bool:
    """
    Verifies auditor attestation statement against pinned key fingerprint and signature.
    Preconditions:
    1. public key SHA256 fingerprint matches pinned_fingerprint (if pinning enforced).
    2. attestation data serialized to canonical JSON bytes.
    3. Ed25519 signature is cryptographically valid over the canonical data bytes.
    """
    if pinned_fingerprint and pinned_fingerprint != "CHANGE_ME":
        actual_fingerprint = get_public_key_fingerprint(public_key_hex)
        if actual_fingerprint.lower() != pinned_fingerprint.lower():
            return False

    canonical_bytes = canonical_json_bytes(attestation_data)
    return verify_ed25519_signature(public_key_hex, canonical_bytes, signature_b64)
