"""Unit tests for blind credential issuance and verification."""

import pytest

from ..credentials import (
    IssuerKeyPair,
    VoterCredential,
    derive_nullifier,
    verify_credential_proof,
)


def test_blind_signature_issuance_flow() -> None:
    """Verify complete RFC 9474 blind signature issuance flow."""
    election_id = "election_blind_test"
    manifest_digest = "manifest_digest_sample"

    issuer = IssuerKeyPair.generate(key_id="issuer_test", key_size=2048)
    issuer_pub = issuer.get_public_dict()

    voter = VoterCredential.create(election_id)
    blinded = voter.generate_blinded_request(issuer.modulus_n, issuer.public_exponent_e)

    # Issuer signs without seeing secret token
    blind_sig = issuer.sign_blinded_request(blinded)

    # Voter unblinds
    sig = voter.unblind_signature(blind_sig, issuer.modulus_n)
    assert sig is not None

    proof = voter.get_credential_proof(manifest_digest)
    valid, nullifier = verify_credential_proof(
        election_id=election_id,
        manifest_digest=manifest_digest,
        credential_proof=proof,
        issuer_public_key=issuer_pub,
    )

    assert valid is True
    assert nullifier == derive_nullifier(election_id, voter.voter_token)


def test_credential_verification_failures() -> None:
    """Verify credential verification rejects tampered or mismatched data."""
    election_id = "election_fail_test"
    manifest_digest = "manifest_fail_sample"

    issuer = IssuerKeyPair.generate(key_id="issuer_fail_test", key_size=2048)
    issuer_pub = issuer.get_public_dict()

    voter = VoterCredential.create(election_id)
    blinded = voter.generate_blinded_request(issuer.modulus_n, issuer.public_exponent_e)
    blind_sig = issuer.sign_blinded_request(blinded)
    voter.unblind_signature(blind_sig, issuer.modulus_n)
    proof = voter.get_credential_proof(manifest_digest)

    # Wrong election ID
    valid, _ = verify_credential_proof(
        election_id="different_election",
        manifest_digest=manifest_digest,
        credential_proof=proof,
        issuer_public_key=issuer_pub,
    )
    assert valid is False

    # Wrong manifest digest
    valid, _ = verify_credential_proof(
        election_id=election_id,
        manifest_digest="different_manifest",
        credential_proof=proof,
        issuer_public_key=issuer_pub,
    )
    assert valid is False

    # Tampered signature
    tampered_proof = dict(proof)
    orig_sig = int(tampered_proof["signature"], 16)
    tampered_proof["signature"] = hex((orig_sig + 1) % issuer.modulus_n)
    valid, _ = verify_credential_proof(
        election_id=election_id,
        manifest_digest=manifest_digest,
        credential_proof=tampered_proof,
        issuer_public_key=issuer_pub,
    )
    assert valid is False
