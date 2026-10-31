"""
FastAPI application for HimVote Independent Witness service.
Exposes endpoints defined in Section 6.6 of prompt.md:
* POST /checkpoints
* POST /elections/{id}/final
* GET /elections/{id}/final
Includes health, public key distribution, and structured error responses.
"""

from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from witness.config import WitnessConfig, get_default_config
from witness.models import (
    CheckpointSubmission,
    FinalCheckpointSubmission,
    WitnessAcknowledgement,
    FinalCheckpointResponse
)
from witness.service import (
    WitnessService,
    WitnessServiceError,
    ElectionIdMismatchError,
    WriterSignatureVerificationError,
    ConsistencyProofVerificationError,
    InconsistentTreeRootError,
    FinalCheckpointNotFoundError
)
from witness.storage import (
    ElectionNotFoundError,
    ElectionAlreadyFinalizedError,
    ConflictingFinalCheckpointError,
    SequenceGapError,
    SequenceRollbackError,
    TreeSizeRollbackError,
    ManifestMismatchError,
    PreviousCheckpointMismatchError
)


def create_app(config: Optional[WitnessConfig] = None) -> FastAPI:
    """Factory creating and configuring the Witness FastAPI application."""
    cfg = config or get_default_config()
    service = WitnessService(cfg)

    app = FastAPI(
        title="HimVote Independent Witness Service",
        description="Tamper evident Merkle log witness and anti truncation service",
        version="1.0.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=getattr(cfg, "allowed_origins", ["http://localhost:3000", "http://127.0.0.1:3000"]),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # Attach service to app state
    app.state.service = service
    app.state.config = cfg

    @app.exception_handler(ElectionNotFoundError)
    async def election_not_found_handler(request: Request, exc: ElectionNotFoundError):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "ELECTION_NOT_FOUND", "detail": str(exc)}
        )

    @app.exception_handler(FinalCheckpointNotFoundError)
    async def final_not_found_handler(request: Request, exc: FinalCheckpointNotFoundError):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "FINAL_CHECKPOINT_NOT_FOUND", "detail": str(exc)}
        )

    @app.exception_handler(ElectionIdMismatchError)
    async def election_mismatch_handler(request: Request, exc: ElectionIdMismatchError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "ELECTION_ID_MISMATCH", "detail": str(exc)}
        )

    @app.exception_handler(WriterSignatureVerificationError)
    async def writer_sig_handler(request: Request, exc: WriterSignatureVerificationError):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "FORGED_OR_INVALID_WRITER_SIGNATURE", "detail": str(exc)}
        )

    @app.exception_handler(ElectionAlreadyFinalizedError)
    async def already_final_handler(request: Request, exc: ElectionAlreadyFinalizedError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ELECTION_ALREADY_FINAL", "detail": str(exc)}
        )

    @app.exception_handler(ConflictingFinalCheckpointError)
    async def conflicting_final_handler(request: Request, exc: ConflictingFinalCheckpointError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "CONFLICTING_FINAL_REFUSED", "detail": str(exc)}
        )

    @app.exception_handler(SequenceGapError)
    async def sequence_gap_handler(request: Request, exc: SequenceGapError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "SEQUENCE_GAP_REFUSED", "detail": str(exc)}
        )

    @app.exception_handler(SequenceRollbackError)
    async def sequence_rollback_handler(request: Request, exc: SequenceRollbackError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "SEQUENCE_ROLLBACK_REFUSED", "detail": str(exc)}
        )

    @app.exception_handler(TreeSizeRollbackError)
    async def tree_rollback_handler(request: Request, exc: TreeSizeRollbackError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "TREE_SIZE_ROLLBACK_REFUSED", "detail": str(exc)}
        )

    @app.exception_handler(ManifestMismatchError)
    async def manifest_mismatch_handler(request: Request, exc: ManifestMismatchError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "MANIFEST_MISMATCH", "detail": str(exc)}
        )

    @app.exception_handler(PreviousCheckpointMismatchError)
    async def prev_digest_handler(request: Request, exc: PreviousCheckpointMismatchError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "PREVIOUS_CHECKPOINT_MISMATCH", "detail": str(exc)}
        )

    @app.exception_handler(ConsistencyProofVerificationError)
    async def consistency_proof_handler(request: Request, exc: ConsistencyProofVerificationError):
        return JSONResponse(
            status_code=422,
            content={"error": "INVALID_CONSISTENCY_PROOF", "detail": str(exc)}
        )

    @app.exception_handler(InconsistentTreeRootError)
    async def inconsistent_root_handler(request: Request, exc: InconsistentTreeRootError):
        return JSONResponse(
            status_code=422,
            content={"error": "INCONSISTENT_TREE_ROOT", "detail": str(exc)}
        )

    @app.get("/health", status_code=status.HTTP_200_OK)
    async def health_check() -> Dict[str, Any]:
        """Operational health check returning status and public identity."""
        return {
            "status": "HEALTHY",
            "service": "HimVote Independent Witness",
            "witness_id": cfg.witness_id,
            "witness_public_key": service.public_key_hex
        }

    @app.get("/witness/public_key", status_code=status.HTTP_200_OK)
    async def get_public_key() -> Dict[str, str]:
        """Expose witness Ed25519 public key for trust distribution."""
        return {
            "witness_id": cfg.witness_id,
            "witness_public_key": service.public_key_hex,
            "algorithm": "Ed25519"
        }

    @app.post(
        "/checkpoints",
        response_model=WitnessAcknowledgement,
        status_code=status.HTTP_200_OK
    )
    async def post_checkpoint(submission: CheckpointSubmission) -> WitnessAcknowledgement:
        """
        Receive checkpoint record.
        Verifies election ID, manifest digest, writer signature, monotonic tree size,
        and RFC 9162 consistency proof from previous checkpoint.
        """
        return service.process_checkpoint(submission)

    @app.post(
        "/elections/{id}/final",
        response_model=FinalCheckpointResponse,
        status_code=status.HTTP_200_OK
    )
    async def post_election_final(
        id: str,
        submission: Optional[FinalCheckpointSubmission] = None
    ) -> FinalCheckpointResponse:
        """
        Seal election log, mark FINAL, verify consistency, and prevent further checkpoints.
        """
        body = submission or FinalCheckpointSubmission()
        return service.process_final(election_id=id, submission=body)

    @app.get(
        "/elections/{id}/final",
        response_model=FinalCheckpointResponse,
        status_code=status.HTTP_200_OK
    )
    async def get_election_final(id: str) -> FinalCheckpointResponse:
        """Return the signed FINAL checkpoint for the specified election."""
        return service.get_final(election_id=id)

    @app.get(
        "/checkpoints/{election_id}/latest",
        response_model=WitnessAcknowledgement,
        status_code=status.HTTP_200_OK
    )
    async def get_latest_checkpoint(election_id: str) -> WitnessAcknowledgement:
        """Return latest witnessed checkpoint acknowledgement."""
        return service.get_latest(election_id=election_id)

    @app.get(
        "/elections/{id}/checkpoints",
        response_model=list[WitnessAcknowledgement],
        status_code=status.HTTP_200_OK,
    )
    async def get_election_checkpoints(id: str, after_sequence: int = 0) -> list[WitnessAcknowledgement]:
        """Return signed checkpoint acknowledgements for a configured relayer to ingest."""
        if after_sequence < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="after_sequence must be a non-negative integer",
            )
        return service.list_checkpoints(election_id=id, after_sequence=after_sequence)

    return app


# Default app instance for ASGI servers like uvicorn
app = create_app()
