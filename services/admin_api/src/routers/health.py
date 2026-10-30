"""
Health and readiness probes router.
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz():
    """Liveness probe."""
    return {"status": "ok"}


@router.get("/ready")
def ready():
    """Readiness probe."""
    return {"status": "ready"}
