from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import pytest

from securevote_api.models import ElectionState
from securevote_api.service import DomainError

from .conftest import ballot, prepare_open_election


def assert_domain_error(error: DomainError, code: str) -> None:
    assert error.code == code


def test_invalid_lifecycle_transitions_are_rejected(service, actors):
    election = service.create_election(actors["officer"], "Invalid Transition Test")

    with pytest.raises(DomainError) as open_error:
        service.open_election(actors["officer"], election.election_id)
    assert_domain_error(open_error.value, "INVALID_TRANSITION")

    with pytest.raises(DomainError) as freeze_error:
        service.freeze(actors["officer"], election.election_id)
    assert_domain_error(freeze_error.value, "INVALID_TRANSITION")

    service.set_roster(actors["officer"], election.election_id, ["student-001"])
    service.approve_roster(actors["teacher"], election.election_id)
    with pytest.raises(DomainError) as close_error:
        service.close_election(actors["officer"], election.election_id)
    assert_domain_error(close_error.value, "INVALID_TRANSITION")


def test_candidates_and_roster_cannot_change_after_freeze(service, actors):
    election_id, _ = prepare_open_election(service, actors)

    with pytest.raises(DomainError) as candidate_error:
        service.add_candidate(actors["officer"], election_id, "carol", "Carol")
    assert_domain_error(candidate_error.value, "INVALID_TRANSITION")

    with pytest.raises(DomainError) as roster_error:
        service.set_roster(actors["officer"], election_id, ["student-002"])
    assert_domain_error(roster_error.value, "INVALID_TRANSITION")


def test_one_hundred_concurrent_duplicate_attempts_create_one_ballot(service, actors):
    election_id, credential = prepare_open_election(service, actors)

    def submit(index: int):
        try:
            return service.cast_ballot(actors["student"], election_id, ballot(credential, str(index)))
        except DomainError as error:
            return error

    with ThreadPoolExecutor(max_workers=20) as executor:
        results = list(executor.map(submit, range(100)))

    accepted = [result for result in results if isinstance(result, dict)]
    rejected = [result for result in results if isinstance(result, DomainError)]
    assert len(accepted) == 1
    assert len(rejected) == 99
    assert {error.code for error in rejected} == {"BALLOT_ALREADY_ACCEPTED"}
    assert service.ballot_count(election_id) == 1
    assert service.outbox_count(election_id) == 1


def test_close_race_uses_same_sqlite_write_serialization(service, actors):
    election_id, credential = prepare_open_election(service, actors)

    def cast():
        try:
            service.cast_ballot(actors["student"], election_id, ballot(credential, "race"))
            return "accepted"
        except DomainError as error:
            return error.code

    def close():
        try:
            service.close_election(actors["officer"], election_id)
            return "closed"
        except DomainError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        cast_result, close_result = list(executor.map(lambda fn: fn(), (cast, close)))

    assert close_result == "closed"
    assert service.get_election(election_id).state == ElectionState.CLOSED
    assert service.ballot_count(election_id) in {0, 1}
    assert cast_result in {"accepted", "INVALID_TRANSITION"}
    if cast_result == "accepted":
        assert service.get_election(election_id).closed_at is not None
        assert service.ballot_count(election_id) == 1

    with pytest.raises(DomainError) as late_error:
        service.cast_ballot(actors["student"], election_id, ballot(credential, "late"))
    assert_domain_error(late_error.value, "INVALID_TRANSITION")


def test_ballot_records_have_no_student_id_and_response_is_choice_free(service, actors):
    election_id, credential = prepare_open_election(service, actors)
    response = service.cast_ballot(actors["student"], election_id, ballot(credential))

    assert "student_id" not in response
    assert "candidate_id" not in response
    assert "student-001" not in response["message"]
    columns = service.ballot_record_columns()
    assert "student_id" not in columns
    row = service.ballot_record_rows(election_id)[0]
    assert "student_id" not in row
    assert "student-001" not in str(row)
    assert service.outbox_count(election_id) == 1


def test_canonical_leaf_digest_is_stable_and_outbox_is_durable(service, actors):
    election_id, credential = prepare_open_election(service, actors)
    first = service.cast_ballot(actors["student"], election_id, ballot(credential))
    row = service.ballot_record_rows(election_id)[0]

    assert first["evidence_digest"] == row["record_digest"]
    assert row["canonical_leaf"].startswith('{"ballot_id":')
    assert row["canonical_leaf"].endswith("}")
    assert service.health()["pending_outbox_events"] == 1
