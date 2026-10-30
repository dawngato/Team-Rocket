"""
Unit tests for RFC 9474 RSA Blind Signature implementation.
Verifies blinding, blind signing, unblinding, verification, and error conditions.
"""

import pytest
from HimVote.services.identity_issuer.crypto.rfc9474 import (
    RsaBlindIssuer,
    client_blind,
    client_finalize,
    client_verify,
)


def test_rfc9474_full_blind_signature_flow():
    """Verify complete RFC 9474 blinding, BlindSign, unblinding, and verification cycle."""
    issuer = RsaBlindIssuer()
    public_key = issuer.public_key

    # Voter generates message to be blindly signed
    voter_message = b"himvote:credential:serial_secret_abc123"

    # Step 1: Voter blinds message
    blinded_b64url, r = client_blind(voter_message, public_key)
    assert len(blinded_b64url) > 0
    assert r > 1

    # Step 2: Issuer signs blinded request without seeing plaintext
    blind_sig_b64url = issuer.blind_sign_base64url(blinded_b64url)
    assert len(blind_sig_b64url) > 0

    # Step 3: Voter finalizes unblinded signature
    unblinded_sig = client_finalize(blind_sig_b64url, r, public_key)
    assert len(unblinded_sig) == issuer.modulus_len

    # Step 4: Any verifier validates unblinded signature on original message
    is_valid = client_verify(voter_message, unblinded_sig, public_key)
    assert is_valid is True

    # Step 5: Modified message must fail verification
    is_invalid = client_verify(b"different_message_content", unblinded_sig, public_key)
    assert is_invalid is False


def test_rfc9474_invalid_representative():
    """Verify BlindSign rejects out of range message representatives."""
    issuer = RsaBlindIssuer()
    # Number larger than modulus n
    out_of_range_int = issuer.n + 100
    out_of_range_bytes = out_of_range_int.to_bytes(issuer.modulus_len + 10, byteorder="big")

    with pytest.raises(ValueError, match="representative out of range"):
        issuer.blind_sign(out_of_range_bytes)


def test_rfc9474_malformed_base64url():
    """Verify BlindSign rejects malformed base64url inputs."""
    issuer = RsaBlindIssuer()
    with pytest.raises(ValueError, match="Invalid base64url"):
        issuer.blind_sign_base64url("???invalid_base64url$$$")
