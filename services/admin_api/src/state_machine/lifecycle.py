"""
Election lifecycle state machine for HimVote.
Enforces Section 4 and Section 6.2 lifecycle rules deterministically and transactionally.
"""

from typing import Dict, Set, Optional, Any
from sqlalchemy.orm import Session
from src.models.database import (
    ElectionStateModel,
    ElectionModel,
    ElectionEventModel,
    CancellationRecordModel,
    utcnow_str
)
from src.crypto.hashing import sha256_digest


class StateMachineError(Exception):
    """Base exception for state machine violations."""
    def __init__(self, message: str, error_code: str = "STATE_MACHINE_ERROR"):
        super().__init__(message)
        self.message = message
        self.error_code = error_code


class InvalidStateTransitionError(StateMachineError):
    """Raised when an illegal transition is attempted."""
    def __init__(self, from_state: str, to_state: str):
        super().__init__(
            f"Cannot transition election from {from_state} to {to_state}",
            "INVALID_STATE_TRANSITION"
        )


class StatePreconditionError(StateMachineError):
    """Raised when preconditions for a state transition are not satisfied."""
    def __init__(self, reason: str):
        super().__init__(reason, "STATE_PRECONDITION_FAILED")


class ElectionLifecycleManager:
    """
    Deterministic state machine engine enforcing election states and invariants.
    """

    STATES: Set[str] = {
        "DRAFT",
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
        "PUBLISHED",
        "PAUSED",
        "CANCELLED",
        "DISPUTED",
        "AUDIT_FAILED",
        "UNVERIFIABLE",
    }

    FROZEN_OR_LATER_STATES: Set[str] = {
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
        "PUBLISHED",
        "PAUSED",
        "CANCELLED",
        "DISPUTED",
        "AUDIT_FAILED",
        "UNVERIFIABLE",
    }

    ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
        "DRAFT": {"REVIEW", "CANCELLED"},
        "REVIEW": {"APPROVED", "DRAFT", "CANCELLED"},
        "APPROVED": {"FROZEN", "REVIEW", "CANCELLED"},
        "FROZEN": {"SCHEDULED", "ISSUING", "CANCELLED", "DISPUTED"},
        "SCHEDULED": {"ISSUING", "PAUSED", "CANCELLED", "DISPUTED"},
        "ISSUING": {"ISSUANCE_CLOSED", "PAUSED", "CANCELLED", "DISPUTED"},
        "ISSUANCE_CLOSED": {"OPEN", "PAUSED", "CANCELLED", "DISPUTED"},
        "OPEN": {"CLOSING", "PAUSED", "CANCELLED", "DISPUTED"},
        "CLOSING": {"CLOSED_PENDING_WITNESS", "DISPUTED", "UNVERIFIABLE"},
        "CLOSED_PENDING_WITNESS": {"FINAL_WITNESSED", "DISPUTED", "UNVERIFIABLE"},
        "FINAL_WITNESSED": {"ANCHOR_FINALIZED", "DISPUTED", "AUDIT_FAILED", "UNVERIFIABLE"},
        "ANCHOR_FINALIZED": {"AUDIT_PASSED", "AUDIT_FAILED", "DISPUTED", "UNVERIFIABLE"},
        "AUDIT_PASSED": {"AUDITOR_ATTESTED", "DISPUTED", "UNVERIFIABLE"},
        "AUDITOR_ATTESTED": {"PUBLISHED", "DISPUTED", "UNVERIFIABLE"},
        "PUBLISHED": set(),
        "PAUSED": {"SCHEDULED", "ISSUING", "OPEN", "CANCELLED", "DISPUTED"},
        "CANCELLED": set(),
        "DISPUTED": {"UNVERIFIABLE", "CANCELLED"},
        "AUDIT_FAILED": {"DISPUTED", "UNVERIFIABLE"},
        "UNVERIFIABLE": {"DISPUTED", "CANCELLED"},
    }

    @classmethod
    def can_transition(cls, from_state: str, to_state: str) -> bool:
        """Returns True if transition is mathematically permissible."""
        return to_state in cls.ALLOWED_TRANSITIONS.get(from_state, set())

    @classmethod
    def transition(
        cls,
        db: Session,
        election_id: str,
        target_state: str,
        actor_id: str,
        details: Optional[Dict[str, Any]] = None,
        cancellation_reason: Optional[str] = None,
        cancellation_signature: Optional[str] = None
    ) -> ElectionStateModel:
        """
        Executes an atomic transactional transition of election state.
        Validates transition rules, updates state version, transition digest,
        and records an append only election event.
        """
        state_record = (
            db.query(ElectionStateModel)
            .filter(ElectionStateModel.election_id == election_id)
            .with_for_update()
            .first()
        )
        if not state_record:
            raise StateMachineError(f"Election state not found for {election_id}", "NOT_FOUND")

        current_state = state_record.state

        if target_state not in cls.STATES:
            raise StateMachineError(f"Unknown target state {target_state}", "INVALID_TARGET_STATE")

        if not cls.can_transition(current_state, target_state):
            raise InvalidStateTransitionError(current_state, target_state)

        if target_state == "CLOSING":
            state_record.final_tree_size = state_record.next_leaf_index

        if target_state == "CANCELLED":
            if not cancellation_reason or not cancellation_signature:
                raise StatePreconditionError(
                    "Cancellation requires signed reason per Section 4"
                )
            cancellation_record = CancellationRecordModel(
                election_id=election_id,
                reason=cancellation_reason,
                signature=cancellation_signature,
                actor_id=actor_id,
                created_at_utc=utcnow_str()
            )
            db.add(cancellation_record)

        transition_payload = f"{election_id}:{current_state}->{target_state}:{state_record.state_version}:{utcnow_str()}"
        state_record.transition_digest = sha256_digest(transition_payload)
        state_record.state = target_state
        state_record.state_version += 1
        state_record.updated_at_utc = utcnow_str()

        event_id = sha256_digest(f"{election_id}:{state_record.state_version}:{utcnow_str()}")
        event = ElectionEventModel(
            id=event_id,
            election_id=election_id,
            event_type=f"STATE_TRANSITION_{target_state}",
            state_before=current_state,
            state_after=target_state,
            actor_id=actor_id,
            details_json=str(details) if details else None,
            created_at_utc=utcnow_str()
        )
        db.add(event)
        db.commit()
        db.refresh(state_record)

        return state_record

    @classmethod
    def assert_mutable(cls, state: str) -> None:
        """
        Throws StateMachineError if state is FROZEN or any subsequent state.
        Ensures immutability after freeze.
        """
        if state in cls.FROZEN_OR_LATER_STATES:
            raise StateMachineError(
                f"Election is immutable in state {state}. Changes rejected.",
                "ELECTION_IMMUTABLE"
            )
