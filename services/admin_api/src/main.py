"""
HimVote Admin API FastAPI Application Entrypoint.
Implements Section 4 and Section 6.2 specifications.
"""

import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db import init_db
from src.routers.elections import router as elections_router
from src.routers.audit import router as audit_router
from src.routers.health import router as health_router
from src.state_machine.lifecycle import StateMachineError


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes tables on startup."""
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="HimVote Administrator and Election Lifecycle API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Injects correlation request ID and logs request."""
    # Never reflect a caller supplied identifier into trusted audit context.
    request_id = uuid.uuid4().hex
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X_Request_ID"] = request_id
    return response


@app.exception_handler(StateMachineError)
async def state_machine_error_handler(request: Request, exc: StateMachineError):
    """Handles state machine domain errors with standard ErrorResponse format."""
    request_id = getattr(request.state, "request_id", uuid.uuid4().hex)
    status_code = status.HTTP_409_CONFLICT
    if exc.error_code == "ROSTER_APPROVER_NOT_INDEPENDENT":
        status_code = status.HTTP_403_FORBIDDEN
    elif exc.error_code == "NOT_FOUND":
        status_code = status.HTTP_404_NOT_FOUND

    return JSONResponse(
        status_code=status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "request_id": request_id,
            "details": {}
        }
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catches unhandled errors and formats standard response without leaking secrets."""
    request_id = getattr(request.state, "request_id", uuid.uuid4().hex)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An internal error occurred",
            "request_id": request_id,
            "details": {"error": str(exc)} if settings.environment == "development" else {}
        }
    )


app.include_router(elections_router)
app.include_router(audit_router)
app.include_router(health_router)
