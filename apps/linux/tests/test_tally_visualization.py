"""Unit tests for candidate tally recomputation and visualization logic."""

from pathlib import Path
import base64
import json
import sys
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import CandidateTally, ElectionArchive


def _make_ballot_b64(contest_id: str, candidate_id: str) -> str:
    payload = {
        "contest_id": contest_id,
        "election_id": "test_elec",
        "selections": {candidate_id: 1},
    }
    raw = json.dumps(payload).encode("utf_8")
    return base64.urlsafe_b64encode(raw).decode("utf_8").rstrip("=")


def test_tally_recomputation_from_engine_ballots() -> None:
    manifest = {
        "election_id": "elec_test",
        "title": "Campus President",
        "manifest_digest": "sha256:dummy",
        "candidates": [
            {"id": "cand_alice", "name": "Alice Wonderland"},
            {"id": "cand_bob", "name": "Bob Builder"},
            {"id": "cand_carol", "name": "Carol Danvers"},
        ],
    }

    # 3 votes Alice, 2 votes Bob, 1 vote Carol
    leaves = [
        {"leaf_index": 0, "engine_ballot_b64url": _make_ballot_b64("pres", "cand_alice"), "credential_nullifier": "n0"},
        {"leaf_index": 1, "engine_ballot_b64url": _make_ballot_b64("pres", "cand_alice"), "credential_nullifier": "n1"},
        {"leaf_index": 2, "engine_ballot_b64url": _make_ballot_b64("pres", "cand_alice"), "credential_nullifier": "n2"},
        {"leaf_index": 3, "engine_ballot_b64url": _make_ballot_b64("pres", "cand_bob"), "credential_nullifier": "n3"},
        {"leaf_index": 4, "engine_ballot_b64url": _make_ballot_b64("pres", "cand_bob"), "credential_nullifier": "n4"},
        {"leaf_index": 5, "engine_ballot_b64url": _make_ballot_b64("pres", "cand_carol"), "credential_nullifier": "n5"},
    ]

    results = {
        "contest_tallies": {
            "cand_alice": 3,
            "cand_bob": 2,
            "cand_carol": 1,
        },
        "total_ballots": 6,
    }

    archive = ElectionArchive(
        manifest=manifest,
        leaves=leaves,
        results=results,
        source_path=Path("/tmp/test_archive"),
    )

    recomputed, matches_announced, tallies_list = archive.recompute_tally()

    assert matches_announced is True
    assert recomputed == {"cand_alice": 3, "cand_bob": 2, "cand_carol": 1}

    assert len(tallies_list) == 3
    # Check Alice (winner)
    assert tallies_list[0].candidate_id == "cand_alice"
    assert tallies_list[0].name == "Alice Wonderland"
    assert tallies_list[0].vote_count == 3
    assert tallies_list[0].percentage == 50.0
    assert tallies_list[0].rank == 1
    assert tallies_list[0].is_winner is True

    # Check Bob
    assert tallies_list[1].candidate_id == "cand_bob"
    assert tallies_list[1].vote_count == 2
    assert tallies_list[1].rank == 2
    assert tallies_list[1].is_winner is False

    # Check Carol
    assert tallies_list[2].candidate_id == "cand_carol"
    assert tallies_list[2].vote_count == 1
    assert tallies_list[2].rank == 3
    assert tallies_list[2].is_winner is False


def test_tally_tie_identifies_multiple_winners() -> None:
    manifest = {
        "election_id": "elec_tie",
        "candidates": [
            {"id": "cand_a", "name": "Candidate Alpha"},
            {"id": "cand_b", "name": "Candidate Beta"},
        ],
    }
    leaves = [
        {"leaf_index": 0, "engine_ballot_b64url": _make_ballot_b64("c", "cand_a"), "credential_nullifier": "n0"},
        {"leaf_index": 1, "engine_ballot_b64url": _make_ballot_b64("c", "cand_b"), "credential_nullifier": "n1"},
    ]
    results = {"contest_tallies": {"cand_a": 1, "cand_b": 1}}

    archive = ElectionArchive(
        manifest=manifest,
        leaves=leaves,
        results=results,
        source_path=Path("/tmp/tie"),
    )
    _, _, tallies = archive.recompute_tally()
    assert len(tallies) == 2
    assert tallies[0].is_winner is True
    assert tallies[1].is_winner is True
    assert tallies[0].percentage == 50.0
    assert tallies[1].percentage == 50.0


def test_tally_mismatch_detection() -> None:
    manifest = {"election_id": "elec_mismatch"}
    leaves = [
        {"leaf_index": 0, "engine_ballot_b64url": _make_ballot_b64("c", "cand_a"), "credential_nullifier": "n0"},
    ]
    # Announced results claim cand_b won
    results = {"contest_tallies": {"cand_b": 10}}

    archive = ElectionArchive(
        manifest=manifest,
        leaves=leaves,
        results=results,
        source_path=Path("/tmp/mismatch"),
    )
    recomputed, matches_announced, _ = archive.recompute_tally()
    assert matches_announced is False
    assert recomputed == {"cand_a": 1}


def test_tally_zero_total_votes() -> None:
    manifest = {
        "election_id": "elec_zero",
        "candidates": [{"id": "cand_a", "name": "Candidate Alpha"}],
    }
    archive = ElectionArchive(
        manifest=manifest,
        leaves=[],
        results={"contest_tallies": {}},
        source_path=Path("/tmp/zero"),
    )
    recomputed, _, tallies = archive.recompute_tally()
    assert recomputed == {}
    assert len(tallies) == 1
    assert tallies[0].vote_count == 0
    assert tallies[0].percentage == 0.0
    assert tallies[0].is_winner is False


def test_simulation_data_tally_visualization() -> None:
    simulation_export = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not simulation_export.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    archive = ElectionArchive.load(simulation_export)
    recomputed, matches_announced, tallies = archive.recompute_tally()

    assert matches_announced is True
    assert len(tallies) == 4

    # Top candidate should be Aarav Sharma with 35 votes (35.0%)
    assert tallies[0].name == "Aarav Sharma"
    assert tallies[0].candidate_id == "cand_aarav_sharma"
    assert tallies[0].vote_count == 35
    assert tallies[0].percentage == 35.0
    assert tallies[0].rank == 1
    assert tallies[0].is_winner is True

    # Total votes should sum to 100
    assert sum(t.vote_count for t in tallies) == 100
    archive.close()
