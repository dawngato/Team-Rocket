"""
Database session and connection management for HimVote Identity cluster.
Supports PostgreSQL for production and SQLite for local development and testing.
"""

from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all registered database tables."""
    Base.metadata.create_all(bind=engine)

    # ``create_all`` does not add columns to an already deployed database.
    # These nullable approval fields are a backwards-compatible, idempotent
    # migration for the small service deployment.  They are intentionally
    # additive: existing approval records remain readable and no election or
    # identity data is rewritten.
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("approval_requests")}
    additions = {
        "target_user_id": "VARCHAR(255)",
        "requested_role": "VARCHAR(100)",
        "requested_scope": "VARCHAR(255)",
    }
    with engine.begin() as connection:
        for name, type_sql in additions.items():
            if name not in columns:
                connection.execute(
                    text(f"ALTER TABLE approval_requests ADD COLUMN {name} {type_sql}")
                )
