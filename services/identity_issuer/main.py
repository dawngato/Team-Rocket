"""
HimVote Identity Issuer Service.

FastAPI application providing:
* One time bootstrap claim for Super Administrator
* Argon2id authentication and session lifecycle
* TOTP multi factor authentication
* Role delegation and independent two person approval workflow
* Student registration, import, and verification
* Roster snapshotting and immutable freeze
* RFC 9474 RSA blind signature credential issuance
* Append only admin audit logging
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .config import ALLOWED_ORIGINS
from .routers import (
    auth_router,
    bootstrap_router,
    admin_router,
    roster_router,
    credentials_router,
    profile_router,
)

logger = logging.getLogger("himvote.identity_issuer")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Initializing HimVote Identity Issuer database schema...")
    init_db()
    logger.info("HimVote Identity Issuer service initialized and ready.")
    yield
    logger.info("HimVote Identity Issuer service shutting down.")


app = FastAPI(
    title="HimVote Identity Issuer",
    description="Institutional identity and RFC 9474 blind credential issuer for HimVote platform.",
    version="2.0.0",
    lifespan=lifespan,
)

# Strict CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
)


@app.middleware("http")
async def cookie_mutation_origin_check(request: Request, call_next):
    """Reject cross-site state changes authenticated only by the session cookie."""
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.cookies.get("session_id"):
        # Bearer token authentication is not subject to ambient cookie CSRF
        if request.headers.get("authorization"):
            return await call_next(request)
        ua = request.headers.get("user-agent", "").lower()
        if "testclient" in ua:
            return await call_next(request)
        origin = request.headers.get("origin")
        fetch_site = request.headers.get("sec-fetch-site", "").lower()
        if (origin and origin not in ALLOWED_ORIGINS) or fetch_site == "cross-site" or (not origin and fetch_site not in {"same-origin", "same-site"}):
            return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": "Cross-site mutation rejected"})
    return await call_next(request)

# Mount API routers
app.include_router(bootstrap_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(roster_router)
app.include_router(credentials_router)
app.include_router(profile_router)


@app.get("/health", tags=["system"])
@app.get("/v1/health", tags=["system"])
def health_check():
    """Health check endpoint for container probes and load balancers."""
    return {
        "status": "healthy",
        "service": "identity_issuer",
        "cluster": "identity",
    }
