"""
Configuration module for HimVote casting service.
"""

import os
from typing import Optional
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """
    Settings loaded from environment variables.
    """
    DATABASE_URL: Optional[str] = Field(
        default_factory=lambda: os.getenv("DATABASE_URL")
    )
    CASTING_DB_HOST: str = Field(
        default_factory=lambda: os.getenv("CASTING_DB_HOST", "localhost")
    )
    CASTING_DB_PORT: int = Field(
        default_factory=lambda: int(os.getenv("CASTING_DB_PORT", "5432"))
    )
    CASTING_DB_NAME: str = Field(
        default_factory=lambda: os.getenv("CASTING_DB_NAME", "himvote_casting")
    )
    CASTING_DB_USER: str = Field(
        default_factory=lambda: os.getenv("CASTING_DB_USER", "himvote_casting")
    )
    CASTING_DB_PASSWORD: str = Field(
        default_factory=lambda: os.getenv("CASTING_DB_PASSWORD", "himvote_casting")
    )
    CASTING_DB_SSL_MODE: str = Field(
        default_factory=lambda: os.getenv("CASTING_DB_SSL_MODE", "prefer")
    )

    SERVICE_PORT: int = Field(
        default_factory=lambda: int(os.getenv("SERVICE_PORT", "8082"))
    )
    SERVICE_HOST: str = Field(
        default_factory=lambda: os.getenv("SERVICE_HOST", "0.0.0.0")
    )
    LOG_LEVEL: str = Field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "info")
    )
    LOG_REDACTION_ENABLED: bool = Field(
        default_factory=lambda: os.getenv("LOG_REDACTION_ENABLED", "true").lower() in ("true", "1")
    )
    APP_ENV: str = Field(
        default_factory=lambda: os.getenv("APP_ENV", "development")
    )
    INTERNAL_CONTROL_TOKEN: Optional[str] = Field(
        default_factory=lambda: os.getenv("INTERNAL_CONTROL_TOKEN")
    )
    ALLOWED_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            item.strip()
            for item in (
                os.getenv("CASTING_ALLOWED_ORIGINS")
                if os.getenv("CASTING_ALLOWED_ORIGINS") is not None
                else (
                    "http://localhost:3000,http://127.0.0.1:3000"
                    if os.getenv("APP_ENV", "development") != "production"
                    else ""
                )
            ).split(",")
            if item.strip()
        ]
    )
    MAX_UNWITNESSED_BACKLOG: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UNWITNESSED_BACKLOG", "1000"))
    )
    MAX_REQUEST_BODY_BYTES: int = Field(
        default_factory=lambda: int(os.getenv("MAX_REQUEST_BODY_BYTES", "524288"))
    )
    ELECTION_ENGINE_BASE: str = Field(
        default_factory=lambda: os.getenv("ELECTION_ENGINE_BASE", "http://localhost:8084")
    )

    def get_database_url(self) -> str:
        """
        Build async database URL for SQLAlchemy 2.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL

        ssl_part = ""
        if self.CASTING_DB_SSL_MODE in ("require", "verify_full", "verify_ca"):
            ssl_part = f"?ssl={self.CASTING_DB_SSL_MODE}"

        return (
            f"postgresql+asyncpg://{self.CASTING_DB_USER}:{self.CASTING_DB_PASSWORD}@"
            f"{self.CASTING_DB_HOST}:{self.CASTING_DB_PORT}/{self.CASTING_DB_NAME}{ssl_part}"
        )


settings = Settings()
