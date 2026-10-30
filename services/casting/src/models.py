"""
SQLAlchemy 2 database models for the HimVote casting cluster.
No student identity, no session data, no login data allowed in this cluster.
"""

from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship
)


class Base(DeclarativeBase):
    """
    Root declarative base for casting database models.
    """
    pass


class Election(Base):
    """
    Elections table storing operational state and leaf index sequence.
    """
    __tablename__ = "elections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), default="default", index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    state: Mapped[str] = mapped_column(String(32), default="DRAFT", index=True)
    manifest_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    opens_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closes_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    issuance_cutoff_utc: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    state_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    next_leaf_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_witnessed_tree_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    final_tree_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transition_digest: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    max_unwitnessed_backlog: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    created_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    manifest_versions: Mapped[List["ManifestVersion"]] = relationship(
        back_populates="election",
        cascade="all, delete-orphan"
    )
    contests: Mapped[List["Contest"]] = relationship(
        back_populates="election",
        cascade="all, delete-orphan"
    )
    ballots: Mapped[List["AcceptedEncryptedBallot"]] = relationship(
        back_populates="election"
    )
    outbox_entries: Mapped[List["CheckpointOutbox"]] = relationship(
        back_populates="election"
    )
    witness_acknowledgements: Mapped[List["WitnessAcknowledgement"]] = relationship(
        back_populates="election"
    )
    tally_proofs: Mapped[List["TallyProof"]] = relationship(
        back_populates="election"
    )
    published_results: Mapped[List["PublishedResult"]] = relationship(
        back_populates="election"
    )
    events: Mapped[List["ElectionEvent"]] = relationship(
        back_populates="election",
        cascade="all, delete-orphan"
    )


class ManifestVersion(Base):
    """
    Immutable frozen manifest versions for an election.
    """
    __tablename__ = "manifest_versions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    manifest_version: Mapped[int] = mapped_column(Integer, nullable=False)
    manifest_digest: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    manifest_content: Mapped[str] = mapped_column(Text, nullable=False)
    frozen_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    election: Mapped["Election"] = relationship(back_populates="manifest_versions")


class Contest(Base):
    """
    Election contests or ballots questions.
    """
    __tablename__ = "contests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    contest_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    selection_rule: Mapped[str] = mapped_column(String(64), nullable=False)

    election: Mapped["Election"] = relationship(back_populates="contests")
    candidates: Mapped[List["Candidate"]] = relationship(
        back_populates="contest",
        cascade="all, delete-orphan"
    )


class Candidate(Base):
    """
    Candidate choices participating in a contest.
    """
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    contest_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("contests.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    candidate_index: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)

    contest: Mapped["Contest"] = relationship(back_populates="candidates")


class AcceptedEncryptedBallot(Base):
    """
    Append only log of accepted encrypted ballots.
    Source of Merkle tree leaves. Contains credential nullifier.
    """
    __tablename__ = "accepted_encrypted_ballots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    leaf_index: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    credential_nullifier: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    ballot_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    manifest_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    credential_proof_b64url: Mapped[str] = mapped_column(Text, nullable=False)
    engine_ballot_b64url: Mapped[str] = mapped_column(Text, nullable=False)
    engine_proofs_b64url: Mapped[str] = mapped_column(Text, nullable=False)
    engine_record_version: Mapped[str] = mapped_column(String(32), default="v1", nullable=False)
    request_digest: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    receipt_handle: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    nullifier_commitment: Mapped[str] = mapped_column(String(128), nullable=False)
    cast_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("election_id", "credential_nullifier", name="uq_ballots_election_nullifier"),
        UniqueConstraint("election_id", "leaf_index", name="uq_ballots_election_leaf"),
    )

    election: Mapped["Election"] = relationship(back_populates="ballots")


class CheckpointOutbox(Base):
    """
    Transactional outbox for checkpoint publisher worker.
    """
    __tablename__ = "checkpoint_outbox"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    leaf_index: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    ballot_id: Mapped[str] = mapped_column(String(64), nullable=False)
    leaf_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True, nullable=False)
    created_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("election_id", "leaf_index", name="uq_outbox_election_leaf"),
    )

    election: Mapped["Election"] = relationship(back_populates="outbox_entries")


class WitnessAcknowledgement(Base):
    """
    Signed witness acknowledgements confirming tree size and root.
    """
    __tablename__ = "witness_acknowledgements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    tree_size: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    merkle_root: Mapped[str] = mapped_column(String(128), nullable=False)
    witness_key_id: Mapped[str] = mapped_column(String(128), nullable=False)
    witness_signature: Mapped[str] = mapped_column(Text, nullable=False)
    acknowledged_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    election: Mapped["Election"] = relationship(back_populates="witness_acknowledgements")


class TallyProof(Base):
    """
    Decryption proofs and tally computations for the election.
    """
    __tablename__ = "tally_proofs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    manifest_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    tally_data: Mapped[str] = mapped_column(Text, nullable=False)
    proof_data: Mapped[str] = mapped_column(Text, nullable=False)
    created_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    election: Mapped["Election"] = relationship(back_populates="tally_proofs")


class PublishedResult(Base):
    """
    Published election outcomes after auditing and verification.
    """
    __tablename__ = "published_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="RESTRICT"),
        index=True,
        nullable=False
    )
    manifest_digest: Mapped[str] = mapped_column(String(128), nullable=False)
    total_ballots: Mapped[int] = mapped_column(Integer, nullable=False)
    tally_json: Mapped[str] = mapped_column(Text, nullable=False)
    published_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    election: Mapped["Election"] = relationship(back_populates="published_results")


class ElectionEvent(Base):
    """
    Append only audit events recorded for lifecycle transitions.
    """
    __tablename__ = "election_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    election_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("elections.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    election: Mapped["Election"] = relationship(back_populates="events")
