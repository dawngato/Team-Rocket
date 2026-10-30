"""
SQLAlchemy database models for HimVote Identity and Casting clusters.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow_str() -> str:
    """Returns current UTC timestamp formatted as ISO string."""
    return datetime.now(timezone.utc).isoformat()


class ElectionModel(Base):
    """Core election definition."""
    __tablename__ = "elections"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    contest = Column(String(255), nullable=False)
    selection_rule = Column(String(64), nullable=False)
    created_at_utc = Column(String(64), default=utcnow_str, nullable=False)
    opens_at_utc = Column(String(64), nullable=False)
    closes_at_utc = Column(String(64), nullable=False)
    issuance_cutoff_utc = Column(String(64), nullable=False)
    min_anonymous_turnout = Column(Integer, default=10, nullable=False)

    candidates = relationship("CandidateModel", back_populates="election", cascade="all")
    state_record = relationship("ElectionStateModel", back_populates="election", uselist=False, cascade="all")


class ElectionStateModel(Base):
    """Server enforced election state record."""
    __tablename__ = "election_state"

    election_id = Column(String(64), ForeignKey("elections.id"), primary_key=True)
    state = Column(String(64), default="DRAFT", nullable=False)
    manifest_digest = Column(String(128), default="", nullable=False)
    opens_at_utc = Column(String(64), nullable=False)
    closes_at_utc = Column(String(64), nullable=False)
    issuance_cutoff_utc = Column(String(64), nullable=False)
    state_version = Column(Integer, default=1, nullable=False)
    next_leaf_index = Column(Integer, default=0, nullable=False)
    last_witnessed_tree_size = Column(Integer, default=0, nullable=False)
    final_tree_size = Column(Integer, nullable=True)
    transition_digest = Column(String(128), default="", nullable=False)
    updated_at_utc = Column(String(64), default=utcnow_str, onupdate=utcnow_str, nullable=False)

    election = relationship("ElectionModel", back_populates="state_record")


class CandidateModel(Base):
    """Candidate belonging to an election."""
    __tablename__ = "candidates"

    id = Column(String(64), primary_key=True)
    election_id = Column(String(64), ForeignKey("elections.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    contest = Column(String(255), nullable=False)
    statement = Column(Text, nullable=True)

    election = relationship("ElectionModel", back_populates="candidates")


class ManifestVersionModel(Base):
    """Immutable manifest versions frozen for an election."""
    __tablename__ = "manifest_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    manifest_digest = Column(String(128), nullable=False, unique=True)
    manifest_json = Column(Text, nullable=False)
    frozen_at_utc = Column(String(64), default=utcnow_str, nullable=False)
    frozen_by = Column(String(64), nullable=False)


class ElectionRosterSnapshotModel(Base):
    """Roster snapshots submitted and signed for an election."""
    __tablename__ = "election_roster_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(64), nullable=False, index=True)
    roster_version = Column(String(64), nullable=False)
    roster_commitment = Column(String(128), nullable=False)
    eligible_count = Column(Integer, default=0, nullable=False)
    submitted_by = Column(String(64), nullable=False)
    status = Column(String(64), default="SUBMITTED", nullable=False)
    approved_by = Column(String(64), nullable=True)
    approved_at_utc = Column(String(64), nullable=True)
    approver_signature = Column(Text, nullable=True)
    approver_public_key = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("election_id", "roster_version", name="uq_election_roster_ver"),
    )


class RosterMemberModel(Base):
    """Eligible roster member row."""
    __tablename__ = "roster_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(64), nullable=False, index=True)
    roster_version = Column(String(64), nullable=False)
    student_id = Column(String(64), nullable=False)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    department = Column(String(128), nullable=False)

    __table_args__ = (
        UniqueConstraint("election_id", "roster_version", "student_id", name="uq_roster_member"),
    )


class AcceptedBallotModel(Base):
    """Log leaves representing cast encrypted ballots."""
    __tablename__ = "accepted_encrypted_ballots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(64), nullable=False, index=True)
    leaf_index = Column(Integer, nullable=False)
    credential_nullifier = Column(String(128), nullable=False)
    ballot_id = Column(String(64), nullable=False)
    credential_proof_b64url = Column(Text, nullable=False)
    engine_ballot_b64url = Column(Text, nullable=False)
    engine_proofs_b64url = Column(Text, nullable=False)
    received_at_utc = Column(String(64), default=utcnow_str, nullable=False)

    __table_args__ = (
        UniqueConstraint("election_id", "leaf_index", name="uq_ballot_leaf"),
        UniqueConstraint("election_id", "credential_nullifier", name="uq_ballot_nullifier"),
    )


class WitnessAcknowledgementModel(Base):
    """Witness checkpoint signatures."""
    __tablename__ = "witness_acknowledgements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    election_id = Column(String(64), nullable=False, index=True)
    checkpoint_sequence = Column(Integer, nullable=False)
    tree_size = Column(Integer, nullable=False)
    merkle_root = Column(String(128), nullable=False)
    witness_signature = Column(Text, nullable=False)
    witness_key_id = Column(String(64), nullable=False)
    is_final = Column(Boolean, default=False, nullable=False)
    acknowledged_at_utc = Column(String(64), default=utcnow_str, nullable=False)


class PublishedResultModel(Base):
    """Public results published after auditor attestation."""
    __tablename__ = "published_results"

    election_id = Column(String(64), primary_key=True)
    manifest_digest = Column(String(128), nullable=False)
    tally_json = Column(Text, nullable=False)
    total_ballots = Column(Integer, default=0, nullable=False)
    published_at_utc = Column(String(64), default=utcnow_str, nullable=False)
    privacy_limited = Column(Boolean, default=False, nullable=False)


class EvidencePackageModel(Base):
    """Evidence package record."""
    __tablename__ = "evidence_packages"

    election_id = Column(String(64), primary_key=True)
    manifest_digest = Column(String(128), nullable=False)
    final_checkpoint_digest = Column(String(128), nullable=False)
    anchor_tx_hash = Column(String(128), nullable=False)
    auditor_signature = Column(Text, nullable=False)
    created_at_utc = Column(String(64), default=utcnow_str, nullable=False)


class ElectionEventModel(Base):
    """State transition event audit record."""
    __tablename__ = "election_events"

    id = Column(String(64), primary_key=True)
    election_id = Column(String(64), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    state_before = Column(String(64), nullable=False)
    state_after = Column(String(64), nullable=False)
    actor_id = Column(String(64), nullable=False)
    details_json = Column(Text, nullable=True)
    created_at_utc = Column(String(64), default=utcnow_str, nullable=False)


class CancellationRecordModel(Base):
    """Cancellation audit record signed by official."""
    __tablename__ = "cancellation_records"

    election_id = Column(String(64), primary_key=True)
    reason = Column(Text, nullable=False)
    signature = Column(Text, nullable=False)
    actor_id = Column(String(64), nullable=False)
    created_at_utc = Column(String(64), default=utcnow_str, nullable=False)


class AdminAuditEventModel(Base):
    """Append only admin audit event log."""
    __tablename__ = "admin_audit_events"

    id = Column(String(64), primary_key=True)
    timestamp = Column(String(64), default=utcnow_str, nullable=False)
    actor_id = Column(String(64), nullable=False)
    action = Column(String(128), nullable=False)
    result = Column(String(64), nullable=False)
    details_json = Column(Text, nullable=True)
