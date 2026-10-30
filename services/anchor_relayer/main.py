"""HTTP boundary for durable checkpoint ingestion.

This module deliberately only accepts a witnessed checkpoint into the relayer's
transactional outbox. It does not manufacture transaction hashes, simulate a
block, or claim finality. Broadcasting and confirmation are performed by
``AnchorRelayerService`` when a configured chain signer and node are available.
"""

import logging
import os
import sqlite3
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from anchor_relayer.models import OutboxRecord, OutboxStatus, WitnessedCheckpoint
from anchor_relayer.storage import SQLiteOutboxRepository


def _normalize_bytes32(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("value must be a hexadecimal string")
    normalized = value[2:] if value.startswith(("0x", "0X")) else value
    if len(normalized) != 64:
        raise ValueError("value must contain exactly 32 bytes")
    try:
        bytes.fromhex(normalized)
    except ValueError as exc:
        raise ValueError("value must contain only hexadecimal characters") from exc
    return "0x" + normalized.lower()


def _configured_log_level() -> int:
    configured = os.getenv("LOG_LEVEL", "INFO").upper()
    return getattr(logging, configured, logging.INFO)


logging.basicConfig(level=_configured_log_level())
logger = logging.getLogger("anchor_relayer")

RELAYER_KEY_ID = os.getenv("ANCHOR_RELAYER_KEY_ID", "local_relayer_key")
OUTBOX_DATABASE_PATH = os.getenv("OUTBOX_DATABASE_PATH", ":memory:")

try:
    repository = SQLiteOutboxRepository(database_path=OUTBOX_DATABASE_PATH)
except (OSError, sqlite3.Error) as exc:
    raise RuntimeError("anchor relayer outbox could not be initialized") from exc


class AnchorRequest(BaseModel):
    election_id: str = Field(min_length=1, max_length=128)
    commitment: str
    sequence: int = Field(ge=1)
    digest: str
    previous_digest: str
    is_final: bool
    witness_signature: Optional[str] = None

    @field_validator("commitment", "digest", "previous_digest")
    @classmethod
    def validate_bytes32(cls, value: str) -> str:
        return _normalize_bytes32(value)


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
    logger.info(
        "Anchor relayer started key_id=%s anchoring_mode=transactional_outbox",
        RELAYER_KEY_ID,
    )


@app.get("/health", tags=["admin"])
def health() -> dict[str, object]:
    return {
        "status": "healthy",
        "service": "anchor_relayer",
        "key_id": RELAYER_KEY_ID,
        "anchoring_mode": "transactional_outbox",
        "finality": "confirmation_poller_required",
        "independence": "not_claimed",
    }


@app.post("/v1/anchor", response_model=AnchorResponse, tags=["anchor"])
def anchor_checkpoint(req: AnchorRequest) -> AnchorResponse:
    """Persist a witnessed checkpoint without claiming chain inclusion."""
    checkpoint = WitnessedCheckpoint(
        election_commitment=req.commitment,
        sequence=req.sequence,
        digest=req.digest,
        previous_digest=req.previous_digest,
        is_final=req.is_final,
        witness_signature=req.witness_signature,
    )
    try:
        record = repository.enqueue(checkpoint)
    except ValueError as exc:
        if "conflicting checkpoint" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="checkpoint conflicts with an existing immutable sequence",
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
        commitment = _normalize_bytes32(election_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    record = repository.get_latest_for_election(commitment)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No anchor for commitment")
    return _record_response(record)


@app.post("/v1/anchor/reconcile/{tx_hash}", tags=["anchor"])
def reconcile_anchor(tx_hash: str) -> dict[str, object]:
    """Read a locally durable transaction outcome after an unknown response."""
    record = repository.get_by_tx_hash(tx_hash)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return {"status": record.status.value, "record": _record_response(record).model_dump()}
