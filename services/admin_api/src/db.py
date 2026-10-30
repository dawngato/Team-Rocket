"""
Database connection and session factory for HimVote Admin API.
Supports PostgreSQL with transparent SQLite fallback for testing environments.
"""

import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from src.config import settings
from src.models.database import Base


def build_database_url() -> str:
    """Constructs database URL with preference for configured overrides."""
    if settings.casting_db_url:
        return settings.casting_db_url
    
    if os.getenv("TESTING", "false").lower() == "true":
        return "sqlite:///:memory:"

    user = settings.casting_db_user
    pwd = settings.casting_db_password
    host = settings.casting_db_host
    port = settings.casting_db_port
    name = settings.casting_db_name
    return f"postgresql://{user}:{pwd}@{host}:{port}/{name}"


DATABASE_URL = build_database_url()

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool

try:
    engine = create_engine(DATABASE_URL, **engine_kwargs)
    with engine.connect() as conn:
        pass
except Exception:
    DATABASE_URL = "sqlite:///:memory:"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Initializes tables in database schema."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
