"""
Unit tests for manifest freezing logic and immutability enforcement.
Verifies Section 4 manifest digest determinism and pre freeze validation.
"""

import pytest
from src.services.manifest_service import ManifestService
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    CandidateModel,
    ElectionRosterSnapshotModel
)
from src.models.schemas import FreezeElectionRequest
from src.crypto.hashing import compute_manifest_digest
from src.crypto.canonical import canonical_json_bytes
from src.state_machine.lifecycle import StatePreconditionError, StateMachineError


def setup_approved_election(db, election_id="elec_freeze_1"):
    """Helper creating fully approved election ready for freeze."""
    elec = ElectionModel(
        id=election_id,
        title="Faculty Representative Election",
        contest="Faculty Representative",
        selection_rule="plurality",
        opens_at_utc="2026_11_10T09:00:00Z",
        closes_at_utc="2026_11_10T17:00:00Z",
        issuance_cutoff_utc="2026_11_10T08:30:00Z",
        min_anonymous_turnout=15
    )
    db.add(elec)

    state = ElectionStateModel(
        election_id=election_id,
        state="APPROVED",
        manifest_digest="",
        opens_at_utc="2026_11_10T09:00:00Z",
        closes_at_utc="2026_11_10T17:00:00Z",
        issuance_cutoff_utc="2026_11_10T08:30:00Z"
    )
    db.add(state)

    c1 = CandidateModel(id="cand_1", election_id=election_id, name="Alice", contest="Faculty Representative")
    c2 = CandidateModel(id="cand_2", election_id=election_id, name="Bob", contest="Faculty Representative")
    db.add_all([c1, c2])

    roster = ElectionRosterSnapshotModel(
        election_id=election_id,
        roster_version="v1",
        roster_commitment="digest_roster_12345",
        eligible_count=100,
        submitted_by="importer_1",
        status="APPROVED",
        approved_by="approver_1",
        approved_at_utc="2026_11_01T10:00:00Z"
    )
    db.add(roster)
    db.commit()
    return elec


def test_deterministic_manifest_digest(test_db):
    """
    Asserts that computing manifest digest twice for identical inputs
    produces the exact same hex digest.
    """
    elec = setup_approved_election(test_db, "elec_determ_1")
    freeze_params = FreezeElectionRequest(
        issuer_key_id="issuer_prod_key",
        engine_name="himvote_engine_v1",
        engine_version="1.0.0",
        trustees=["trustee_a", "trustee_b"],
        log_key_id="log_key_primary",
        witness_keys=["witness_node_1", "witness_node_2"],
        auditor_key_fingerprint="fingerprint_auditor_xyz",
        verifier_version="1.0.0"
    )

    res1 = ManifestService.freeze_election(
        db=test_db,
        election_id=elec.id,
        actor_id="election_officer",
        freeze_params=freeze_params
    )

    digest1 = res1["manifest_digest"]
    assert len(digest1) == 64
    assert res1["state"] == "FROZEN"

    # Verify manual reconstruction yields identical digest
    canonical_dict = ManifestService.build_canonical_manifest_dict(
        election=elec,
        candidates=elec.candidates,
        roster_snapshot=test_db.query(ElectionRosterSnapshotModel).filter_by(election_id=elec.id).first(),
        freeze_params=freeze_params
    )
    digest2 = compute_manifest_digest(canonical_dict)
    assert digest1 == digest2


def test_freeze_rejects_missing_candidates(test_db):
    """Freezing must fail if candidate list is empty."""
    elec = setup_approved_election(test_db, "elec_no_cand")
    # Delete candidates
    for c in list(elec.candidates):
        test_db.delete(c)
    test_db.commit()

    with pytest.raises(StatePreconditionError):
        ManifestService.freeze_election(
            db=test_db,
            election_id=elec.id,
            actor_id="officer",
            freeze_params=FreezeElectionRequest()
        )


def test_freeze_rejects_unapproved_roster(test_db):
    """Freezing must fail if roster is not in APPROVED status."""
    elec = setup_approved_election(test_db, "elec_unapp_roster")
    roster = test_db.query(ElectionRosterSnapshotModel).filter_by(election_id=elec.id).first()
    roster.status = "SUBMITTED"
    test_db.commit()

    with pytest.raises(StatePreconditionError):
        ManifestService.freeze_election(
            db=test_db,
            election_id=elec.id,
            actor_id="officer",
            freeze_params=FreezeElectionRequest()
        )


def test_freeze_rejects_invalid_utc_order(test_db):
    """Freezing fails if issuance cutoff is after opening time."""
    elec = setup_approved_election(test_db, "elec_bad_times")
    elec.opens_at_utc = "2026_11_10T09:00:00Z"
    elec.issuance_cutoff_utc = "2026_11_10T10:00:00Z"  # Invalid: after open
    test_db.commit()

    with pytest.raises(StatePreconditionError):
        ManifestService.freeze_election(
            db=test_db,
            election_id=elec.id,
            actor_id="officer",
            freeze_params=FreezeElectionRequest()
        )


def test_cannot_freeze_twice(test_db):
    """Freezing an already frozen election must be rejected."""
    elec = setup_approved_election(test_db, "elec_double_freeze")
    ManifestService.freeze_election(
        db=test_db,
        election_id=elec.id,
        actor_id="officer",
        freeze_params=FreezeElectionRequest()
    )

    with pytest.raises(StateMachineError):
        ManifestService.freeze_election(
            db=test_db,
            election_id=elec.id,
            actor_id="officer",
            freeze_params=FreezeElectionRequest()
        )
