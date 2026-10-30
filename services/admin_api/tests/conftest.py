"""
Pytest fixtures and test configuration for HimVote Admin API.
Uses in memory SQLite database isolated for every test run.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from src.models.database import Base
from src.db import get_db
from src.main import app
from src.crypto.signatures import generate_ed25519_keypair, get_public_key_fingerprint
from src.config import settings

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_db():
    """Creates a fresh in memory SQLite database session for each test."""
    test_engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Provides a TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auditor_keypair():
    """Generates an Ed25519 keypair for auditor attestation tests."""
    priv_hex, pub_hex = generate_ed25519_keypair()
    fingerprint = get_public_key_fingerprint(pub_hex)
    return {
        "private_key_hex": priv_hex,
        "public_key_hex": pub_hex,
        "fingerprint": fingerprint
    }


@pytest.fixture(scope="function")
def roster_approver_keypair():
    """Generates an Ed25519 keypair for roster approver tests."""
    priv_hex, pub_hex = generate_ed25519_keypair()
    return {
        "private_key_hex": priv_hex,
        "public_key_hex": pub_hex
    }
