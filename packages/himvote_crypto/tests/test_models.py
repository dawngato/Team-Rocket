"""Unit tests for HimVote canonical models."""

import pytest
from pydantic import ValidationError
from himvote_crypto.models import BallotEvidenceRecord, CheckpointRecord


def test_ballot_evidence_record_valid():
    """Verify construction and canonical representation of BallotEvidenceRecord."""
    rec = BallotEvidenceRecord(
        schema="himvote.ballot-evidence.v1",
        election_id="election_2026_univ",
        manifest_digest="a" * 64,
        ballot_id="ballot_001",
        leaf_index=0,
        credential_nullifier="n" * 64,
        credential_proof_b64url="b64_proof",
        engine_ballot_b64url="b64_ballot",
        engine_proofs_b64url="b64_engine_proofs",
        engine_record_version="1.0.0",
    )
    canon_bytes = rec.canonical_bytes()
    assert isinstance(canon_bytes, bytes)
    assert rec.leaf_hash_hex() == rec.leaf_hash().hex()
    assert len(rec.leaf_hash()) == 32


def test_ballot_evidence_record_extra_field_forbidden():
    """Verify that extra fields are rejected per strict data model rules."""
    with pytest.raises(ValidationError):
        BallotEvidenceRecord(
            schema="himvote.ballot-evidence.v1",
            election_id="election_2026_univ",
            manifest_digest="a" * 64,
            ballot_id="ballot_001",
            leaf_index=0,
            credential_nullifier="n" * 64,
            credential_proof_b64url="b64_proof",
            engine_ballot_b64url="b64_ballot",
            engine_proofs_b64url="b64_engine_proofs",
            engine_record_version="1.0.0",
            illegal_voter_name="Alice",
        )


def test_ballot_evidence_record_negative_leaf_index():
    """Verify negative leaf_index is rejected."""
    with pytest.raises(ValidationError):
        BallotEvidenceRecord(
            schema="himvote.ballot-evidence.v1",
            election_id="election_2026_univ",
            manifest_digest="a" * 64,
            ballot_id="ballot_001",
            leaf_index=-1,
            credential_nullifier="n" * 64,
            credential_proof_b64url="b64_proof",
            engine_ballot_b64url="b64_ballot",
            engine_proofs_b64url="b64_engine_proofs",
            engine_record_version="1.0.0",
        )


def test_checkpoint_record_valid():
    """Verify construction and digest computation of CheckpointRecord."""
    cp = CheckpointRecord(
        schema="himvote.checkpoint.v1",
        election_id="election_2026_univ",
        manifest_digest="m" * 64,
        tree_size=10,
        merkle_root="r" * 64,
        previous_checkpoint_digest="p" * 64,
        last_leaf_index=9,
        last_leaf_digest="l" * 64,
        issued_count=50,
        issuance_ledger_digest="i" * 64,
        roster_commitment="c" * 64,
        protocol_version="1.0.0",
        checkpoint_kind="FINAL",
        checkpoint_sequence=2,
    )
    canon_bytes = cp.canonical_bytes()
    assert isinstance(canon_bytes, bytes)
    assert len(cp.digest()) == 32
    assert cp.digest_hex() == cp.digest().hex()


def test_checkpoint_record_invalid_kind():
    """Verify invalid checkpoint_kind is rejected."""
    with pytest.raises(ValidationError):
        CheckpointRecord(
            schema="himvote.checkpoint.v1",
            election_id="election_2026_univ",
            manifest_digest="m" * 64,
            tree_size=10,
            merkle_root="r" * 64,
            previous_checkpoint_digest="",
            last_leaf_index=9,
            last_leaf_digest="l" * 64,
            issued_count=50,
            issuance_ledger_digest="i" * 64,
            roster_commitment="c" * 64,
            checkpoint_kind="INVALID_KIND",
            checkpoint_sequence=1,
        )
