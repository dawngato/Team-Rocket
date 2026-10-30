"""
Database engine and session management for SQLAlchemy 2 async operations.
Provides transactional session dependency and election row locking coordination.
"""

import asyncio
from typing import AsyncGenerator, Dict
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)
from src.config import settings
from src.models import Base

# Global engine and session factory references
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None

# In process lock registry per event loop and election identifier
_election_locks: Dict[tuple, asyncio.Lock] = {}


def get_election_lock(election_id: str) -> asyncio.Lock:
    """
    Retrieve or create a dedicated asyncio Lock for the given election identifier on the current event loop.
    Guarantees atomic serialization across concurrent coroutines in the application without loop binding conflicts.
    """
    try:
        loop = asyncio.get_running_loop()
        key = (id(loop), election_id)
    except RuntimeError:
        key = (0, election_id)

    if key not in _election_locks:
        _election_locks[key] = asyncio.Lock()
    return _election_locks[key]


def get_engine() -> AsyncEngine:
    """
    Get or initialize the global async SQLAlchemy engine.
    """
    global _engine
    if _engine is None:
        db_url = settings.get_database_url()
        # Configure engine options based on dialect
        connect_args = {}
        if db_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        
        _engine = create_async_engine(
            db_url,
            echo=False,
            future=True,
            connect_args=connect_args
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    Get or initialize the session maker.
    """
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
    return _session_factory


async def init_db() -> None:
    """
    Create tables if they do not exist.
    Used in development and test environments.
    """
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """
    Dispose engine connections gracefully.
    """
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an active AsyncSession.
    """
    session_maker = get_session_factory()
    async with session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
