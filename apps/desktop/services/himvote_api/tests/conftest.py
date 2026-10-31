from __future__ import annotations

import pytest

from himvote_api.db import Database
from himvote_api.models import BallotSubmission, Role
from himvote_api.service import Actor, HimVoteService


@pytest.fixture
def actors() -> dict[str, Actor]:
    return {
        "admin": Actor(Role.ADMIN, "admin-1"),
        "officer": Actor(Role.ELECTION_OFFICER, "officer-1"),
        "teacher": Actor(Role.TEACHER, "teacher-1"),
        "student": Actor(Role.STUDENT, "student-001"),
        "observer": Actor(Role.PUBLIC_OBSERVER, "observer-1"),
    }


@pytest.fixture
def service(tmp_path) -> HimVoteService:
    return HimVoteService(Database(tmp_path / "himvote.sqlite3"))


def prepare_open_election(service: HimVoteService, actors: dict[str, Actor]) -> tuple[str, str]:
    election = service.create_election(actors["officer"], "Student Council 2026")
    service.add_candidate(actors["officer"], election.election_id, "alice", "Alice")
    service.add_candidate(actors["officer"], election.election_id, "bob", "Bob")
    service.set_roster(actors["officer"], election.election_id, ["student-001"])
    service.approve_roster(actors["teacher"], election.election_id)
    credential = "synthetic-credential-student-001"
    service.provision_credential(
        actors["officer"], election.election_id, "student-001", credential
    )
    service.freeze(actors["officer"], election.election_id)
    service.open_election(actors["officer"], election.election_id)
    return election.election_id, credential


def ballot(credential: str, suffix: str = "one") -> BallotSubmission:
    return BallotSubmission(
        credential_token=credential,
        encrypted_ballot=f"opaque-engine-artifact-{suffix}",
        proof_artifact=f"opaque-proof-artifact-{suffix}",
    )
