"""
SQLAlchemy models for casting cluster database.
Covers outbox, election state, witness acknowledgements, and audit events.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Text,
    LargeBinary,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def utcnow() -> datetime:
    """Return current UTC timestamp with timezone."""
    return datetime.now(timezone.utc)


class Election(Base):
    """
    Core election table in casting database.
    """
    __tablename__ = "elections"

    id = Column(String(128), primary_key=True)
    tenant_id = Column(String(128), nullable=False, default="default")
    name = Column(String(256), nullable=False, default="")
    status = Column(String(64), nullable=False, default="DRAFT")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ElectionState(Base):
    """
    Current state of election in casting cluster.
    Tracks state machine status, leaf counters, and witness progress.
    """
    __tablename__ = "election_state"

    election_id = Column(String(128), primary_key=True)
    state = Column(String(64), nullable=False, default="DRAFT")
    manifest_digest = Column(String(128), nullable=False, default="")
    opens_at_utc = Column(DateTime(timezone=True), nullable=True)
    closes_at_utc = Column(DateTime(timezone=True), nullable=True)
    issuance_cutoff_utc = Column(DateTime(timezone=True), nullable=True)
    state_version = Column(Integer, nullable=False, default=1)
    next_leaf_index = Column(Integer, nullable=False, default=0)
    last_witnessed_tree_size = Column(Integer, nullable=False, default=0)
    final_tree_size = Column(Integer, nullable=True)
    transition_digest = Column(String(128), nullable=True)
    issued_count = Column(Integer, nullable=False, default=0)
    issuance_ledger_digest = Column(String(128), nullable=False, default="")
    roster_commitment = Column(String(128), nullable=False, default="")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class CheckpointOutbox(Base):
    """
    Outbox table populated by casting service when ballots are accepted.
    Read strictly in leaf index order by checkpoint worker.
    """
    __tablename__ = "checkpoint_outbox"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(128), nullable=False, index=True)
    leaf_index = Column(Integer, nullable=False)
    leaf_hash = Column(String(128), nullable=False)
    leaf_data = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_outbox_election_leaf", "election_id", "leaf_index"),
        Index("ix_outbox_election_status_leaf", "election_id", "status", "leaf_index"),
    )


class WitnessAcknowledgement(Base):
    """
    Stores cryptographically signed acknowledgements received from the witness.
    """
    __tablename__ = "witness_acknowledgements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(128), nullable=False, index=True)
    tree_size = Column(Integer, nullable=False)
    checkpoint_sequence = Column(Integer, nullable=False)
    checkpoint_kind = Column(String(32), nullable=False, default="INCREMENTAL")
    merkle_root = Column(String(128), nullable=False)
    checkpoint_digest = Column(String(128), nullable=False)
    witness_sequence = Column(Integer, nullable=False)
    witness_key_id = Column(String(128), nullable=False)
    witness_signature = Column(Text, nullable=False)
    canonical_checkpoint_record = Column(Text, nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("election_id", "tree_size", name="uq_witness_ack_election_tree_size"),
        UniqueConstraint("election_id", "checkpoint_sequence", name="uq_witness_ack_election_seq"),
    )


class ElectionEvent(Base):
    """
    Append only audit event log for casting cluster.
    """
    __tablename__ = "election_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(128), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
