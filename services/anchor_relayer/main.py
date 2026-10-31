"""HTTP boundary for durable checkpoint ingestion.

This module deliberately only accepts a witnessed checkpoint into the relayer's
transactional outbox. It does not manufacture transaction hashes, simulate a
block, or claim finality. Broadcasting and confirmation are performed by
``AnchorRelayerService`` when a configured chain signer and node are available.
"""

import logging
import os
import sqlite3
import json
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict

from anchor_relayer.models import OutboxRecord, OutboxStatus, WitnessedCheckpoint
from anchor_relayer.storage import SQLiteOutboxRepository
from anchor_relayer.witness_verification import (
    WitnessTrustError,
    normalize_chain_commitment,
    resolve_election_commitment,
    verify_witness_acknowledgement,
)


def _configured_log_level() -> int:
    configured = os.getenv("LOG_LEVEL", "INFO").upper()
    return getattr(logging, configured, logging.INFO)


logging.basicConfig(level=_configured_log_level())
logger = logging.getLogger("anchor_relayer")

RELAYER_KEY_ID = os.getenv("ANCHOR_RELAYER_KEY_ID", "local_relayer_key")
OUTBOX_DATABASE_PATH = os.getenv("OUTBOX_DATABASE_PATH", "anchor_outbox.sqlite")
WITNESS_PUBLIC_KEY = os.getenv("WITNESS_PUBLIC_KEY")
try:
    WITNESS_ELECTION_COMMITMENTS = json.loads(
        os.getenv("WITNESS_ELECTION_COMMITMENTS", "{}").strip() or "{}"
    )
except json.JSONDecodeError as exc:
    raise RuntimeError("WITNESS_ELECTION_COMMITMENTS must be a JSON object") from exc
if not isinstance(WITNESS_ELECTION_COMMITMENTS, dict):
    raise RuntimeError("WITNESS_ELECTION_COMMITMENTS must map election IDs to chain commitments")

try:
    repository = SQLiteOutboxRepository(database_path=OUTBOX_DATABASE_PATH)
except (OSError, sqlite3.Error) as exc:
    raise RuntimeError("anchor relayer outbox could not be initialized") from exc


class AnchorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    witness_ack: dict[str, Any]


class AnchorResponse(BaseModel):
    status: str
    tx_hash: Optional[str] = None
    block_hash: Optional[str] = None
    confirmations: int = 0
    finalized: bool = False


app = FastAPI(title="HimVote Anchor Relayer", version="2.0.0")


def _record_response(record: OutboxRecord) -> AnchorResponse:
    return AnchorResponse(
        status=record.status.value,
        tx_hash=record.tx_hash,
        block_hash=record.block_hash,
        confirmations=record.confirmation_count,
        finalized=record.status == OutboxStatus.ANCHOR_FINALIZED,
    )


@app.on_event("startup")
def startup() -> None:
    if not WITNESS_PUBLIC_KEY:
        logger.error("WITNESS_PUBLIC_KEY is missing; checkpoint ingestion will remain unavailable")
    if not WITNESS_ELECTION_COMMITMENTS:
        logger.error("WITNESS_ELECTION_COMMITMENTS is empty; no election can be anchored")
    logger.info(
        "Anchor relayer started key_id=%s anchoring_mode=transactional_outbox",
        RELAYER_KEY_ID,
    )


@app.get("/health", tags=["admin"])
def health() -> dict[str, object]:
    trust_configured = bool(WITNESS_PUBLIC_KEY and WITNESS_ELECTION_COMMITMENTS)
    worker_enabled = os.getenv("ANCHOR_WORKER_ENABLED", "false").lower() in {"1", "true", "yes"}
    return {
        "status": "ready" if trust_configured and worker_enabled else "degraded",
        "service": "anchor_relayer",
        "key_id": RELAYER_KEY_ID,
        "anchoring_mode": "transactional_outbox",
        "witness_trust_configured": trust_configured,
        "worker_enabled": worker_enabled,
        "finality": "confirmation_poller_required",
        "independence": "not_claimed",
    }


@app.post("/v1/anchor", response_model=AnchorResponse, tags=["anchor"])
def anchor_checkpoint(req: AnchorRequest) -> AnchorResponse:
    """Verify a pinned witness acknowledgement and persist it without claiming inclusion."""
    if not WITNESS_PUBLIC_KEY or not WITNESS_ELECTION_COMMITMENTS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WITNESS_PUBLIC_KEY and WITNESS_ELECTION_COMMITMENTS must be configured before accepting witness acknowledgements.",
        )
    try:
        verified = verify_witness_acknowledgement(req.witness_ack, WITNESS_PUBLIC_KEY)
        commitment = resolve_election_commitment(
            verified["election_id"], WITNESS_ELECTION_COMMITMENTS
        )
    except WitnessTrustError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    checkpoint = WitnessedCheckpoint(
        election_commitment=commitment,
        sequence=verified["sequence"],
        digest=verified["digest"],
        previous_digest=verified["previous_digest"],
        is_final=verified["is_final"],
        witness_signature=verified["witness_signature"],
    )
    try:
        record = repository.enqueue(checkpoint)
    except ValueError as exc:
        if "conflicting checkpoint" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cryptographic Checkpoint conflicts with an existing immutable sequence.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return _record_response(record)


@app.get("/v1/anchor/{election_id}", response_model=AnchorResponse, tags=["anchor"])
def get_anchor(election_id: str) -> AnchorResponse:
    """Return the latest durable record for an election commitment.

    The legacy route parameter is named ``election_id``. The relayer stores
    only the public bytes32 election commitment, so callers must pass that
    commitment rather than an identity-bearing election identifier.
    """
    try:
        commitment = normalize_chain_commitment(election_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    record = repository.get_latest_for_election(commitment)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Cryptographic Checkpoint anchor found for the specified commitment.")
    return _record_response(record)


@app.post("/v1/anchor/reconcile/{tx_hash}", tags=["anchor"])
def reconcile_anchor(tx_hash: str) -> dict[str, object]:
    """Read a locally durable transaction outcome after an unknown response."""
    record = repository.get_by_tx_hash(tx_hash)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cryptographic Checkpoint anchoring transaction not found.")
    return {
        "status": record.status.value,
        "tx_hash": record.tx_hash,
        "block_number": record.block_number,
        "block_hash": record.block_hash,
        "confirmations": record.confirmation_count,
        "finalized": record.status == OutboxStatus.ANCHOR_FINALIZED,
    }
