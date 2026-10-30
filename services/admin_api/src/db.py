"""Database connection and session factory for HimVote Admin API."""

import os
from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from src.config import settings
from src.models.database import Base


def build_database_url() -> str:
    """Constructs database URL with preference for configured overrides."""
    if settings.casting_db_url:
        if settings.environment == "production" and settings.casting_db_url.startswith("sqlite"):
            raise ValueError("SQLite is strictly forbidden in production environments")
        return settings.casting_db_url
    
    if os.getenv("TESTING", "false").lower() == "true":
        return "sqlite:///:memory:"

    if settings.environment != "production":
        # Development has an explicit, persistent local database default. It
        # is never selected in production, where CASTING_DB_URL is required.
        return "sqlite:///./himvote_admin_development.db"

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

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Initialize a test or development database, or verify production migrations."""
    if settings.environment == "production":
        inspector = inspect(engine)
        if not inspector.has_table("schema_migrations"):
            raise RuntimeError("Admin database migrations are not installed; refusing production startup")
        with engine.connect() as connection:
            version = connection.execute(
                text("SELECT version FROM schema_migrations WHERE service = 'admin_api' ORDER BY applied_at DESC LIMIT 1")
            ).scalar_one_or_none()
        if version != settings.admin_schema_version:
            raise RuntimeError(
                f"Admin database schema version {version!r} does not match required {settings.admin_schema_version!r}"
            )
        return

    # create_all is deliberately limited to explicit non-production profiles.
    Base.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns("candidates")}
    if "statement" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE candidates ADD COLUMN statement TEXT"))


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
