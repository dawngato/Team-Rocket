"""
HimVote Independent Witness Service package.
Provides tamper evident checkpoint verification and anti truncation log witnessing.
"""

from witness.canonical import canonical_json_bytes, canonical_json_str
from witness.crypto import (
    KeyManager,
    merkle_tree_hash,
    generate_consistency_proof,
    verify_consistency_proof,
    compute_witness_binding
)
from witness.models import (
    CheckpointRecord,
    CheckpointSubmission,
    FinalCheckpointSubmission,
    WitnessAcknowledgement,
    FinalCheckpointResponse
)
from witness.service import WitnessService
from witness.app import create_app, app

__all__ = [
    "canonical_json_bytes",
    "canonical_json_str",
    "KeyManager",
    "merkle_tree_hash",
    "generate_consistency_proof",
    "verify_consistency_proof",
    "compute_witness_binding",
    "CheckpointRecord",
    "CheckpointSubmission",
    "FinalCheckpointSubmission",
    "WitnessAcknowledgement",
    "FinalCheckpointResponse",
    "WitnessService",
    "create_app",
    "app",
]
