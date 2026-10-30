"""
Unit tests for evidence package export and ZIP archive generation.
Verifies bundle integrity, canonical leaf records, and checksums.
"""

import io
import zipfile
import hashlib
from src.services.evidence_service import EvidenceService
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    ManifestVersionModel,
    AcceptedBallotModel,
    WitnessAcknowledgementModel,
    EvidencePackageModel,
    PublishedResultModel
)
from src.crypto.canonical import canonical_json_str
from src.state_machine.lifecycle import StateMachineError


def setup_published_election_with_ballots(db, election_id="elec_evid_1"):
    """Helper creating election with manifest, ballots, witness ack, and published result."""
    elec = ElectionModel(
        id=election_id,
        title="Student Council Election",
        contest="President",
        selection_rule="plurality",
        opens_at_utc="2026_11_01T09:00:00Z",
        closes_at_utc="2026_11_01T17:00:00Z",
        issuance_cutoff_utc="2026_11_01T08:30:00Z"
    )
    db.add(elec)

    state = ElectionStateModel(
        election_id=election_id,
        state="PUBLISHED",
        manifest_digest="man_dig_99999",
        opens_at_utc="2026_11_01T09:00:00Z",
        closes_at_utc="2026_11_01T17:00:00Z",
        issuance_cutoff_utc="2026_11_01T08:30:00Z",
        final_tree_size=2
    )
    db.add(state)

    manifest_rec = ManifestVersionModel(
        election_id=election_id,
        version=1,
        manifest_digest="man_dig_99999",
        manifest_json='{"election_id":"elec_evid_1","candidates":[]}',
        frozen_by="officer_1"
    )
    db.add(manifest_rec)

    b0 = AcceptedBallotModel(
        election_id=election_id,
        leaf_index=0,
        credential_nullifier="nullifier_0",
        ballot_id="ballot_id_0",
        credential_proof_b64url="proof_b64_0",
        engine_ballot_b64url="engine_ballot_0",
        engine_proofs_b64url="engine_proofs_0"
    )
    b1 = AcceptedBallotModel(
        election_id=election_id,
        leaf_index=1,
        credential_nullifier="nullifier_1",
        ballot_id="ballot_id_1",
        credential_proof_b64url="proof_b64_1",
        engine_ballot_b64url="engine_ballot_1",
        engine_proofs_b64url="engine_proofs_1"
    )
    db.add_all([b0, b1])

    witness = WitnessAcknowledgementModel(
        election_id=election_id,
        checkpoint_sequence=1,
        tree_size=2,
        merkle_root="root_hash_final",
        witness_signature="sig_wit_final",
        witness_key_id="witness_key_1",
        is_final=True
    )
    db.add(witness)

    pkg = EvidencePackageModel(
        election_id=election_id,
        manifest_digest="man_dig_99999",
        final_checkpoint_digest="root_hash_final",
        anchor_tx_hash="0xabcdef123456",
        auditor_signature="sig_auditor_pkg"
    )
    db.add(pkg)

    res = PublishedResultModel(
        election_id=election_id,
        manifest_digest="man_dig_99999",
        tally_json='{"cand_1":2}',
        total_ballots=2,
        privacy_limited=False
    )
    db.add(res)
    db.commit()
    return elec


def test_evidence_zip_structure_and_checksums(test_db):
    """
    Verifies that the generated evidence ZIP bundle contains all required files
    and SHA256SUMS precisely verifies all bundled files.
    """
    elec = setup_published_election_with_ballots(test_db, "elec_zip_test")

    zip_bytes = EvidenceService.generate_evidence_zip_bytes(test_db, elec.id)
    assert len(zip_bytes) > 0

    zip_buf = io.BytesIO(zip_bytes)
    with zipfile.ZipFile(zip_buf, "r") as zf:
        file_list = zf.namelist()
        expected_files = {
            "manifest.json",
            "roster_commitment.json",
            "leaves.jsonl",
            "witness_signatures.json",
            "anchor_proof.json",
            "tally_proofs.json",
            "auditor_attestation.json",
            "SHA256SUMS"
        }
        assert expected_files.issubset(set(file_list))

        # Check leaves.jsonl has 2 records
        leaves_content = zf.read("leaves.jsonl").decode("utf-8")
        lines = [ln for ln in leaves_content.strip().split("\n") if ln]
        assert len(lines) == 2

        # Verify SHA256SUMS matches every file
        checksums_text = zf.read("SHA256SUMS").decode("utf-8")
        checksum_dict = {}
        for line in checksums_text.strip().split("\n"):
            parts = line.split("  ")
            if len(parts) == 2:
                checksum_dict[parts[1]] = parts[0]

        for fname in expected_files - {"SHA256SUMS"}:
            file_bytes = zf.read(fname)
            computed_hash = hashlib.sha256(file_bytes).hexdigest()
            assert checksum_dict[fname] == computed_hash


def test_evidence_metadata_does_not_create_pending_placeholder(test_db):
    """An election without a released package is not evidence-ready."""
    election_id = "elec_evidence_pending"
    test_db.add(ElectionModel(
        id=election_id,
        title="Unreleased election",
        contest="President",
        selection_rule="plurality",
        opens_at_utc="2026-11-01T09:00:00Z",
        closes_at_utc="2026-11-01T17:00:00Z",
        issuance_cutoff_utc="2026-11-01T08:30:00Z",
    ))
    test_db.add(ElectionStateModel(
        election_id=election_id,
        state="CLOSED_PENDING_WITNESS",
        manifest_digest="manifest_pending",
        opens_at_utc="2026-11-01T09:00:00Z",
        closes_at_utc="2026-11-01T17:00:00Z",
        issuance_cutoff_utc="2026-11-01T08:30:00Z",
    ))
    test_db.commit()

    try:
        EvidenceService.get_evidence_metadata(test_db, election_id)
    except StateMachineError as exc:
        assert exc.error_code == "EVIDENCE_NOT_RELEASED"
    else:
        raise AssertionError("unreleased evidence must not return placeholder digests")
