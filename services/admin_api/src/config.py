"""
Configuration settings for HimVote Admin API service.
"""

import os
from typing import Optional
from pydantic import BaseModel


class Settings(BaseModel):
    """Admin API environment configuration."""
    
    app_name: str = os.getenv("APP_NAME", "HimVote Admin API")
    environment: str = os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development"))
    log_level: str = os.getenv("LOG_LEVEL", "info")
    log_redaction_enabled: bool = os.getenv("LOG_REDACTION_ENABLED", "true").lower() == "true"
    allow_dev_actor_headers: bool = os.getenv(
        "ALLOW_DEV_ACTOR_HEADERS",
        "true" if os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development")) == "development" else "false",
    ).lower() == "true"
    allowed_origins: list[str] = [
        item.strip()
        for item in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if item.strip()
    ]
    
    identity_db_host: str = os.getenv("IDENTITY_DB_HOST", "localhost")
    identity_db_port: int = int(os.getenv("IDENTITY_DB_PORT", "5432"))
    identity_db_name: str = os.getenv("IDENTITY_DB_NAME", "himvote_identity")
    identity_db_user: str = os.getenv("IDENTITY_DB_USER", "himvote_identity")
    identity_db_password: str = os.getenv("IDENTITY_DB_PASSWORD", "himvote_identity")
    identity_db_ssl_mode: str = os.getenv("IDENTITY_DB_SSL_MODE", "prefer")
    identity_db_url: Optional[str] = os.getenv("IDENTITY_DB_URL", None)

    casting_db_host: str = os.getenv("CASTING_DB_HOST", "localhost")
    casting_db_port: int = int(os.getenv("CASTING_DB_PORT", "5432"))
    casting_db_name: str = os.getenv("CASTING_DB_NAME", "himvote_casting")
    casting_db_user: str = os.getenv("CASTING_DB_USER", "himvote_casting")
    casting_db_password: str = os.getenv("CASTING_DB_PASSWORD", "himvote_casting")
    casting_db_ssl_mode: str = os.getenv("CASTING_DB_SSL_MODE", "prefer")
    casting_db_url: Optional[str] = os.getenv("CASTING_DB_URL", None)

    auditor_public_key_fingerprint: str = os.getenv(
        "AUDITOR_PUBLIC_KEY_FINGERPRINT",
        "CHANGE_ME"
    )
    pinned_auditor_public_key: Optional[str] = os.getenv("PINNED_AUDITOR_PUBLIC_KEY", None)


settings = Settings()
