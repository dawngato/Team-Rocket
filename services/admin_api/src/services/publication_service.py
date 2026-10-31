"""
Publication gate service for HimVote elections.
Enforces cryptographic auditor signature verification against pinned keys,
and guarantees ANCHOR_FINALIZED and FINAL_WITNESSED invariants before PUBLISHED.
"""

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.config import settings
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    WitnessAcknowledgementModel,
    PublishedResultModel,
    EvidencePackageModel,
    utcnow_str
)
from src.models.schemas import PublicationRequest
from src.crypto.signatures import verify_auditor_signature, get_public_key_fingerprint
from src.crypto.canonical import canonical_json_str
from src.crypto.hashing import sha256_digest
from src.state_machine.lifecycle import (
    ElectionLifecycleManager,
    StateMachineError,
    StatePreconditionError
)


class PublicationService:
    """Service guarding the publication gate."""

    @classmethod
    def process_publication_request(
        cls,
        db: Session,
        election_id: str,
        actor_id: str,
        req: PublicationRequest
    ) -> Dict[str, Any]:
        """
        Executes publication gate verification:
        1. Verifies election reached required witness and anchor milestones.
        2. Verifies final witness checkpoint exists.
        3. Verifies anchor transaction hash is present and valid.
        4. Verifies independent auditor signature against pinned auditor key or fingerprint.
        5. Sets election state to PUBLISHED and stores published results.
        """
        state_record = (
            db.query(ElectionStateModel)
            .filter(ElectionStateModel.election_id == election_id)
            .first()
        )
        if not state_record:
            raise StateMachineError(f"Election {election_id} not found", "NOT_FOUND")

        if state_record.state == "PUBLISHED":
            raise StateMachineError("Election is already published", "ALREADY_PUBLISHED")

        if settings.require_established_engine_tally and not settings.established_engine_tally_verified:
            raise StatePreconditionError(
                "Publication is blocked: no established voting-engine tally verifier has been integrated and independently verified"
            )

        valid_prerequisite_states = {
            "ANCHOR_FINALIZED",
            "AUDIT_PASSED",
            "AUDITOR_ATTESTED",
        }
        if state_record.state not in valid_prerequisite_states:
            raise StatePreconditionError(
                f"Election must have an externally finalized anchor before publication. Current: {state_record.state}"
            )

        final_witnesses = (
            db.query(WitnessAcknowledgementModel)
            .filter(
                WitnessAcknowledgementModel.election_id == election_id,
                WitnessAcknowledgementModel.is_final == True
            )
            .order_by(WitnessAcknowledgementModel.checkpoint_sequence.desc())
            .all()
        )
        if len(final_witnesses) != 1:
            raise StatePreconditionError(
                "Publication requires exactly one final witness checkpoint"
            )
        final_witness = final_witnesses[0]

        attestation = req.attestation_data
        if attestation.get("election_id") != election_id:
            raise StatePreconditionError("Attestation election_id does not match target election")

        if attestation.get("manifest_digest") != state_record.manifest_digest:
            raise StatePreconditionError("Attestation manifest_digest mismatch")

        anchor_tx_hash = attestation.get("anchor_tx_hash")
        if (
            not isinstance(anchor_tx_hash, str)
            or not anchor_tx_hash.startswith("0x")
            or len(anchor_tx_hash) < 10
            or any(char not in "0123456789abcdefABCDEF" for char in anchor_tx_hash[2:])
        ):
            raise StatePreconditionError(
                "Publication requires a valid finalized chain transaction hash"
            )

        final_checkpoint_digest = attestation.get("final_checkpoint_digest")
        if final_checkpoint_digest != final_witness.merkle_root:
            raise StatePreconditionError(
                "Attestation final checkpoint does not match the witnessed final root"
            )

        total_ballots = attestation.get("total_ballots")
        if total_ballots != final_witness.tree_size:
            raise StatePreconditionError(
                "Attestation ballot count does not match the witnessed final tree size"
            )
        if state_record.final_tree_size is not None and state_record.final_tree_size != final_witness.tree_size:
            raise StatePreconditionError(
                "Election close boundary does not match the witnessed final tree size"
            )

        pinned_fingerprint = settings.auditor_public_key_fingerprint
        if settings.pinned_auditor_public_key:
            pinned_fingerprint = get_public_key_fingerprint(settings.pinned_auditor_public_key)

        is_signature_valid = verify_auditor_signature(
            public_key_hex=req.auditor_public_key,
            pinned_fingerprint=pinned_fingerprint,
            attestation_data=attestation,
            signature_b64=req.auditor_signature
        )

        if not is_signature_valid:
            raise StatePreconditionError(
                "Independent auditor cryptographic signature verification failed against pinned auditor key"
            )

        if state_record.state == "ANCHOR_FINALIZED":
            ElectionLifecycleManager.transition(
                db=db,
                election_id=election_id,
                target_state="AUDIT_PASSED",
                actor_id=actor_id,
                details={"auditor_public_key": req.auditor_public_key}
            )

        if state_record.state == "AUDIT_PASSED":
            ElectionLifecycleManager.transition(
                db=db,
                election_id=election_id,
                target_state="AUDITOR_ATTESTED",
                actor_id=actor_id,
                details={"attestation_digest": sha256_digest(str(attestation))}
            )

        ElectionLifecycleManager.transition(
            db=db,
            election_id=election_id,
            target_state="PUBLISHED",
            actor_id=actor_id,
            details={"published_at_utc": utcnow_str()}
        )

        tally_dict = attestation.get("tally", {"total": 0})
        election = db.query(ElectionModel).filter(ElectionModel.id == election_id).first()
        min_turnout = election.min_anonymous_turnout if election else 10
        privacy_limited = total_ballots < min_turnout

        published_res = PublishedResultModel(
            election_id=election_id,
            manifest_digest=state_record.manifest_digest,
            tally_json=canonical_json_str(tally_dict),
            total_ballots=total_ballots,
            published_at_utc=utcnow_str(),
            privacy_limited=privacy_limited
        )
        db.merge(published_res)

        evidence_pkg = EvidencePackageModel(
            election_id=election_id,
            manifest_digest=state_record.manifest_digest,
            final_checkpoint_digest=final_checkpoint_digest,
            anchor_tx_hash=anchor_tx_hash,
            auditor_signature=req.auditor_signature,
            created_at_utc=utcnow_str()
        )
        db.merge(evidence_pkg)

        db.commit()

        return {
            "election_id": election_id,
            "manifest_digest": state_record.manifest_digest,
            "state": "PUBLISHED",
            "published_at_utc": published_res.published_at_utc,
            "total_ballots": total_ballots,
            "privacy_limited": privacy_limited,
            "tally": tally_dict
        }
