"""Tamper detection unit tests for ciphertexts, proofs, and manifests."""

import copy
import pytest

from ..adapter import BallotValidationError, VotingEngineAdapter
from ..booth import create_encrypted_ballot
from ..constants import G, P
from ..crypto import TrusteeKeyPair, canonical_json, sha256_digest


@pytest.fixture
def ballot_fixture():
    election_id = "election_tamper_fixture"
    candidates = ["cand_a", "cand_b"]
    manifest_prelim = {"election_id": election_id, "candidates": candidates}
    manifest_digest = sha256_digest(canonical_json(manifest_prelim)).hex()

    t1 = TrusteeKeyPair.generate("t1", manifest_digest, election_id)
    joint_pk = t1.public_key_share

    ballot_data, proofs_data, _ = create_encrypted_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        candidates=candidates,
        selected_candidate_id="cand_b",
        joint_public_key=joint_pk,
    )
    return election_id, manifest_digest, joint_pk, ballot_data, proofs_data


def test_tamper_ciphertext_a(ballot_fixture) -> None:
    """Verify tampering with ciphertext component a raises BallotValidationError."""
    election_id, manifest_digest, joint_pk, ballot_data, proofs_data = ballot_fixture
    adapter = VotingEngineAdapter()

    tampered_b = copy.deepcopy(ballot_data)
    orig = tampered_b["ciphertexts"][0]["a"]
    tampered_b["ciphertexts"][0]["a"] = orig[:-1] + ("0" if orig[-1] != "0" else "1")

    with pytest.raises(BallotValidationError):
        adapter.validate_ballot(election_id, manifest_digest, tampered_b, proofs_data)


def test_tamper_ciphertext_b(ballot_fixture) -> None:
    """Verify tampering with ciphertext component b raises BallotValidationError."""
    election_id, manifest_digest, joint_pk, ballot_data, proofs_data = ballot_fixture
    adapter = VotingEngineAdapter()

    tampered_b = copy.deepcopy(ballot_data)
    orig = tampered_b["ciphertexts"][0]["b"]
    tampered_b["ciphertexts"][0]["b"] = orig[:-1] + ("0" if orig[-1] != "0" else "1")

    with pytest.raises(BallotValidationError):
        adapter.validate_ballot(election_id, manifest_digest, tampered_b, proofs_data)


def test_tamper_disjunctive_proof(ballot_fixture) -> None:
    """Verify tampering with disjunctive proof raises BallotValidationError."""
    election_id, manifest_digest, joint_pk, ballot_data, proofs_data = ballot_fixture
    adapter = VotingEngineAdapter()

    tampered_p = copy.deepcopy(proofs_data)
    orig = tampered_p["disjunctive_proofs"][0]["z0"]
    tampered_p["disjunctive_proofs"][0]["z0"] = orig[:-1] + ("0" if orig[-1] != "0" else "1")

    with pytest.raises(BallotValidationError):
        adapter.validate_ballot(election_id, manifest_digest, ballot_data, tampered_p)


def test_tamper_sum_proof(ballot_fixture) -> None:
    """Verify tampering with sum proof raises BallotValidationError."""
    election_id, manifest_digest, joint_pk, ballot_data, proofs_data = ballot_fixture
    adapter = VotingEngineAdapter()

    tampered_p = copy.deepcopy(proofs_data)
    orig = tampered_p["sum_proof"]["z"]
    tampered_p["sum_proof"]["z"] = orig[:-1] + ("0" if orig[-1] != "0" else "1")

    with pytest.raises(BallotValidationError):
        adapter.validate_ballot(election_id, manifest_digest, ballot_data, tampered_p)


def test_tamper_manifest_digest(ballot_fixture) -> None:
    """Verify mismatch in manifest digest raises BallotValidationError."""
    election_id, manifest_digest, joint_pk, ballot_data, proofs_data = ballot_fixture
    adapter = VotingEngineAdapter()

    with pytest.raises(BallotValidationError):
        adapter.validate_ballot(election_id, "different_manifest_digest", ballot_data, proofs_data)
