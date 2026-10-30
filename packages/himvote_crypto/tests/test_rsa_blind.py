"""Unit tests for RFC 9474 RSA Blind Signatures."""

import pytest
from himvote_crypto.exceptions import InvalidSignatureError, RSABlindError
from himvote_crypto.rsa_blind import (
    RSABSSAVariant,
    client_blind,
    client_finalize,
    generate_rsa_keypair,
    server_blind_sign,
    verify_signature,
)


@pytest.fixture(scope="module")
def rsa_keys():
    """Generate shared 2048 bit RSA key pair for testing."""
    return generate_rsa_keypair(key_size=2048)


def test_rsa_blind_roundtrip_all_variants(rsa_keys):
    """Verify complete Blind to BlindSign to Finalize to Verify flow across all variants."""
    sk, pk = rsa_keys
    message = b"himvote_voter_eligibility_token_98765"

    for variant in RSABSSAVariant:
        # 1. Client blinds message
        blinded_msg, secret, prepared = client_blind(
            pk,
            message,
            variant=variant,
        )
        assert len(blinded_msg) == 256

        # 2. Server blind signs without learning the message
        blind_sig = server_blind_sign(sk, blinded_msg)
        assert len(blind_sig) == 256

        # 3. Client unblinds the signature and validates it internally
        sig = client_finalize(pk, prepared, blind_sig, secret)
        assert len(sig) == 256

        # 4. Third party verifier verifies signature over prepared message
        assert verify_signature(pk, prepared, sig, variant=variant)


def test_rsa_blind_tampered_blind_signature(rsa_keys):
    """Verify that tampering with blind signature causes client finalize to fail."""
    sk, pk = rsa_keys
    message = b"tamper_test_token"
    blinded_msg, secret, prepared = client_blind(pk, message)

    blind_sig = server_blind_sign(sk, blinded_msg)

    # Flip one byte in the blind signature
    tampered_sig = bytearray(blind_sig)
    tampered_sig[10] ^= 0xFF

    with pytest.raises(InvalidSignatureError):
        client_finalize(pk, prepared, bytes(tampered_sig), secret)


def test_rsa_blind_tampered_message(rsa_keys):
    """Verify that signature does not verify against a different prepared message."""
    sk, pk = rsa_keys
    message = b"original_token"
    blinded_msg, secret, prepared = client_blind(pk, message)
    blind_sig = server_blind_sign(sk, blinded_msg)
    sig = client_finalize(pk, prepared, blind_sig, secret)

    tampered_prepared = prepared + b"_tampered"
    assert not verify_signature(pk, tampered_prepared, sig)


def test_rsa_blind_wrong_public_key(rsa_keys):
    """Verify that verification fails with a different public key."""
    sk, pk = rsa_keys
    _, other_pk = generate_rsa_keypair(key_size=2048)

    message = b"wrong_key_test"
    blinded_msg, secret, prepared = client_blind(pk, message)
    blind_sig = server_blind_sign(sk, blinded_msg)
    sig = client_finalize(pk, prepared, blind_sig, secret)

    assert not verify_signature(other_pk, prepared, sig)


def test_rsa_blind_server_invalid_length(rsa_keys):
    """Verify server rejects blinded messages with wrong byte length."""
    sk, _ = rsa_keys
    with pytest.raises(RSABlindError):
        server_blind_sign(sk, b"too_short")
