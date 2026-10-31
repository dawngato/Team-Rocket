"""Verify signed witness acknowledgements using the configured trust pin."""

import hashlib
import json
from typing import Any, Mapping

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


class WitnessTrustError(ValueError):
    """Raised when an acknowledgement cannot be trusted or mapped to the chain."""


def _canonical_json_bytes(value: Any) -> bytes:
    """Serialize checkpoint data with the witness service's canonical JSON rules."""
    def normalize(item: Any) -> Any:
        if isinstance(item, float):
            raise WitnessTrustError("floating point values are not allowed in checkpoints")
        if isinstance(item, dict):
            if any(not isinstance(key, str) for key in item):
                raise WitnessTrustError("checkpoint keys must be strings")
            return {
                key: normalize(item[key])
                for key in sorted(item, key=lambda key: key.encode("utf-16-be"))
            }
        if isinstance(item, list):
            return [normalize(child) for child in item]
        if item is None or isinstance(item, (str, int, bool)):
            return item
        raise WitnessTrustError(f"unsupported checkpoint value: {type(item).__name__}")

    try:
        return json.dumps(
            normalize(value), ensure_ascii=False, separators=(",", ":"), allow_nan=False
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise WitnessTrustError("checkpoint is not canonical JSON") from exc


def _normalize_bytes32(value: Any, field: str, *, allow_none: bool = False) -> str:
    if value is None and allow_none:
        return "0x" + "0" * 64
    if not isinstance(value, str):
        raise WitnessTrustError(f"{field} must be a hexadecimal bytes32 value")
    normalized = value[2:] if value.startswith(("0x", "0X")) else value
    if len(normalized) != 64:
        raise WitnessTrustError(f"{field} must contain exactly 32 bytes")
    try:
        decoded = bytes.fromhex(normalized)
    except ValueError as exc:
        raise WitnessTrustError(f"{field} is not hexadecimal") from exc
    if len(decoded) != 32:
        raise WitnessTrustError(f"{field} must decode to exactly 32 bytes")
    return "0x" + normalized.lower()


def normalize_chain_commitment(value: Any) -> str:
    """Normalize a public EVM bytes32 commitment for lookup routes."""
    return _normalize_bytes32(value, "commitment")


def _normalize_public_key(value: Any, label: str) -> str:
    if not isinstance(value, str):
        raise WitnessTrustError(f"{label} must be a hexadecimal Ed25519 public key")
    normalized = value[2:] if value.startswith(("0x", "0X")) else value
    if len(normalized) != 64:
        raise WitnessTrustError(f"{label} must contain 32 bytes")
    try:
        decoded = bytes.fromhex(normalized)
    except ValueError as exc:
        raise WitnessTrustError(f"{label} is not hexadecimal") from exc
    if len(decoded) != 32:
        raise WitnessTrustError(f"{label} must decode to exactly 32 bytes")
    return normalized.lower()


def verify_witness_acknowledgement(
    acknowledgement: Mapping[str, Any], pinned_public_key: str | None
) -> dict[str, Any]:
    """Validate the ack structure, pinned key, canonical digest, and signature."""
    if not pinned_public_key:
        raise WitnessTrustError("WITNESS_PUBLIC_KEY must be configured before accepting checkpoints")
    if not isinstance(acknowledgement, Mapping):
        raise WitnessTrustError("witness acknowledgement must be an object")

    required = (
        "election_id", "checkpoint_sequence", "witness_sequence",
        "previous_witness_sequence", "checkpoint_digest", "checkpoint",
        "witness_public_key", "witness_signature",
    )
    missing = [name for name in required if name not in acknowledgement]
    if missing:
        raise WitnessTrustError("witness acknowledgement is missing: " + ", ".join(missing))

    election_id = acknowledgement["election_id"]
    checkpoint = acknowledgement["checkpoint"]
    if not isinstance(election_id, str) or not election_id.strip() or not isinstance(checkpoint, dict):
        raise WitnessTrustError("witness acknowledgement has an invalid election or checkpoint")
    if checkpoint.get("election_id") != election_id:
        raise WitnessTrustError("witness election ID does not match checkpoint election ID")

    sequence = acknowledgement["checkpoint_sequence"]
    witness_sequence = acknowledgement["witness_sequence"]
    previous_witness_sequence = acknowledgement["previous_witness_sequence"]
    for field, value in (
        ("checkpoint_sequence", sequence),
        ("witness_sequence", witness_sequence),
        ("previous_witness_sequence", previous_witness_sequence),
    ):
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise WitnessTrustError(f"{field} must be a non-negative integer")
    checkpoint_sequence = checkpoint.get("checkpoint_sequence")
    if (
        sequence < 1
        or isinstance(checkpoint_sequence, bool)
        or not isinstance(checkpoint_sequence, int)
        or checkpoint_sequence != sequence
    ):
        raise WitnessTrustError("witness sequence does not match checkpoint sequence")
    if witness_sequence != previous_witness_sequence + 1:
        raise WitnessTrustError("witness acknowledgement sequence binding is invalid")
    if witness_sequence != sequence:
        raise WitnessTrustError("witness sequence does not match checkpoint sequence")
    checkpoint_kind = checkpoint.get("checkpoint_kind")
    if checkpoint_kind not in ("INCREMENTAL", "FINAL"):
        raise WitnessTrustError("checkpoint kind must be INCREMENTAL or FINAL")

    checkpoint_bytes = _canonical_json_bytes(checkpoint)
    digest = hashlib.sha256(checkpoint_bytes).hexdigest()
    if _normalize_bytes32(acknowledgement["checkpoint_digest"], "checkpoint_digest")[2:] != digest:
        raise WitnessTrustError("checkpoint digest does not match its canonical contents")

    pinned = _normalize_public_key(pinned_public_key, "WITNESS_PUBLIC_KEY")
    actual_key = _normalize_public_key(acknowledgement["witness_public_key"], "witness_public_key")
    if actual_key != pinned:
        raise WitnessTrustError("witness public key does not match configured WITNESS_PUBLIC_KEY")
    signature = acknowledgement["witness_signature"]
    if not isinstance(signature, str):
        raise WitnessTrustError("witness_signature must be hexadecimal")
    try:
        signature_bytes = bytes.fromhex(signature.removeprefix("0x"))
        public_key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(actual_key))
        binding = (
            f"HIMVOTE_WITNESS_V1:{election_id}:{previous_witness_sequence}:".encode("utf-8")
            + checkpoint_bytes
        )
        public_key.verify(signature_bytes, binding)
    except (ValueError, InvalidSignature) as exc:
        raise WitnessTrustError("witness signature verification failed") from exc

    if acknowledgement.get("status") not in (None, "ACCEPTED", "FINAL"):
        raise WitnessTrustError("witness acknowledgement status is not accepted")
    expected_final = checkpoint_kind == "FINAL"
    if acknowledgement.get("is_final") not in (None, expected_final):
        raise WitnessTrustError("witness finality flag does not match checkpoint kind")

    raw_previous_digest = checkpoint.get("previous_checkpoint_digest")
    if (sequence == 1) != (raw_previous_digest is None):
        raise WitnessTrustError("previous checkpoint digest does not match the initial sequence")
    previous_digest = _normalize_bytes32(
        raw_previous_digest,
        "previous_checkpoint_digest",
        allow_none=True,
    )
    return {
        "election_id": election_id,
        "sequence": sequence,
        "digest": "0x" + digest,
        "previous_digest": previous_digest,
        "is_final": expected_final,
        "witness_signature": signature,
        "checkpoint": checkpoint,
    }


def resolve_election_commitment(election_id: str, mappings: Mapping[str, str]) -> str:
    """Resolve the explicitly configured chain commitment for an election ID."""
    commitment = mappings.get(election_id)
    if not commitment:
        raise WitnessTrustError(
            f"no chain commitment is configured for witnessed election {election_id!r}"
        )
    return _normalize_bytes32(commitment, "configured election commitment")
