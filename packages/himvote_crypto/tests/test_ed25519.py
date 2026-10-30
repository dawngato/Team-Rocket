"""Unit tests for Ed25519 signatures and encoding utilities."""

import pytest
from himvote_crypto.ed25519 import (
    b64url_decode,
    b64url_encode,
    ed25519_sign,
    ed25519_verify,
    generate_keypair,
    sign_attestation,
    sign_checkpoint,
    verify_attestation,
    verify_checkpoint,
)
from himvote_crypto.exceptions import Ed25519Error


def test_ed25519_roundtrip():
    """Verify Ed25519 keypair generation, signing, and verification."""
    priv, pub = generate_keypair()
    assert len(priv) == 32
    assert len(pub) == 32

    message = b"canonical_election_evidence_payload"
    sig = ed25519_sign(priv, message)
    assert len(sig) == 64

    assert ed25519_verify(pub, message, sig)


def test_ed25519_negative_cases():
    """Verify negative verification cases for Ed25519."""
    priv, pub = generate_keypair()
    _, other_pub = generate_keypair()
    message = b"authentic_message"
    sig = ed25519_sign(priv, message)

    # Tampered message
    assert not ed25519_verify(pub, b"forged_message", sig)

    # Tampered signature
    tampered_sig = bytearray(sig)
    tampered_sig[0] ^= 0xFF
    assert not ed25519_verify(pub, message, bytes(tampered_sig))

    # Wrong public key
    assert not ed25519_verify(other_pub, message, sig)

    # Invalid lengths
    assert not ed25519_verify(pub[:20], message, sig)
    assert not ed25519_verify(pub, message, sig[:50])


def test_ed25519_witness_and_auditor_helpers():
    """Verify witness and auditor dedicated helper functions."""
    witness_priv, witness_pub = generate_keypair()
    auditor_priv, auditor_pub = generate_keypair()

    checkpoint_bytes = b'{"schema":"himvote.checkpoint.v1","tree_size":10}'
    cp_sig = sign_checkpoint(witness_priv, checkpoint_bytes)
    assert verify_checkpoint(witness_pub, checkpoint_bytes, cp_sig)
    assert not verify_checkpoint(auditor_pub, checkpoint_bytes, cp_sig)

    report_bytes = b'{"schema":"himvote.audit_report.v1","status":"PASS"}'
    rep_sig = sign_attestation(auditor_priv, report_bytes)
    assert verify_attestation(auditor_pub, report_bytes, rep_sig)
    assert not verify_attestation(witness_pub, report_bytes, rep_sig)


def test_ed25519_invalid_private_key_length():
    """Verify error raised on invalid private key length."""
    with pytest.raises(Ed25519Error):
        ed25519_sign(b"short_key", b"test")


def test_b64url_roundtrip():
    """Verify unpadded URL safe base64 encoding and decoding."""
    for raw in [b"", b"a", b"ab", b"abc", b"abcd", b"longer raw byte string"]:
        encoded = b64url_encode(raw)
        assert "=" not in encoded
        decoded = b64url_decode(encoded)
        assert decoded == raw
