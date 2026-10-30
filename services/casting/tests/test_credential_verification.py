"""Credential acceptance tests at the casting trust boundary."""

import base64
import hashlib
import json

from cryptography.hazmat.primitives.asymmetric import rsa

from src.config import settings
from src.crypto import verify_credential_proof


def _encode(value: dict) -> str:
    raw = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def test_casting_verifies_issuer_signature_and_rejects_bound_tampering(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public = key.public_key().public_numbers()
    private = key.private_numbers()
    monkeypatch.setattr(settings, "APP_ENV", "test")
    monkeypatch.setattr(settings, "ENGINE_VALIDATION_MODE", "remote")
    monkeypatch.setattr(settings, "ISSUER_PUBLIC_KEY_N", format(public.n, "x"))
    monkeypatch.setattr(settings, "ISSUER_PUBLIC_KEY_E", public.e)

    election_id = "elec_credential_test"
    manifest_digest = "manifest_digest_test"
    voter_token = "voter-token-issued-by-identity"
    message = int.from_bytes(hashlib.sha256(voter_token.encode()).digest(), "big") % public.n
    signature = pow(message, private.d, public.n)
    proof = _encode({
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "voter_token": voter_token,
        "signature": hex(signature),
    })

    valid, nullifier, reason = verify_credential_proof(election_id, manifest_digest, proof)
    assert valid is True
    assert nullifier
    assert reason == ""

    tampered = _encode({
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "voter_token": voter_token + "-tampered",
        "signature": hex(signature),
    })
    valid, _, reason = verify_credential_proof(election_id, manifest_digest, tampered)
    assert valid is False
    assert "signature" in reason.lower()

    wrong_election = _encode({
        "election_id": "another-election",
        "manifest_digest": manifest_digest,
        "voter_token": voter_token,
        "signature": hex(signature),
    })
    valid, _, reason = verify_credential_proof(election_id, manifest_digest, wrong_election)
    assert valid is False
    assert "different election" in reason
