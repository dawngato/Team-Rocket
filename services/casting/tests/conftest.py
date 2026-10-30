"""
Pytest configuration and test fixtures for HimVote casting service tests.
Uses SQLite in memory database with async SQLAlchemy 2 session.
"""

import base64
import json
import sys
from pathlib import Path
import pytest
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)

_SERVICE_DIR = str(Path(__file__).resolve().parents[1])
if _SERVICE_DIR not in sys.path:
    sys.path.insert(0, _SERVICE_DIR)

from src.database import get_db
from src.config import settings
from src.main import create_app
from src.models import (
    Base,
    Candidate,
    Contest,
    Election,
    ManifestVersion,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def local_engine_validation_mode():
    """Make test fixtures explicit about their non-production validation mode."""
    original_mode = settings.ENGINE_VALIDATION_MODE
    original_environment = settings.APP_ENV
    settings.ENGINE_VALIDATION_MODE = "syntax_only"
    settings.APP_ENV = "test"
    try:
        yield
    finally:
        settings.ENGINE_VALIDATION_MODE = original_mode
        settings.APP_ENV = original_environment


@pytest.fixture
async def test_engine():
    """
    Create isolated in memory SQLite engine for unit and concurrency tests.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
        connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def test_session_factory(test_engine):
    """
    Create session maker tied to the test database engine.
    """
    return async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )


@pytest.fixture
async def test_session(test_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield active session for test setups.
    """
    async with test_session_factory() as session:
        yield session


@pytest.fixture
def sample_election_id():
    return "elec_test_001"


@pytest.fixture
def sample_manifest_digest():
    return "sha256_manifest_digest_sample_vector"


@pytest.fixture
async def open_election(test_session, sample_election_id, sample_manifest_digest):
    """
    Seed an active election in state OPEN with valid voting window.
    """
    now = datetime.now(timezone.utc)
    election = Election(
        id=sample_election_id,
        tenant_id="tenant_01",
        title="Student Union General Election 2026",
        state="OPEN",
        manifest_digest=sample_manifest_digest,
        opens_at_utc=now - timedelta(hours=1),
        closes_at_utc=now + timedelta(hours=12),
        issuance_cutoff_utc=now - timedelta(hours=2),
        state_version=1,
        next_leaf_index=0,
        last_witnessed_tree_size=0,
        final_tree_size=None,
        max_unwitnessed_backlog=1000,
        created_at_utc=now - timedelta(days=1),
        updated_at_utc=now
    )
    test_session.add(election)

    # Add manifest version
    manifest = ManifestVersion(
        id="man_001",
        election_id=sample_election_id,
        manifest_version=1,
        manifest_digest=sample_manifest_digest,
        manifest_content="{\"election_id\": \"elec_test_001\", \"contests\": [\"president\"]}",
        frozen_at_utc=now - timedelta(days=1)
    )
    test_session.add(manifest)

    # Add contest and candidate
    contest = Contest(
        id="cnt_001",
        election_id=sample_election_id,
        contest_index=0,
        title="President",
        selection_rule="single_choice"
    )
    test_session.add(contest)

    cand = Candidate(
        id="cand_001",
        contest_id="cnt_001",
        candidate_index=0,
        name="Candidate Alpha"
    )
    test_session.add(cand)

    await test_session.commit()
    return election


def create_credential_proof_b64url(election_id: str, nullifier: str, manifest_digest: str) -> str:
    """
    Helper to generate valid base64url encoded credential proof payload.
    """
    proof_obj = {
        "election_id": election_id,
        "nullifier": nullifier,
        "manifest_digest": manifest_digest,
        "zk_proof": "zk_proof_vector_alpha"
    }
    raw_bytes = json.dumps(proof_obj, sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw_bytes).decode("utf-8").rstrip("=")


@pytest.fixture
def make_proof(sample_election_id, sample_manifest_digest):
    def _make(nullifier: str, election_id: str = None, manifest_digest: str = None):
        e_id = election_id or sample_election_id
        m_dig = manifest_digest or sample_manifest_digest
        return create_credential_proof_b64url(e_id, nullifier, m_dig)
    return _make


@pytest.fixture
def valid_ballot_b64url():
    raw = json.dumps({"choice": "cand_001", "randomness": "rnd_123"}).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


@pytest.fixture
def valid_proofs_b64url():
    raw = json.dumps({"encryption_proof": "sigma_proof_vector"}).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


@pytest.fixture
async def client(test_session_factory):
    """
    Async HTTP client bound to FastAPI application with test database override.
    """
    app = create_app()

    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
