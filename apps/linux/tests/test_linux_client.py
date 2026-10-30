"""Unit tests for HimVote Linux client data models and utility helpers."""

from pathlib import Path
import sys
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    ApiError,
    ArchiveError,
    ArchiveInspectionResult,
    Candidate,
    CandidateTally,
    Election,
    LinuxApiClient,
    MerkleProofError,
    MerkleProofResult,
    Receipt,
    demo_elections,
    status_colour,
)


def test_demo_data_is_explicitly_non_production() -> None:
    elections = demo_elections()
    assert len(elections) == 2
    assert elections[0].election_id.startswith("demo_")


def test_election_payload_accepts_api_identifier_shapes() -> None:
    election = Election.from_payload({"election_id": "election_1", "title": "Council", "state": "OPEN", "candidates": [{"id": "a"}]})
    assert election.election_id == "election_1"
    assert election.candidate_count == 1


@pytest.mark.parametrize(
    "state, expected",
    [
        ("WITNESSED", "#15805D"),
        ("PENDING_WITNESS", "#AA6C0B"),
        ("DISPUTED", "#C23C45"),
        ("PASS", "#15805D"),
        ("MATCH", "#15805D"),
        ("FAIL", "#C23C45"),
        ("MISMATCH", "#C23C45"),
        ("STANDALONE", "#AA6C0B"),
        ("OTHER", "#157E92"),
    ],
)
def test_state_colour_only_marks_confirmed_states_green(state: str, expected: str) -> None:
    assert status_colour(state) == expected


def test_receipt_model_keeps_unwitnessed_state_visible() -> None:
    receipt = Receipt(status="PENDING_WITNESS")
    assert receipt.status == "PENDING_WITNESS"
    assert receipt.witnessed_at is None


def test_api_client_normalizes_base_url() -> None:
    client = LinuxApiClient("http://localhost:8080/")
    assert client.base_url == "http://localhost:8080"


def test_candidate_and_tally_models() -> None:
    candidate = Candidate(candidate_id="cand_1", name="Alice Smith")
    assert candidate.candidate_id == "cand_1"
    assert candidate.name == "Alice Smith"

    tally = CandidateTally(
        candidate_id="cand_1",
        name="Alice Smith",
        vote_count=50,
        percentage=50.0,
        rank=1,
        is_winner=True,
    )
    assert tally.vote_count == 50
    assert tally.is_winner is True


def test_merkle_proof_result_model() -> None:
    result = MerkleProofResult(
        leaf_index=0,
        leaf_hash="sha256:abc",
        leaf_id="ballot_1",
        nullifier="sha256:null_1",
        path_length=2,
        siblings=[("right", "sha256:sibling_1"), ("left", "sha256:sibling_2")],
        verified=True,
        root_hex="sha256:root",
    )
    assert result.leaf_index == 0
    assert result.verified is True
    assert len(result.siblings) == 2


def test_archive_inspection_result_validity_property() -> None:
    valid_res = ArchiveInspectionResult(
        archive_path="/tmp/test",
        election_id="elec_1",
        title="Student Council",
        protocol_version="himvote 2.0.0",
        voting_engine="electionguard 1.0.0",
        eligible_count=100,
        total_leaves=100,
        candidate_count=2,
        manifest_digest="sha256:man",
        manifest_digest_valid=True,
        leaf_sequence_valid=True,
        nullifiers_unique=True,
        merkle_root_hex="sha256:root",
        witness_root_hex="sha256:root",
        merkle_root_matches_witness=True,
        last_leaf_digest="sha256:last",
        last_leaf_matches_witness=True,
        tally_recomputed_matches_announced=True,
        candidate_tallies=[],
        recomputed_tallies={},
        announced_tallies={},
    )
    assert valid_res.is_valid is True

    # When witness root does not match
    mismatch_res = ArchiveInspectionResult(
        archive_path="/tmp/test",
        election_id="elec_1",
        title="Student Council",
        protocol_version="himvote 2.0.0",
        voting_engine="electionguard 1.0.0",
        eligible_count=100,
        total_leaves=100,
        candidate_count=2,
        manifest_digest="sha256:man",
        manifest_digest_valid=True,
        leaf_sequence_valid=True,
        nullifiers_unique=True,
        merkle_root_hex="sha256:root_a",
        witness_root_hex="sha256:root_b",
        merkle_root_matches_witness=False,
        last_leaf_digest="sha256:last",
        last_leaf_matches_witness=True,
        tally_recomputed_matches_announced=True,
        candidate_tallies=[],
        recomputed_tallies={},
        announced_tallies={},
    )
    assert mismatch_res.is_valid is False
