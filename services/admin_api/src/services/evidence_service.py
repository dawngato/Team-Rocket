"""
Evidence package export service generating verifiable ZIP bundles.
Packages manifest, log leaves, witness signatures, anchor proofs, and attestation.
"""

import io
import zipfile
import hashlib
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    ManifestVersionModel,
    ElectionRosterSnapshotModel,
    AcceptedBallotModel,
    WitnessAcknowledgementModel,
    EvidencePackageModel,
    PublishedResultModel
)
from src.crypto.canonical import canonical_json_bytes, canonical_json_str
from src.state_machine.lifecycle import StateMachineError


class EvidenceService:
    """Service generating cryptographic evidence bundles."""

    @classmethod
    def get_evidence_metadata(cls, db: Session, election_id: str) -> Dict[str, Any]:
        """
        Retrieves evidence package metadata record.
        """
        pkg = (
            db.query(EvidencePackageModel)
            .filter(EvidencePackageModel.election_id == election_id)
            .first()
        )
        if not pkg:
            state_record = (
                db.query(ElectionStateModel)
                .filter(ElectionStateModel.election_id == election_id)
                .first()
            )
            if not state_record:
                raise StateMachineError(f"Election {election_id} not found", "NOT_FOUND")
            raise StateMachineError(
                f"Election {election_id} has no released evidence package",
                "EVIDENCE_NOT_RELEASED",
            )

        return {
            "election_id": pkg.election_id,
            "manifest_digest": pkg.manifest_digest,
            "final_checkpoint_digest": pkg.final_checkpoint_digest,
            "anchor_tx_hash": pkg.anchor_tx_hash,
            "auditor_signature": pkg.auditor_signature,
            "evidence_url": f"/v1/elections/{election_id}/evidence?download=true"
        }

    @classmethod
    def generate_evidence_zip_bytes(cls, db: Session, election_id: str) -> bytes:
        """
        Generates deterministic ZIP archive containing complete election evidence bundle.
        """
        manifest_ver = (
            db.query(ManifestVersionModel)
            .filter(ManifestVersionModel.election_id == election_id)
            .first()
        )
        manifest_content = manifest_ver.manifest_json.encode("utf-8") if manifest_ver else b"{}"

        roster_snap = (
            db.query(ElectionRosterSnapshotModel)
            .filter(ElectionRosterSnapshotModel.election_id == election_id)
            .order_by(ElectionRosterSnapshotModel.id.desc())
            .first()
        )
        roster_data = {
            "election_id": election_id,
            "roster_version": roster_snap.roster_version if roster_snap else "none",
            "roster_commitment": roster_snap.roster_commitment if roster_snap else "none",
            "eligible_count": roster_snap.eligible_count if roster_snap else 0,
            "approved_by": roster_snap.approved_by if roster_snap else "none",
            "approver_signature": roster_snap.approver_signature if roster_snap else "none"
        }
        roster_content = canonical_json_bytes(roster_data)

        ballots = (
            db.query(AcceptedBallotModel)
            .filter(AcceptedBallotModel.election_id == election_id)
            .order_by(AcceptedBallotModel.leaf_index.asc())
            .all()
        )
        leaf_lines = []
        for b in ballots:
            leaf_rec = {
                "schema": "himvote.ballot_evidence.v1",
                "election_id": b.election_id,
                "manifest_digest": manifest_ver.manifest_digest if manifest_ver else "",
                "ballot_id": b.ballot_id,
                "leaf_index": b.leaf_index,
                "credential_nullifier": b.credential_nullifier,
                "credential_proof_b64url": b.credential_proof_b64url,
                "engine_ballot_b64url": b.engine_ballot_b64url,
                "engine_proofs_b64url": b.engine_proofs_b64url,
                "engine_record_version": "1.0"
            }
            leaf_lines.append(canonical_json_str(leaf_rec))
        leaves_content = ("\n".join(leaf_lines) + "\n" if leaf_lines else "").encode("utf-8")

        witness_acks = (
            db.query(WitnessAcknowledgementModel)
            .filter(WitnessAcknowledgementModel.election_id == election_id)
            .order_by(WitnessAcknowledgementModel.checkpoint_sequence.asc())
            .all()
        )
        witness_data = [
            {
                "checkpoint_sequence": w.checkpoint_sequence,
                "tree_size": w.tree_size,
                "merkle_root": w.merkle_root,
                "witness_signature": w.witness_signature,
                "witness_key_id": w.witness_key_id,
                "is_final": w.is_final,
                "acknowledged_at_utc": w.acknowledged_at_utc
            }
            for w in witness_acks
        ]
        witness_content = canonical_json_bytes(witness_data)

        pkg = (
            db.query(EvidencePackageModel)
            .filter(EvidencePackageModel.election_id == election_id)
            .first()
        )
        anchor_data = {
            "election_id": election_id,
            "anchor_tx_hash": pkg.anchor_tx_hash if pkg else "none",
            "created_at_utc": pkg.created_at_utc if pkg else "none"
        }
        anchor_content = canonical_json_bytes(anchor_data)

        res = (
            db.query(PublishedResultModel)
            .filter(PublishedResultModel.election_id == election_id)
            .first()
        )
        tally_content = res.tally_json.encode("utf-8") if res else b"{}"

        auditor_data = {
            "election_id": election_id,
            "manifest_digest": pkg.manifest_digest if pkg else "",
            "final_checkpoint_digest": pkg.final_checkpoint_digest if pkg else "",
            "anchor_tx_hash": pkg.anchor_tx_hash if pkg else "",
            "auditor_signature": pkg.auditor_signature if pkg else ""
        }
        auditor_content = canonical_json_bytes(auditor_data)

        files_to_pack = [
            ("manifest.json", manifest_content),
            ("roster_commitment.json", roster_content),
            ("leaves.jsonl", leaves_content),
            ("witness_signatures.json", witness_content),
            ("anchor_proof.json", anchor_content),
            ("tally_proofs.json", tally_content),
            ("auditor_attestation.json", auditor_content)
        ]

        checksum_lines = []
        for fname, fbytes in files_to_pack:
            fhash = hashlib.sha256(fbytes).hexdigest()
            checksum_lines.append(f"{fhash}  {fname}")
        sha256sums_content = ("\n".join(checksum_lines) + "\n").encode("utf-8")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for fname, fbytes in files_to_pack:
                zf.writestr(fname, fbytes)
            zf.writestr("SHA256SUMS", sha256sums_content)

        return zip_buffer.getvalue()
