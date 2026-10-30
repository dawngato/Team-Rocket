"""
Test fixtures and shared helpers for checkpoint worker test suite.
"""

import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_SERVICE_DIR = str(Path(__file__).resolve().parents[1])
if _SERVICE_DIR not in sys.path:
    sys.path.insert(0, _SERVICE_DIR)

from checkpoint_worker.models.database import Base, Election, ElectionState, utcnow
from checkpoint_worker.crypto.signatures import generate_ed25519_keypair
from checkpoint_worker.witness_client import WitnessClient


@pytest.fixture
def db_session_factory():
    """
    In memory SQLite database sessionmaker for tests.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    return factory


@pytest.fixture
def crypto_keys():
    """
    Generated Ed25519 keypairs for log writer and witness.
    """
    writer_priv, writer_pub = generate_ed25519_keypair()
    witness_priv, witness_pub = generate_ed25519_keypair()
    return {
        "writer_priv": writer_priv,
        "writer_pub": writer_pub,
        "witness_priv": witness_priv,
        "witness_pub": witness_pub,
    }


@pytest.fixture
def sample_election(db_session_factory):
    """
    Seed active test election and election state.
    """
    election_id = "test_election_001"
    with db_session_factory() as session:
        election = Election(
            id=election_id,
            tenant_id="tenant_alpha",
            name="Campus Senate Election 2026",
            status="OPEN",
            created_at=utcnow(),
        )
        state = ElectionState(
            election_id=election_id,
            state="OPEN",
            manifest_digest="a" * 64,
            state_version=1,
            next_leaf_index=0,
            last_witnessed_tree_size=0,
            issued_count=50,
            issuance_ledger_digest="b" * 64,
            roster_commitment="c" * 64,
            updated_at=utcnow(),
        )
        session.add(election)
        session.add(state)
        session.commit()
    return election_id
