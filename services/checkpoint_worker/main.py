"""
HimVote Checkpoint Worker FastAPI Application.

One writer per election. Reads outbox rows in leaf index order, never skips
a gap, builds the RFC 9162 Merkle tree, produces checkpoints, sends them to
the witness, retries idempotently, resumes from the last acknowledged tree size.

A duplicate leaf index with a different hash is a hard fault and sets the
election to DISPUTED.
"""

import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from checkpoint_worker.config import settings
from checkpoint_worker.models.database import Base, ElectionState, CheckpointOutbox
from checkpoint_worker.witness_client import WitnessClient
from checkpoint_worker.worker import CheckpointWorker
from checkpoint_worker.exceptions import (
    DisputedTreeError,
    WitnessConnectionError,
    InvalidWitnessSignatureError,
    WitnessRejectionError,
)

logger = logging.getLogger("checkpoint_worker")

db_url = settings.get_database_url()
engine = create_engine(db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

witness_client = WitnessClient(
    witness_url=settings.WITNESS_URL,
    pinned_witness_public_key=settings.WITNESS_PUBLIC_KEY,
    timeout_seconds=settings.WITNESS_TIMEOUT_SECONDS,
    max_retries=settings.WITNESS_MAX_RETRIES,
    retry_backoff_base=settings.WITNESS_RETRY_BACKOFF_BASE,
)

worker = CheckpointWorker(
    session_factory=SessionLocal,
    witness_client=witness_client,
    log_writer_private_key_raw=settings.LOG_WRITER_PRIVATE_KEY,
    log_writer_key_id=settings.LOG_WRITER_KEY_ID,
    batch_size=settings.BATCH_SIZE,
)


def get_db():
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context."""
    Base.metadata.create_all(bind=engine)
    logger.info("HimVote checkpoint worker application started")
    yield


app = FastAPI(
    title="HimVote Checkpoint Worker",
    version="2.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["worker"])
def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "checkpoint_worker"}


@app.post("/v1/checkpoint/process", tags=["worker"])
def process_all_checkpoints():
    """
    Process unacknowledged outbox items across all active elections in strict leaf index order.
    """
    try:
        results = worker.poll_once()
        return {"status": "processed", "results": results}
    except DisputedTreeError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Election marked DISPUTED due to conflict: {str(exc)}",
        )
    except Exception as exc:
        logger.exception("Processing error in worker: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@app.post("/v1/checkpoint/process/{election_id}", tags=["worker"])
def process_single_election(election_id: str):
    """
    Process pending outbox leaves for a single election.
    """
    try:
        result = worker.process_election(election_id)
        if result:
            return {"status": "processed", "result": result}
        return {"status": "no_pending_leaves", "election_id": election_id}
    except DisputedTreeError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Election {election_id} marked DISPUTED: {str(exc)}",
        )
    except (WitnessConnectionError, WitnessRejectionError, InvalidWitnessSignatureError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Witness error: {str(exc)}",
        )
