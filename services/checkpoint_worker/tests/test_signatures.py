"""
Unit tests for Ed25519 signing and verification.
"""

import pytest
from checkpoint_worker.crypto.signatures import (
    generate_ed25519_keypair,
    sign_checkpoint_bytes,
    verify_witness_signature,
    compute_witness_signed_message,
    load_ed25519_private_key,
    load_ed25519_public_key,
)


def test_key_loading():
    """
    Keys must load correctly from raw bytes and hex representation.
    """
    priv, pub = generate_ed25519_keypair()
    priv_bytes = priv.private_bytes_raw()
    pub_bytes = pub.public_bytes_raw()

    loaded_priv = load_ed25519_private_key(priv_bytes.hex())
    loaded_pub = load_ed25519_public_key(pub_bytes.hex())

    test_message = b"checkpoint_test_payload"
    sig = loaded_priv.sign(test_message)
    loaded_pub.verify(sig, test_message)


def test_witness_signature_verification_success():
    """
    Witness signature must verify over canonical bytes, sequence, and election ID.
    """
    witness_priv, witness_pub = generate_ed25519_keypair()
    canonical_bytes = b'{"schema":"himvote.checkpoint.v1","tree_size":1}'
    election_id = "election_xyz"
    prev_sequence = 2

    message = compute_witness_signed_message(
        canonical_checkpoint_bytes=canonical_bytes,
        previous_witness_sequence=prev_sequence,
        election_id=election_id,
    )
    sig_bytes = witness_priv.sign(message)
    sig_hex = sig_bytes.hex()

    is_valid = verify_witness_signature(
        public_key=witness_pub,
        signature_hex=sig_hex,
        canonical_checkpoint_bytes=canonical_bytes,
        previous_witness_sequence=prev_sequence,
        election_id=election_id,
    )
    assert is_valid


def test_witness_signature_verification_failure_on_tamper():
    """
    Altering any component of signed witness data must fail verification.
    """
    witness_priv, witness_pub = generate_ed25519_keypair()
    canonical_bytes = b'{"schema":"himvote.checkpoint.v1","tree_size":1}'
    election_id = "election_xyz"
    prev_sequence = 2

    message = compute_witness_signed_message(
        canonical_checkpoint_bytes=canonical_bytes,
        previous_witness_sequence=prev_sequence,
        election_id=election_id,
    )
    sig_hex = witness_priv.sign(message).hex()

    tampered_bytes = b'{"schema":"himvote.checkpoint.v1","tree_size":2}'
    assert not verify_witness_signature(
        public_key=witness_pub,
        signature_hex=sig_hex,
        canonical_checkpoint_bytes=tampered_bytes,
        previous_witness_sequence=prev_sequence,
        election_id=election_id,
    )


def test_invalid_key_bytes_rejection():
    """
    Invalid key byte lengths must raise ValueError.
    """
    with pytest.raises(ValueError, match="32 bytes"):
        load_ed25519_private_key(b"short_key")

    with pytest.raises(ValueError, match="32 bytes"):
        load_ed25519_public_key(b"short_pub")

