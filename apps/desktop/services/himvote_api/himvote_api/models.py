from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    ELECTION_OFFICER = "election_officer"
    TEACHER = "teacher"
    STUDENT = "student"
    INDEPENDENT_AUDITOR = "independent_auditor"
    PUBLIC_OBSERVER = "public_observer"


class ElectionState(str, Enum):
    DRAFT = "DRAFT"
    ROSTER_APPROVED = "ROSTER_APPROVED"
    FROZEN = "FROZEN"
    OPEN = "OPEN"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"


class ElectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=3, max_length=200)


class CandidateCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_]+$")
    name: str = Field(min_length=1, max_length=200)


class RosterUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_ids: list[str] = Field(min_length=1, max_length=10_000)

    @field_validator("student_ids")
    @classmethod
    def unique_student_ids(cls, value: list[str]) -> list[str]:
        normalized = [item.strip() for item in value]
        if any(not item or len(item) > 100 for item in normalized):
            raise ValueError("student_ids must contain non-empty values of at most 100 characters")
        if len(set(normalized)) != len(normalized):
            raise ValueError("student_ids must be unique")
        return normalized


class CredentialProvisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_id: str = Field(min_length=1, max_length=100)
    credential_token: str = Field(min_length=16, max_length=256)


class BallotSubmission(BaseModel):
    """Opaque artifacts from a future vetted engine integration."""

    model_config = ConfigDict(extra="forbid")

    credential_token: str = Field(min_length=16, max_length=256)
    encrypted_ballot: str = Field(min_length=1, max_length=200_000)
    proof_artifact: str = Field(min_length=1, max_length=200_000)


class CandidateView(BaseModel):
    candidate_id: str
    name: str


class ElectionView(BaseModel):
    election_id: str
    title: str
    state: ElectionState
    candidates: list[CandidateView]
    roster_count: int
    manifest_digest: str | None
    closed_at: str | None


class CredentialProvisionResponse(BaseModel):
    election_id: str
    student_id: str
    status: Literal["PROVISIONED"]


class CastResponse(BaseModel):
    receipt_id: str
    status: Literal["ACCEPTED_PENDING_WITNESS"]
    leaf_index: int
    evidence_digest: str
    message: str


class ReceiptView(BaseModel):
    receipt_id: str
    election_id: str
    status: Literal["ACCEPTED_PENDING_WITNESS"]
    leaf_index: int
    evidence_digest: str
    message: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    storage: Literal["sqlite"]
    pending_outbox_events: int
