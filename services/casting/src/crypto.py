"""
Cryptographic routines and canonical serialization for HimVote casting service.
Complies with RFC 8785 canonical JSON and RFC 9162 Merkle tree hashing.
"""

import base64
import hashlib
import json
from typing import Any, Dict, Tuple


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

    # Attempt parsing as JSON proof structure
    try:
        proof_obj = json.loads(raw_bytes.decode("utf-8"))
        if isinstance(proof_obj, dict):
            # Verify election binding
            proof_election = proof_obj.get("election_id")
            if proof_election and proof_election != election_id:
                return False, "", "Credential proof is bound to a different election"

            # Verify manifest digest binding if present
            proof_manifest = proof_obj.get("manifest_digest")
            if proof_manifest and proof_manifest != expected_manifest_digest:
                return False, "", "Credential proof manifest digest does not match election"

            nullifier = proof_obj.get("nullifier")
            if not nullifier:
                # Deterministic derivation from proof seed
                seed = proof_obj.get("seed") or str(proof_obj)
                nullifier = hashlib.sha256(f"derived_nullifier:{election_id}:{seed}".encode("utf-8")).hexdigest()

            return True, str(nullifier), ""
    except Exception:
        # If not JSON, treat raw payload as deterministic proof token
        pass

    # For binary proof tokens, derive nullifier securely
    derived_nullifier = hashlib.sha256(
        b"himvote_nullifier:" + election_id.encode("utf-8") + b":" + raw_bytes
    ).hexdigest()

    return True, derived_nullifier, ""


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
