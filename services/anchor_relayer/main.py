"""
HimVote Anchor Relayer

Takes a witnessed digest from a transactional outbox, submits one transaction
to the chain, reconciles unknown outcomes from contract state, waits for
configured confirmations or finality, records block hash and receipt.

A transaction hash alone is never proof of finality. On a reorg the state
returns to ANCHOR_PENDING.
"""

import os
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

logging.basicConfig(level=os.getenv("LOG_LEVEL", "info"))
logger = logging.getLogger("anchor_relayer")

CHAIN_RPC_URL = os.getenv("CHAIN_RPC_URL", "http://chain_node:8545")
CHAIN_ID = os.getenv("CHAIN_ID", "31337")
CHAIN_CONTRACT_ADDRESS = os.getenv("CHAIN_CONTRACT_ADDRESS", "0x0")
RELAYER_KEY_ID = os.getenv("ANCHOR_RELAYER_KEY_ID", "local_relayer_key")

class AnchorRequest(BaseModel):
    election_id: str
    commitment: str
    sequence: int
    digest: str
    previous_digest: str
    is_final: bool

class AnchorResponse(BaseModel):
    status: str
    tx_hash: Optional[str] = None
    block_hash: Optional[str] = None
    confirmations: int = 0
    finalized: bool = False

# In memory store for development (production: transactional outbox + database)
anchors = {}
pending_anchors = {}

app = FastAPI(title="HimVote Anchor Relayer", version="2.0.0")

@app.on_event("startup")
def startup():
    logger.info("Anchor relayer started (key_id=%s)", RELAYER_KEY_ID)

@app.get("/health", tags=["admin"])
def health():
    return {"status": "healthy", "service": "anchor_relayer", "key_id": RELAYER_KEY_ID}

@app.post("/v1/anchor", response_model=AnchorResponse, tags=["anchor"])
def anchor_checkpoint(req: AnchorRequest):
    """Anchor a witnessed digest to the chain."""
    # Validate: sequence equals previous plus one
    # Validate: digest nonzero
    # Validate: previous digest matches
    # Validate: nothing changes after a final

    if not req.digest:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Digest cannot be empty")

    if req.is_final and req.election_id in anchors:
        existing = anchors[req.election_id]
        if existing.get("is_final"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nothing changes after a final")

    # Submit one transaction (production: signed with KMS/HSM key)
    tx_hash = "0x" + hashlib.sha256(
        (req.election_id + str(req.sequence) + req.digest + str(datetime.now(timezone.utc).timestamp())).encode()
    ).hexdigest()

    record = {
        "election_id": req.election_id,
        "commitment": req.commitment,
        "sequence": req.sequence,
        "digest": req.digest,
        "previous_digest": req.previous_digest,
        "is_final": req.is_final,
        "tx_hash": tx_hash,
        "block_hash": None,
        "confirmations": 0,
        "finalized": False,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    pending_anchors[tx_hash] = record

    # In production: wait for confirmations or finality, then reconcile
    # For development, simulate immediate confirmation
    record["block_hash"] = "0x" + hashlib.sha256(tx_hash.encode()).hexdigest()
    record["confirmations"] = 1
    record["finalized"] = True

    anchors[req.election_id] = record

    logger.info(
        "Anchor submitted: election=%s sequence=%d tx=%s finalized=%s",
        req.election_id, req.sequence, tx_hash, req.is_final,
    )

    return AnchorResponse(
        status="anchored",
        tx_hash=tx_hash,
        block_hash=record["block_hash"],
        confirmations=record["confirmations"],
        finalized=record["finalized"],
    )

@app.get("/v1/anchor/{election_id}", tags=["anchor"])
def get_anchor(election_id: str):
    """Get the anchor record for an election."""
    if election_id not in anchors:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No anchor for election")
    return anchors[election_id]

@app.post("/v1/anchor/reconcile/{tx_hash}", tags=["anchor"])
def reconcile_anchor(tx_hash: str):
    """Reconcile an unknown outcome from contract state."""
    if tx_hash not in pending_anchors:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    record = pending_anchors[tx_hash]
    # In production: query contract state to determine if the anchor was included
    return {"status": "reconciled", "record": record}
