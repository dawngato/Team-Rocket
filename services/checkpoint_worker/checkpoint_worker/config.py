"""
Configuration settings for HimVote checkpoint worker.
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

    WITNESS_URL: str = Field(
        default_factory=lambda: os.getenv("WITNESS_URL", "http://localhost:8085")
    )
    WITNESS_PUBLIC_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("WITNESS_PUBLIC_KEY")
    )
    LOG_WRITER_PRIVATE_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("LOG_WRITER_PRIVATE_KEY")
    )
    LOG_WRITER_KEY_ID: str = Field(
        default_factory=lambda: os.getenv("LOG_WRITER_KEY_ID", "log_writer_key_1")
    )

    POLL_INTERVAL_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("POLL_INTERVAL_SECONDS", "1.0"))
    )
    BATCH_SIZE: int = Field(
        default_factory=lambda: int(os.getenv("BATCH_SIZE", "100"))
    )
    WITNESS_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("WITNESS_TIMEOUT_SECONDS", "5.0"))
    )
    WITNESS_MAX_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("WITNESS_MAX_RETRIES", "3"))
    )
    WITNESS_RETRY_BACKOFF_BASE: float = Field(
        default_factory=lambda: float(os.getenv("WITNESS_RETRY_BACKOFF_BASE", "0.5"))
    )

    LOG_LEVEL: str = Field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )

    def get_database_url(self) -> str:
        """
        Build database URL for SQLAlchemy.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL

        ssl_part = ""
        if self.CASTING_DB_SSL_MODE in ("require", "verify_full", "verify_ca"):
            ssl_part = f"?sslmode={self.CASTING_DB_SSL_MODE}"

        return (
            f"postgresql://{self.CASTING_DB_USER}:{self.CASTING_DB_PASSWORD}@"
            f"{self.CASTING_DB_HOST}:{self.CASTING_DB_PORT}/{self.CASTING_DB_NAME}{ssl_part}"
        )


settings = Settings()
