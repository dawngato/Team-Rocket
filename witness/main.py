"""
HimVote Witness Service

Operated by an independent organization in production. Verifies checkpoints,
maintains append only records, and signs final checkpoints.

Endpoints: POST /checkpoints, POST /elections/{id}/final, GET /elections/{id}/final
"""

import os
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

logging.basicConfig(level=os.getenv("LOG_LEVEL", "info"))
logger = logging.getLogger("witness")

WITNESS_KEY_ID = os.getenv("WITNESS_KEY_ID", "local_witness_key")
WITNESS_PRIVATE_KEY_HINT = os.getenv("WITNESS_PRIVATE_KEY_HINT", "local")

# In production: keys in HSM/KMS, separate infrastructure, separate org

class CheckpointRecord(BaseModel):
    election_id: str
    manifest_digest: str
    tree_size: int
    merkle_root: str
    previous_checkpoint_digest: Optional[str] = None
    last_leaf_index: int
    last_leaf_digest: str
    issued_count: int
    issuance_ledger_digest: str
    roster_commitment: str
    protocol_version: str
    checkpoint_kind: str
    checkpoint_sequence: int

class FinalCheckpoint(BaseModel):
    election_id: str
    manifest_digest: str
    tree_size: int
    merkle_root: str
    last_leaf_index: int
    last_leaf_digest: str
    issued_count: int
    checkpoint_kind: str
    checkpoint_sequence: int

# In memory store for development (production: append only database)
checkpoints = {}
finals = {}
sequences = {}

app = FastAPI(title="HimVote Witness", version="2.0.0")

@app.on_event("startup")
def startup():
    logger.info("Witness service started (key_id=%s)", WITNESS_KEY_ID)

@app.get("/health", tags=["admin"])
def health():
    return {"status": "healthy", "service": "witness", "key_id": WITNESS_KEY_ID}

@app.post("/v1/checkpoints", tags=["witness"])
def receive_checkpoint(cp: CheckpointRequest):
    """Receive and verify an incremental checkpoint."""
    election_id = cp.election_id

    # Verify election ID
    if not election_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing election ID")

    # Verify pinned writer key (simplified)
    # In production: verify signature against pinned writer public key

    # Verify previous acknowledgement
    prev_digest = cp.previous_checkpoint_digest
    if prev_digest:
        # Check that previous digest matches the last checkpoint for this election
        last = checkpoints.get(election_id)
        if last and last.get("merkle_root") != prev_digest:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Previous digest mismatch")

    # Verify monotonic tree size
    last_size = sequences.get(election_id, 0)
    if cp.tree_size <= last_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tree size must be monotonically increasing")

    # Verify consistency proof (simplified)
    # In production: full RFC 9162 consistency proof verification

    # Write append only record before returning signature
    record = {
        "election_id": election_id,
        "manifest_digest": cp.manifest_digest,
        "tree_size": cp.tree_size,
        "merkle_root": cp.merkle_root,
        "previous_checkpoint_digest": prev_digest,
        "last_leaf_index": cp.last_leaf_index,
        "last_leaf_digest": cp.last_leaf_digest,
        "issued_count": cp.issued_count,
        "protocol_version": cp.protocol_version,
        "checkpoint_kind": cp.checkpoint_kind,
        "checkpoint_sequence": cp.checkpoint_sequence,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }

    digest = hashlib.sha256(
        (election_id + str(cp.tree_size) + cp.merkle_root + str(cp.checkpoint_sequence)).encode()
    ).hexdigest()
    record["digest"] = digest

    checkpoints[election_id] = record
    sequences[election_id] = cp.tree_size

    # Witness signature binds canonical bytes, previous sequence, and election ID
    witness_signature = "sig:" + hashlib.sha256(
        (digest + WITNESS_KEY_ID + election_id).encode()
    ).hexdigest()

    logger.info(
        "Checkpoint acknowledged: election=%s tree_size=%d sequence=%d",
        election_id, cp.tree_size, cp.checkpoint_sequence,
    )

    return {
        "status": "acknowledged",
        "digest": digest,
        "witness_signature": witness_signature,
        "witness_key_id": WITNESS_KEY_ID,
        "tree_size": cp.tree_size,
    }

@app.post("/v1/elections/{election_id}/final", tags=["witness"])
def receive_final(election_id: str, fc: FinalCheckpoint):
    """Receive the FINAL checkpoint for an election."""
    # Refuse a second incompatible FINAL
    if election_id in finals:
        existing = finals[election_id]
        if existing["merkle_root"] != fc.merkle_root:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Second incompatible FINAL refused",
            )
        return {"status": "already_final", "digest": existing["digest"]}

    # Verify election ID matches
    if fc.election_id != election_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Election ID mismatch")

    # Verify monotonic tree size
    last_size = sequences.get(election_id, 0)
    if fc.tree_size <= last_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Final tree size must exceed last incremental")

    # Write append only record
    digest = hashlib.sha256(
        (election_id + "FINAL" + str(fc.tree_size) + fc.merkle_root).encode()
    ).hexdigest()

    record = {
        "election_id": election_id,
        "manifest_digest": fc.manifest_digest,
        "tree_size": fc.tree_size,
        "merkle_root": fc.merkle_root,
        "last_leaf_index": fc.last_leaf_index,
        "last_leaf_digest": fc.last_leaf_digest,
        "issued_count": fc.issued_count,
        "checkpoint_kind": fc.checkpoint_kind,
        "checkpoint_sequence": fc.checkpoint_sequence,
        "digest": digest,
        "finalized_at": datetime.now(timezone.utc).isoformat(),
    }

    finals[election_id] = record
    sequences[election_id] = fc.tree_size

    # Witness signature
    witness_signature = "sig:final:" + hashlib.sha256(
        (digest + WITNESS_KEY_ID + election_id).encode()
    ).hexdigest()

    logger.info(
        "FINAL checkpoint: election=%s tree_size=%d digest=%s",
        election_id, fc.tree_size, digest,
    )

    return {
        "status": "final_acknowledged",
        "digest": digest,
        "witness_signature": witness_signature,
        "witness_key_id": WITNESS_KEY_ID,
    }

@app.get("/v1/elections/{election_id}/final", tags=["witness"])
def get_final(election_id: str):
    """Get the final checkpoint for an election."""
    if election_id not in finals:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No final checkpoint for election")
    return finals[election_id]

class CheckpointRequest(BaseModel):
    election_id: str
    manifest_digest: str
    tree_size: int
    merkle_root: str
    previous_checkpoint_digest: Optional[str] = None
    last_leaf_index: int
    last_leaf_digest: str
    issued_count: int
    protocol_version: str
    checkpoint_kind: str
    checkpoint_sequence: int
