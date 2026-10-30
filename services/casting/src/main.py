"""
Main application entrypoint for HimVote casting service.
Configures FastAPI application, security middleware, and routes.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.database import close_db, init_db
from src.routes import router
from src.security import CastingOriginSecurityMiddleware
from src.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager handling startup and shutdown.
    """
    # Startup: initialize database tables if running against SQLite or local instance
    await init_db()
    yield
    # Shutdown: gracefully close connections
    await close_db()


def create_app() -> FastAPI:
    """
    Application factory building configured FastAPI instance.
    """
    app = FastAPI(
        title="HimVote Casting Service",
        description="Production grade anonymous casting origin service for HimVote",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    # Attach origin separation and identity stripping security middleware
    app.add_middleware(CastingOriginSecurityMiddleware)

    # Attach CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
        expose_headers=["Cache-Control", "X-Content-Type-Options"]
    )

    # Mount API router
    app.include_router(router)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """
        Global handler preventing internal details leakage.
        """
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request"
            }
        )

    return app


app = create_app()
