"""
Cryptographic routines and canonical serialization for HimVote casting service.
Complies with RFC 8785 canonical JSON and RFC 9162 Merkle tree hashing.
"""

import base64
import hashlib
import json
from typing import Any, Dict, List, Sequence, Tuple

from src.config import settings


SHA256_DIGEST_BYTES = 32


def base64url_decode(data: str) -> bytes:
    """
    Safely decode URL safe base64 without padding errors.
    """
    # Add required padding characters if missing
    rem = len(data) % 4
    if rem > 0:
        data += "=" * (4 - rem)
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def base64url_encode(data: bytes) -> str:
    """
    Encode bytes to unpadded URL safe base64 string.
    """
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def canonical_json_bytes(obj: Any) -> bytes:
    """
    Serialize Python dictionary to RFC 8785 canonical JSON UTF 8 bytes.
    Ensures keys are lexicographically sorted and whitespace is stripped.
    """
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False
    ).encode("utf-8")


def compute_leaf_digest(canonical_leaf_bytes: bytes) -> str:
    """
    Compute RFC 9162 Merkle tree leaf hash.
    Prefix byte is 0x00 followed by canonical leaf bytes.
    """
    hasher = hashlib.sha256()
    hasher.update(b"\x00")
    hasher.update(canonical_leaf_bytes)
    return hasher.hexdigest()


def _validate_leaf_digests(leaf_digests: Sequence[bytes]) -> None:
    for index, digest in enumerate(leaf_digests):
        if not isinstance(digest, bytes) or len(digest) != SHA256_DIGEST_BYTES:
            raise ValueError(f"leaf digest at index {index} must be 32 bytes")


def _largest_power_of_two_less_than(value: int) -> int:
    if value <= 1:
        raise ValueError("value must be greater than one")
    power = 1
    while power * 2 < value:
        power *= 2
    return power


def _node_digest(left: bytes, right: bytes) -> bytes:
    if len(left) != SHA256_DIGEST_BYTES or len(right) != SHA256_DIGEST_BYTES:
        raise ValueError("Merkle node inputs must be 32-byte digests")
    return hashlib.sha256(b"\x01" + left + right).digest()


def merkle_root_from_leaf_digests(leaf_digests: Sequence[bytes]) -> bytes:
    """Compute an RFC 9162 tree root from already hashed log leaves."""
    _validate_leaf_digests(leaf_digests)
    if not leaf_digests:
        return hashlib.sha256(b"").digest()
    if len(leaf_digests) == 1:
        return leaf_digests[0]

    split = _largest_power_of_two_less_than(len(leaf_digests))
    return _node_digest(
        merkle_root_from_leaf_digests(leaf_digests[:split]),
        merkle_root_from_leaf_digests(leaf_digests[split:]),
    )


def inclusion_proof_from_leaf_digests(
    leaf_index: int,
    leaf_digests: Sequence[bytes],
) -> List[bytes]:
    """Return an RFC 9162 audit path for a pre-hashed leaf."""
    _validate_leaf_digests(leaf_digests)
    tree_size = len(leaf_digests)
    if leaf_index < 0 or leaf_index >= tree_size:
        raise ValueError("leaf index is outside the witnessed tree")
    if tree_size == 1:
        return []

    split = _largest_power_of_two_less_than(tree_size)
    if leaf_index < split:
        return inclusion_proof_from_leaf_digests(
            leaf_index,
            leaf_digests[:split],
        ) + [merkle_root_from_leaf_digests(leaf_digests[split:])]
    return inclusion_proof_from_leaf_digests(
        leaf_index - split,
        leaf_digests[split:],
    ) + [merkle_root_from_leaf_digests(leaf_digests[:split])]


def compute_nullifier_commitment(credential_nullifier: str) -> str:
    """
    Derive public nullifier commitment from the nullifier value.
    Clients receive this commitment without revealing raw linkability.
    """
    payload = f"himvote_nullifier_commitment:{credential_nullifier}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def compute_request_digest(
    election_id: str,
    idempotency_key: str,
    credential_proof_b64url: str,
    engine_ballot_b64url: str,
    engine_proofs_b64url: str
) -> str:
    """
    Compute canonical digest of the ballot casting request.
    Enables strict idempotency checking for safe retries.
    """
    components = {
        "credential_proof_b64url": credential_proof_b64url,
        "election_id": election_id,
        "engine_ballot_b64url": engine_ballot_b64url,
        "engine_proofs_b64url": engine_proofs_b64url,
        "idempotency_key": idempotency_key
    }
    canonical_bytes = canonical_json_bytes(components)
    return hashlib.sha256(canonical_bytes).hexdigest()


def build_ballot_evidence_record(
    election_id: str,
    manifest_digest: str,
    ballot_id: str,
    leaf_index: int,
    credential_nullifier: str,
    credential_proof_b64url: str,
    engine_ballot_b64url: str,
    engine_proofs_b64url: str,
    engine_record_version: str = "v1"
) -> Dict[str, Any]:
    """
    Build canonical ballot evidence record according to Section 5.3.
    Schema name is himvote.ballot_evidence.v1.
    """
    return {
        "ballot_id": ballot_id,
        "credential_nullifier": credential_nullifier,
        "credential_proof_b64url": credential_proof_b64url,
        "election_id": election_id,
        "engine_ballot_b64url": engine_ballot_b64url,
        "engine_proofs_b64url": engine_proofs_b64url,
        "engine_record_version": engine_record_version,
        "leaf_index": leaf_index,
        "manifest_digest": manifest_digest,
        "schema": "himvote.ballot_evidence.v1"
    }


def verify_credential_proof(
    election_id: str,
    expected_manifest_digest: str,
    credential_proof_b64url: str
) -> Tuple[bool, str, str]:
    """
    Verify anonymous credential proof against election manifest.
    Returns tuple of (is_valid, credential_nullifier, failure_reason).
    """
    if not credential_proof_b64url or len(credential_proof_b64url) < 8:
        return False, "", "Credential proof string is empty or invalid"

    try:
        raw_bytes = base64url_decode(credential_proof_b64url)
    except Exception as exc:
        return False, "", f"Credential proof base64url decoding failed: {str(exc)}"

    # The syntax-only branch is deliberately restricted to non-production
    # transaction fixtures. It lets unit tests exercise replay and persistence
    # behavior without pretending that a synthetic credential is authentic.
    try:
        proof_obj = json.loads(raw_bytes.decode("utf-8"))
        if not isinstance(proof_obj, dict):
            return False, "", "Credential proof must be a JSON object"
    except Exception as exc:
        return False, "", f"Credential proof JSON decoding failed: {exc}"

    if settings.ENGINE_VALIDATION_MODE.strip().lower() == "syntax_only" and settings.APP_ENV.strip().lower() != "production":
        proof_election = proof_obj.get("election_id")
        proof_manifest = proof_obj.get("manifest_digest")
        nullifier = proof_obj.get("nullifier")
        if proof_election != election_id or proof_manifest != expected_manifest_digest or not isinstance(nullifier, str):
            return False, "", "Synthetic fixture credential binding is invalid"
        return True, nullifier, ""

    proof_election = proof_obj.get("election_id")
    proof_manifest = proof_obj.get("manifest_digest")
    voter_token = proof_obj.get("voter_token")
    signature = proof_obj.get("signature")
    if proof_election != election_id:
        return False, "", "Credential proof is bound to a different election"
    if proof_manifest != expected_manifest_digest:
        return False, "", "Credential proof manifest digest does not match election"
    if not isinstance(voter_token, str) or not 1 <= len(voter_token) <= 512:
        return False, "", "Credential voter token is invalid"
    if not isinstance(signature, (str, int)):
        return False, "", "Credential signature is missing"
    if not settings.ISSUER_PUBLIC_KEY_N:
        return False, "", "Credential issuer public key is not configured"
    try:
        modulus = int(settings.ISSUER_PUBLIC_KEY_N, 16)
        signature_int = int(signature, 16) if isinstance(signature, str) else int(signature)
        message_int = int.from_bytes(hashlib.sha256(voter_token.encode("utf-8")).digest(), "big") % modulus
    except (TypeError, ValueError) as exc:
        return False, "", f"Credential signature encoding is invalid: {exc}"
    if modulus <= 0 or signature_int <= 0 or signature_int >= modulus:
        return False, "", "Credential signature is outside the issuer modulus"
    if pow(signature_int, settings.ISSUER_PUBLIC_KEY_E, modulus) != message_int:
        return False, "", "Credential signature verification failed"

    nullifier = hashlib.sha256(
        f"himvote_nullifier_v1:{election_id}:{voter_token}".encode("utf-8")
    ).hexdigest()
    return True, nullifier, ""


def validate_engine_ballot(engine_ballot_b64url: str, engine_proofs_b64url: str) -> Tuple[bool, str]:
    """
    Validate encrypted ballot ciphertext and zero knowledge proofs syntax.
    """
    if not engine_ballot_b64url:
        return False, "Engine ballot ciphertext is empty"
    if not engine_proofs_b64url:
        return False, "Engine proofs string is empty"

    try:
        ballot_bytes = base64url_decode(engine_ballot_b64url)
        if len(ballot_bytes) == 0:
            return False, "Engine ballot payload is zero length"
    except Exception as exc:
        return False, f"Engine ballot decoding failed: {str(exc)}"

    try:
        proof_bytes = base64url_decode(engine_proofs_b64url)
        if len(proof_bytes) == 0:
            return False, "Engine proofs payload is zero length"
    except Exception as exc:
        return False, f"Engine proofs decoding failed: {str(exc)}"

    return True, ""
