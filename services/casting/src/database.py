"""
Database engine and session management for SQLAlchemy 2 async operations.
Provides transactional session dependency and election row locking coordination.

PostgreSQL Row Locks versus Asyncio Locks Architectural Coordination:

1. Asyncio Locks (Worker Local In Process Coordination):
An asyncio.Lock operates strictly in memory within a single event loop and process.
It serializes concurrent coroutines inside that specific worker before database connection acquisition.
This prevents connection pool exhaustion and local task stampedes on the database driver.
In local SQLite development and in memory test suites, where row level exclusive locks
are unavailable, the asyncio lock provides necessary coroutine serialization.
However, an asyncio lock cannot coordinate across multiple worker processes or Kubernetes pods.

2. PostgreSQL Row Locks (Cluster Wide Distributed Coordination):
To coordinate across concurrent workers and container instances, HimVote relies on
authoritative PostgreSQL row level exclusive locks using SELECT FOR UPDATE on the elections
table row within an active ACID transaction.
When worker A executes SELECT FOR UPDATE inside an active transaction, PostgreSQL places
an exclusive row lock on that election. Any concurrent worker executing the same query
must wait until worker A commits or rolls back. This provides cluster wide serialization
for next_leaf_index assignment, outbox checkpoint creation, and election state transitions
(such as OPEN to CLOSING and CLOSED).

3. Storage Layer Integrity:
PostgreSQL unique constraints serve as the final safety net ensuring duplicate nullifiers
or leaf index collisions are rejected with integrity errors even in extreme race conditions.
"""

import asyncio
import threading
import weakref
from typing import AsyncGenerator, Dict, Optional, Set, Tuple
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

# Thread safe guard protecting the in process lock registry
_lock_registry_guard = threading.Lock()

# In process lock registry mapping (loop_id, election_id) to asyncio.Lock
_election_locks: Dict[Tuple[int, str], asyncio.Lock] = {}

# Weak references to active event loops for stale lock pruning
_loop_refs: Dict[int, weakref.ref[asyncio.AbstractEventLoop]] = {}


def get_election_lock(election_id: str) -> asyncio.Lock:
    """
    Retrieve or create a dedicated asyncio.Lock for the given election identifier on the current event loop.

    Lock Coordination Architecture:
    * Asyncio Lock: Coordinates concurrent coroutines locally within the worker process event loop.
      Prevents connection pool exhaustion and database driver stampedes.
    * PostgreSQL Row Lock: Authoritative coordination across all concurrent worker processes.
      Acquired via SELECT FOR UPDATE on the election row inside the database transaction.
      Ensures monotonic leaf indexing and atomic state transitions across the entire cluster.
    """
    try:
        loop = asyncio.get_running_loop()
        loop_id = id(loop)
    except RuntimeError:
        loop = None
        loop_id = 0

    key = (loop_id, election_id)

    with _lock_registry_guard:
        # Prune dead or closed event loops to prevent memory leaks and loop id collisions
        dead_loop_ids: Set[int] = set()
        for lid, ref in list(_loop_refs.items()):
            loop_obj = ref()
            if loop_obj is None or loop_obj.is_closed():
                dead_loop_ids.add(lid)

        if dead_loop_ids:
            for dead_id in dead_loop_ids:
                _loop_refs.pop(dead_id, None)
            dead_keys = [k for k in _election_locks if k[0] in dead_loop_ids]
            for dk in dead_keys:
                _election_locks.pop(dk, None)

        if loop is not None and loop_id not in _loop_refs:
            _loop_refs[loop_id] = weakref.ref(loop)

        if key not in _election_locks:
            _election_locks[key] = asyncio.Lock()
        return _election_locks[key]


def reset_election_locks() -> None:
    """
    Clear all cached election locks and loop references.
    Useful for test isolation and clean worker lifecycle resets.
    """
    with _lock_registry_guard:
        _election_locks.clear()
        _loop_refs.clear()


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
