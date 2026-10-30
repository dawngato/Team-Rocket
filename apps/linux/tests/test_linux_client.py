from pathlib import Path

import pytest

from apps.linux.himvote_linux import Election, LinuxApiClient, Receipt, demo_elections, status_colour


def test_demo_data_is_explicitly_non_production() -> None:
    elections = demo_elections()
    assert len(elections) == 2
    assert elections[0].election_id.startswith("demo_")


def test_election_payload_accepts_api_identifier_shapes() -> None:
    election = Election.from_payload({"election_id": "election_1", "title": "Council", "state": "OPEN", "candidates": [{"id": "a"}]})
    assert election.election_id == "election_1"
    assert election.candidate_count == 1


@pytest.mark.parametrize("state, expected", [("WITNESSED", "#15805D"), ("PENDING_WITNESS", "#AA6C0B"), ("DISPUTED", "#C23C45")])
def test_state_colour_only_marks_confirmed_states_green(state: str, expected: str) -> None:
    assert status_colour(state) == expected


def test_receipt_model_keeps_unwitnessed_state_visible() -> None:
    receipt = Receipt(status="PENDING_WITNESS")
    assert receipt.status == "PENDING_WITNESS"
    assert receipt.witnessed_at is None


def test_api_client_normalizes_base_url() -> None:
    client = LinuxApiClient("http://localhost:8080/")
    assert client.base_url == "http://localhost:8080"
    assert Path("apps/linux/himvote_linux.py").exists()
