"""
Manifest generation, deterministic hashing, and freezing service.
Enforces Section 4 immutable manifest criteria and validation.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    CandidateModel,
    ManifestVersionModel,
    ElectionRosterSnapshotModel,
    utcnow_str
)
from src.models.schemas import FreezeElectionRequest
from src.crypto.canonical import canonical_json_bytes, canonical_json_str
from src.crypto.hashing import compute_manifest_digest
from src.state_machine.lifecycle import (
    ElectionLifecycleManager,
    StateMachineError,
    StatePreconditionError
)


class ManifestService:
    """Service handling manifest computation, validation, and freezing."""

    @staticmethod
    def validate_utc_timestamps(
        opens_at_utc: str,
        closes_at_utc: str,
        issuance_cutoff_utc: str
    ) -> None:
        """
        Validates UTC timestamps ensuring issuance closes before casting opens,
        and open time precedes close time.
        """
        try:
            open_dt = datetime.fromisoformat(opens_at_utc.replace("_", "-").replace("Z", "+00:00"))
            close_dt = datetime.fromisoformat(closes_at_utc.replace("_", "-").replace("Z", "+00:00"))
            cutoff_dt = datetime.fromisoformat(issuance_cutoff_utc.replace("_", "-").replace("Z", "+00:00"))
        except Exception as e:
            raise StatePreconditionError(f"Invalid ISO timestamp format: {e}")

        if open_dt >= close_dt:
            raise StatePreconditionError("Election open time must precede close time")

        if cutoff_dt > open_dt:
            raise StatePreconditionError(
                "Credential issuance must finish before casting opens per Section 4"
            )

    @classmethod
    def build_canonical_manifest_dict(
        cls,
        election: ElectionModel,
        candidates: List[CandidateModel],
        roster_snapshot: ElectionRosterSnapshotModel,
        freeze_params: FreezeElectionRequest
    ) -> Dict[str, Any]:
        """
        Constructs the canonical manifest dictionary with all required fields per Section 4.
        """
        candidate_entries = [
            {
                "id": c.id,
                "name": c.name,
                "contest": c.contest
            }
            for c in sorted(candidates, key=lambda x: x.id)
        ]

        manifest = {
            "schema": "himvote.election_manifest.v1",
            "election_id": election.id,
            "contest": election.contest,
            "selection_rule": election.selection_rule,
            "candidates": candidate_entries,
            "roster_version": roster_snapshot.roster_version,
            "roster_commitment": roster_snapshot.roster_commitment,
            "eligible_count": roster_snapshot.eligible_count,
            "issuer_key_id": freeze_params.issuer_key_id or "issuer_key_default",
            "engine_name": freeze_params.engine_name or "himvote_engine_v1",
            "engine_version": freeze_params.engine_version or "1.0.0",
            "trustees": sorted(freeze_params.trustees or []),
            "log_key_id": freeze_params.log_key_id or "log_key_default",
            "witness_keys": sorted(freeze_params.witness_keys or []),
            "auditor_key_fingerprint": freeze_params.auditor_key_fingerprint or "CHANGE_ME",
            "verifier_version": freeze_params.verifier_version or "1.0.0",
            "minimum_anonymity_turnout": election.min_anonymous_turnout,
            "opens_at_utc": election.opens_at_utc,
            "closes_at_utc": election.closes_at_utc,
            "issuance_cutoff_utc": election.issuance_cutoff_utc,
            "anchor_policy": freeze_params.anchor_policy or "anchor_required_before_publication"
        }
        return manifest

    @classmethod
    def freeze_election(
        cls,
        db: Session,
        election_id: str,
        actor_id: str,
        freeze_params: FreezeElectionRequest
    ) -> Dict[str, Any]:
        """
        Freezes the election:
        1. Verifies election state is APPROVED.
        2. Verifies candidates list is non empty.
        3. Verifies roster snapshot is APPROVED by independent approver.
        4. Validates UTC schedule constraints.
        5. Computes deterministic manifest digest.
        6. Persists manifest record and updates state to FROZEN.
        """
        election = db.query(ElectionModel).filter(ElectionModel.id == election_id).first()
        if not election:
            raise StateMachineError(f"Election {election_id} not found", "NOT_FOUND")

        state_record = (
            db.query(ElectionStateModel)
            .filter(ElectionStateModel.election_id == election_id)
            .first()
        )
        if not state_record:
            raise StateMachineError(f"State not found for {election_id}", "NOT_FOUND")

        if state_record.state in ElectionLifecycleManager.FROZEN_OR_LATER_STATES:
            raise StateMachineError("Election is already frozen or in a later state", "ALREADY_FROZEN")

        if state_record.state != "APPROVED":
            raise StatePreconditionError(
                f"Election must be in APPROVED state before freeze. Current: {state_record.state}"
            )

        candidates = (
            db.query(CandidateModel)
            .filter(CandidateModel.election_id == election_id)
            .all()
        )
        if not candidates:
            raise StatePreconditionError("Election has no candidates. Cannot freeze.")

        roster_snapshot = (
            db.query(ElectionRosterSnapshotModel)
            .filter(ElectionRosterSnapshotModel.election_id == election_id)
            .order_by(ElectionRosterSnapshotModel.id.desc())
            .first()
        )
        if not roster_snapshot:
            raise StatePreconditionError("No roster snapshot found. Roster required before freeze.")

        if roster_snapshot.status != "APPROVED":
            raise StatePreconditionError("Roster snapshot is not approved by independent Roster Approver.")

        cls.validate_utc_timestamps(
            election.opens_at_utc,
            election.closes_at_utc,
            election.issuance_cutoff_utc
        )

        manifest_dict = cls.build_canonical_manifest_dict(
            election=election,
            candidates=candidates,
            roster_snapshot=roster_snapshot,
            freeze_params=freeze_params
        )

        manifest_digest = compute_manifest_digest(manifest_dict)
        manifest_json_str = canonical_json_str(manifest_dict)

        existing_manifest = (
            db.query(ManifestVersionModel)
            .filter(ManifestVersionModel.election_id == election_id)
            .first()
        )
        if existing_manifest:
            raise StateMachineError("Manifest already exists for this election", "MANIFEST_EXISTS")

        manifest_record = ManifestVersionModel(
            election_id=election_id,
            version=1,
            manifest_digest=manifest_digest,
            manifest_json=manifest_json_str,
            frozen_at_utc=utcnow_str(),
            frozen_by=actor_id
        )
        db.add(manifest_record)

        state_record.manifest_digest = manifest_digest

        ElectionLifecycleManager.transition(
            db=db,
            election_id=election_id,
            target_state="FROZEN",
            actor_id=actor_id,
            details={"manifest_digest": manifest_digest}
        )

        return {
            "election_id": election_id,
            "manifest_digest": manifest_digest,
            "state": "FROZEN",
            "manifest": manifest_dict
        }
