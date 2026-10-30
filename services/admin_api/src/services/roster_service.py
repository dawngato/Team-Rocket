"""
Roster submission and approval service enforcing independent approver checks.
Enforces Section 4 requirement that Roster Approver is a different person from importer.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    ElectionRosterSnapshotModel,
    RosterMemberModel,
    utcnow_str
)
from src.models.schemas import StudentRecord, RosterApproveRequest
from src.crypto.hashing import compute_roster_commitment
from src.crypto.signatures import verify_ed25519_signature
from src.state_machine.lifecycle import (
    ElectionLifecycleManager,
    StateMachineError,
    StatePreconditionError
)


class RosterService:
    """Service handling roster ingestion, Merkle commitment, and independent approval."""

    @classmethod
    def submit_roster(
        cls,
        db: Session,
        election_id: str,
        actor_id: str,
        roster_version: str,
        records: List[StudentRecord]
    ) -> Dict[str, Any]:
        """
        Submits roster snapshot before approval.
        Computes deterministic roster commitment and persists members.
        """
        state_record = (
            db.query(ElectionStateModel)
            .filter(ElectionStateModel.election_id == election_id)
            .first()
        )
        if not state_record:
            raise StateMachineError(f"Election {election_id} not found", "NOT_FOUND")

        ElectionLifecycleManager.assert_mutable(state_record.state)

        if not records:
            raise StatePreconditionError("Roster records list cannot be empty")

        existing_snapshot = (
            db.query(ElectionRosterSnapshotModel)
            .filter(
                ElectionRosterSnapshotModel.election_id == election_id,
                ElectionRosterSnapshotModel.roster_version == roster_version
            )
            .first()
        )
        if existing_snapshot:
            raise StateMachineError(
                f"Roster version {roster_version} already submitted for election {election_id}",
                "ROSTER_ALREADY_SUBMITTED"
            )

        member_dicts = [r.model_dump() for r in records]
        roster_commitment = compute_roster_commitment(member_dicts)

        snapshot = ElectionRosterSnapshotModel(
            election_id=election_id,
            roster_version=roster_version,
            roster_commitment=roster_commitment,
            eligible_count=len(records),
            submitted_by=actor_id,
            status="SUBMITTED"
        )
        db.add(snapshot)

        for rec in records:
            member = RosterMemberModel(
                election_id=election_id,
                roster_version=roster_version,
                student_id=rec.student_id,
                email=rec.email,
                full_name=rec.full_name,
                department=rec.department
            )
            db.add(member)

        if state_record.state == "DRAFT":
            ElectionLifecycleManager.transition(
                db=db,
                election_id=election_id,
                target_state="REVIEW",
                actor_id=actor_id,
                details={"action": "roster_submitted", "roster_version": roster_version}
            )

        db.commit()
        db.refresh(snapshot)

        return {
            "election_id": election_id,
            "roster_version": roster_version,
            "roster_commitment": roster_commitment,
            "eligible_count": len(records),
            "submitted_by": actor_id,
            "status": "SUBMITTED"
        }

    @classmethod
    def approve_roster(
        cls,
        db: Session,
        election_id: str,
        actor_id: str,
        approval_request: RosterApproveRequest
    ) -> Dict[str, Any]:
        """
        Approves and signs the roster snapshot.
        Enforces that Roster Approver is an independent person, distinct from submitter.
        """
        state_record = (
            db.query(ElectionStateModel)
            .filter(ElectionStateModel.election_id == election_id)
            .first()
        )
        if not state_record:
            raise StateMachineError(f"Election {election_id} not found", "NOT_FOUND")

        ElectionLifecycleManager.assert_mutable(state_record.state)

        snapshot = (
            db.query(ElectionRosterSnapshotModel)
            .filter(
                ElectionRosterSnapshotModel.election_id == election_id,
                ElectionRosterSnapshotModel.roster_version == approval_request.roster_version
            )
            .first()
        )
        if not snapshot:
            raise StatePreconditionError(
                f"Roster version {approval_request.roster_version} not submitted yet"
            )

        if snapshot.submitted_by == actor_id:
            raise StateMachineError(
                "Roster Approver must be a distinct independent person from the importer per Section 4",
                "ROSTER_APPROVER_NOT_INDEPENDENT"
            )

        if not approval_request.approver_public_key or not approval_request.approver_signature:
            raise StatePreconditionError(
                "Roster approval requires an independent approver signature"
            )

        if snapshot.status == "APPROVED":
            return {
                "election_id": election_id,
                "roster_version": snapshot.roster_version,
                "status": "APPROVED",
                "approved_by": snapshot.approved_by,
                "roster_commitment": snapshot.roster_commitment
            }

        if approval_request.approver_public_key and approval_request.approver_signature:
            message_to_verify = f"{election_id}:{snapshot.roster_commitment}:{snapshot.eligible_count}".encode("utf-8")
            is_valid = verify_ed25519_signature(
                public_key_hex=approval_request.approver_public_key,
                message=message_to_verify,
                signature_b64=approval_request.approver_signature
            )
            if not is_valid:
                raise StatePreconditionError("Invalid cryptographic signature provided by Roster Approver")
            snapshot.approver_public_key = approval_request.approver_public_key
            snapshot.approver_signature = approval_request.approver_signature

        snapshot.status = "APPROVED"
        snapshot.approved_by = actor_id
        snapshot.approved_at_utc = utcnow_str()

        if state_record.state in {"DRAFT", "REVIEW"}:
            ElectionLifecycleManager.transition(
                db=db,
                election_id=election_id,
                target_state="APPROVED",
                actor_id=actor_id,
                details={"action": "roster_approved", "roster_version": snapshot.roster_version}
            )

        db.commit()
        db.refresh(snapshot)

        return {
            "election_id": election_id,
            "roster_version": snapshot.roster_version,
            "roster_commitment": snapshot.roster_commitment,
            "eligible_count": snapshot.eligible_count,
            "approved_by": actor_id,
            "approved_at_utc": snapshot.approved_at_utc,
            "status": "APPROVED"
        }
