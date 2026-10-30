"""
Main entrypoint for HimVote casting service.
Provides FastAPI app instance and exports database models and endpoints.
"""

from src.config import settings
from src.database import get_db, init_db, close_db
from src.main import app, create_app
from src.models import (
    Base,
    Election,
    ManifestVersion,
    Contest,
    Candidate,
    AcceptedEncryptedBallot,
    CheckpointOutbox,
    WitnessAcknowledgement,
    TallyProof,
    PublishedResult,
    ElectionEvent,
)
from src.schemas import (
    BallotStatus,
    CastBallotRequest,
    CastBallotResponse,
    ReceiptStatusResponse,
)

__all__ = [
    "app",
    "create_app",
    "settings",
    "get_db",
    "init_db",
    "close_db",
    "Base",
    "Election",
    "ManifestVersion",
    "Contest",
    "Candidate",
    "AcceptedEncryptedBallot",
    "CheckpointOutbox",
    "WitnessAcknowledgement",
    "TallyProof",
    "PublishedResult",
    "ElectionEvent",
    "BallotStatus",
    "CastBallotRequest",
    "CastBallotResponse",
    "ReceiptStatusResponse",
]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.SERVICE_HOST,
        port=settings.SERVICE_PORT,
        reload=False
    )
