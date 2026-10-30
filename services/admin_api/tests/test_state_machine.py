"""
Unit tests for HimVote election lifecycle state machine.
Validates transition rules, immutability, exception states, and invariants.
"""

import pytest
from src.state_machine.lifecycle import (
    ElectionLifecycleManager,
    InvalidStateTransitionError,
    StatePreconditionError,
    StateMachineError
)
from src.models.database import ElectionModel, ElectionStateModel, utcnow_str


def create_sample_election(db, election_id="elec_test_sm_1"):
    """Helper creating basic election records."""
    elec = ElectionModel(
        id=election_id,
        title="Student Union Election",
        contest="President",
        selection_rule="plurality",
        opens_at_utc="2026_11_01T09:00:00Z",
        closes_at_utc="2026_11_01T17:00:00Z",
        issuance_cutoff_utc="2026_11_01T08:30:00Z",
        min_anonymous_turnout=10
    )
    db.add(elec)
    state = ElectionStateModel(
        election_id=election_id,
        state="DRAFT",
        manifest_digest="",
        opens_at_utc="2026_11_01T09:00:00Z",
        closes_at_utc="2026_11_01T17:00:00Z",
        issuance_cutoff_utc="2026_11_01T08:30:00Z",
        state_version=1,
        next_leaf_index=0,
        last_witnessed_tree_size=0
    )
    db.add(state)
    db.commit()
    return elec, state


def test_full_happy_path_state_transitions(test_db):
    """
    Validates complete canonical sequence:
    DRAFT -> REVIEW -> APPROVED -> FROZEN -> SCHEDULED -> ISSUING ->
    ISSUANCE_CLOSED -> OPEN -> CLOSING -> CLOSED_PENDING_WITNESS ->
    FINAL_WITNESSED -> ANCHOR_FINALIZED -> AUDIT_PASSED -> AUDITOR_ATTESTED -> PUBLISHED.
    """
    elec, state = create_sample_election(test_db, "elec_happy_path")
    election_id = elec.id

    sequence = [
        "REVIEW",
        "APPROVED",
        "FROZEN",
        "SCHEDULED",
        "ISSUING",
        "ISSUANCE_CLOSED",
        "OPEN",
        "CLOSING",
        "CLOSED_PENDING_WITNESS",
        "FINAL_WITNESSED",
        "ANCHOR_FINALIZED",
        "AUDIT_PASSED",
        "AUDITOR_ATTESTED",
        "PUBLISHED"
    ]

    for target in sequence:
        updated = ElectionLifecycleManager.transition(
            db=test_db,
            election_id=election_id,
            target_state=target,
            actor_id="test_admin"
        )
        assert updated.state == target
        assert updated.transition_digest != ""
        assert updated.state_version >= 2

    # Closing must record final tree size equal to next leaf index
    state_rec = test_db.query(ElectionStateModel).filter_by(election_id=election_id).first()
    assert state_rec.final_tree_size == 0


def test_invalid_transitions_rejected(test_db):
    """Checks that illegal transitions raise InvalidStateTransitionError."""
    elec, state = create_sample_election(test_db, "elec_invalid_trans")
    election_id = elec.id

    # Cannot jump directly from DRAFT to PUBLISHED
    with pytest.raises(InvalidStateTransitionError):
        ElectionLifecycleManager.transition(test_db, election_id, "PUBLISHED", "actor")

    # Cannot jump directly from DRAFT to OPEN
    with pytest.raises(InvalidStateTransitionError):
        ElectionLifecycleManager.transition(test_db, election_id, "OPEN", "actor")

    # Transition to REVIEW
    ElectionLifecycleManager.transition(test_db, election_id, "REVIEW", "actor")

    # Cannot jump from REVIEW to OPEN
    with pytest.raises(InvalidStateTransitionError):
        ElectionLifecycleManager.transition(test_db, election_id, "OPEN", "actor")


def test_no_reopening_after_published(test_db):
    """Elections are never reopened once published."""
    elec, state = create_sample_election(test_db, "elec_no_reopen")
    election_id = elec.id

    state.state = "PUBLISHED"
    test_db.commit()

    with pytest.raises(InvalidStateTransitionError):
        ElectionLifecycleManager.transition(test_db, election_id, "OPEN", "actor")


def test_pause_and_resume(test_db):
    """Validates PAUSED exception state and resumption."""
    elec, state = create_sample_election(test_db, "elec_pause_test")
    election_id = elec.id

    state.state = "OPEN"
    test_db.commit()

    # Pause from OPEN
    paused = ElectionLifecycleManager.transition(test_db, election_id, "PAUSED", "actor", {"reason": "maintenance"})
    assert paused.state == "PAUSED"

    # Resume back to OPEN
    resumed = ElectionLifecycleManager.transition(test_db, election_id, "OPEN", "actor")
    assert resumed.state == "OPEN"


def test_cancellation_requires_signed_reason(test_db):
    """Cancellation requires signed reason per Section 4."""
    elec, state = create_sample_election(test_db, "elec_cancel_test")
    election_id = elec.id

    with pytest.raises(StatePreconditionError):
        ElectionLifecycleManager.transition(
            db=test_db,
            election_id=election_id,
            target_state="CANCELLED",
            actor_id="officer",
            cancellation_reason="",
            cancellation_signature=""
        )

    cancelled = ElectionLifecycleManager.transition(
        db=test_db,
        election_id=election_id,
        target_state="CANCELLED",
        actor_id="officer",
        cancellation_reason="Administrative directive",
        cancellation_signature="sig_b64_officer"
    )
    assert cancelled.state == "CANCELLED"


def test_immutability_assertion(test_db):
    """Checks assert_mutable rejects FROZEN and subsequent states."""
    ElectionLifecycleManager.assert_mutable("DRAFT")
    ElectionLifecycleManager.assert_mutable("REVIEW")
    ElectionLifecycleManager.assert_mutable("APPROVED")

    frozen_states = [
        "FROZEN",
        "SCHEDULED",
        "ISSUING",
        "ISSUANCE_CLOSED",
        "OPEN",
        "CLOSING",
        "PUBLISHED"
    ]
    for s in frozen_states:
        with pytest.raises(StateMachineError):
            ElectionLifecycleManager.assert_mutable(s)
