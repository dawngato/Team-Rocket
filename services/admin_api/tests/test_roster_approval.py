"""
Unit tests for independent Roster Approver verification.
Enforces Section 4 requirement: Roster Approver must be distinct from importer.
"""

import pytest
from src.services.roster_service import RosterService
from src.models.database import ElectionModel, ElectionStateModel
from src.models.schemas import StudentRecord, RosterApproveRequest
from src.crypto.signatures import sign_data_ed25519
from src.state_machine.lifecycle import StateMachineError, StatePreconditionError


def create_draft_election(db, election_id="elec_roster_test"):
    """Creates a basic draft election for roster testing."""
    elec = ElectionModel(
        id=election_id,
        title="Department Council Election",
        contest="Representative",
        selection_rule="plurality",
        opens_at_utc="2026_11_20T09:00:00Z",
        closes_at_utc="2026_11_20T17:00:00Z",
        issuance_cutoff_utc="2026_11_20T08:30:00Z",
        min_anonymous_turnout=10
    )
    db.add(elec)
    state = ElectionStateModel(
        election_id=election_id,
        state="DRAFT",
        manifest_digest="",
        opens_at_utc="2026_11_20T09:00:00Z",
        closes_at_utc="2026_11_20T17:00:00Z",
        issuance_cutoff_utc="2026_11_20T08:30:00Z"
    )
    db.add(state)
    db.commit()
    return elec


def test_roster_submission_and_commitment(test_db):
    """Tests roster ingestion and deterministic Merkle commitment computation."""
    elec = create_draft_election(test_db, "elec_roster_sub")
    records = [
        StudentRecord(student_id="S101", email="s101@univ.edu", full_name="Student One", department="CS"),
        StudentRecord(student_id="S102", email="s102@univ.edu", full_name="Student Two", department="EE")
    ]

    res = RosterService.submit_roster(
        db=test_db,
        election_id=elec.id,
        actor_id="importer_alice",
        roster_version="v1",
        records=records
    )

    assert res["status"] == "SUBMITTED"
    assert res["eligible_count"] == 2
    assert res["submitted_by"] == "importer_alice"
    assert len(res["roster_commitment"]) == 64

    # Election state moves to REVIEW
    state_rec = test_db.query(ElectionStateModel).filter_by(election_id=elec.id).first()
    assert state_rec.state == "REVIEW"


def test_self_approval_strictly_forbidden(test_db):
    """
    Asserts that if the same person who submitted the roster attempts to approve it,
    the operation is strictly rejected.
    """
    elec = create_draft_election(test_db, "elec_self_approve")
    records = [StudentRecord(student_id="S201", email="s201@univ.edu", full_name="Student Three", department="CS")]

    RosterService.submit_roster(
        db=test_db,
        election_id=elec.id,
        actor_id="importer_alice",
        roster_version="v1",
        records=records
    )

    # Importer alice tries to approve her own roster
    with pytest.raises(StateMachineError) as exc_info:
        RosterService.approve_roster(
            db=test_db,
            election_id=elec.id,
            actor_id="importer_alice",
            approval_request=RosterApproveRequest(roster_version="v1")
        )

    assert exc_info.value.error_code == "ROSTER_APPROVER_NOT_INDEPENDENT"


def test_independent_approver_success_with_signature(test_db, roster_approver_keypair):
    """
    Asserts that an independent approver successfully approves and cryptographically signs the roster.
    """
    elec = create_draft_election(test_db, "elec_indep_approve")
    records = [
        StudentRecord(student_id="S301", email="s301@univ.edu", full_name="Student Four", department="CS"),
        StudentRecord(student_id="S302", email="s302@univ.edu", full_name="Student Five", department="CS")
    ]

    sub_res = RosterService.submit_roster(
        db=test_db,
        election_id=elec.id,
        actor_id="importer_alice",
        roster_version="v1",
        records=records
    )

    commitment = sub_res["roster_commitment"]
    count = sub_res["eligible_count"]

    # Independent approver bob signs the commitment message
    message = f"{elec.id}:{commitment}:{count}".encode("utf-8")
    sig = sign_data_ed25519(roster_approver_keypair["private_key_hex"], message)

    app_res = RosterService.approve_roster(
        db=test_db,
        election_id=elec.id,
        actor_id="approver_bob",  # Distinct person
        approval_request=RosterApproveRequest(
            roster_version="v1",
            approver_public_key=roster_approver_keypair["public_key_hex"],
            approver_signature=sig
        )
    )

    assert app_res["status"] == "APPROVED"
    assert app_res["approved_by"] == "approver_bob"

    # State transitions to APPROVED
    state_rec = test_db.query(ElectionStateModel).filter_by(election_id=elec.id).first()
    assert state_rec.state == "APPROVED"


def test_independent_approver_signature_is_required(test_db):
    """Distinct actor IDs alone cannot approve an unsigned roster."""
    elec = create_draft_election(test_db, "elec_unsigned_approve")
    RosterService.submit_roster(
        db=test_db,
        election_id=elec.id,
        actor_id="importer_alice",
        roster_version="v1",
        records=[StudentRecord(student_id="S401", email="s401@univ.edu", full_name="Student Six", department="CS")],
    )

    with pytest.raises(StatePreconditionError, match="signature"):
        RosterService.approve_roster(
            db=test_db,
            election_id=elec.id,
            actor_id="approver_bob",
            approval_request=RosterApproveRequest(roster_version="v1"),
        )
