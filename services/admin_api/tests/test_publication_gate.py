"""
Unit tests for the publication gate.
Verifies Section 4 and 6.2 publication requirements:
1. Pinned auditor cryptographic signature verification.
2. ANCHOR_FINALIZED and final witness consistency preconditions.
"""

import pytest
from src.services.publication_service import PublicationService
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    WitnessAcknowledgementModel,
    PublishedResultModel
)
from src.models.schemas import PublicationRequest
from src.crypto.signatures import sign_data_ed25519
from src.crypto.canonical import canonical_json_bytes
from src.config import settings
from src.state_machine.lifecycle import StatePreconditionError


def setup_witnessed_election(db, election_id="elec_pub_gate"):
    """Helper setting up election at ANCHOR_FINALIZED with witness acknowledgment."""
    elec = ElectionModel(
        id=election_id,
        title="Campus Election",
        contest="Trustee",
        selection_rule="plurality",
        opens_at_utc="2026_11_25T09:00:00Z",
        closes_at_utc="2026_11_25T17:00:00Z",
        issuance_cutoff_utc="2026_11_25T08:30:00Z",
        min_anonymous_turnout=10
    )
    db.add(elec)

    state = ElectionStateModel(
        election_id=election_id,
        state="ANCHOR_FINALIZED",
        manifest_digest="manifest_digest_sample_12345",
        opens_at_utc="2026_11_25T09:00:00Z",
        closes_at_utc="2026_11_25T17:00:00Z",
        issuance_cutoff_utc="2026_11_25T08:30:00Z",
        final_tree_size=42
    )
    db.add(state)

    witness = WitnessAcknowledgementModel(
        election_id=election_id,
        checkpoint_sequence=1,
        tree_size=42,
        merkle_root="final_root_hash_abcde",
        witness_signature="sig_witness_node_alpha",
        witness_key_id="witness_key_1",
        is_final=True
    )
    db.add(witness)
    db.commit()
    return elec


def test_publication_requires_final_witness(test_db, auditor_keypair):
    """Publication must fail if no final witness checkpoint exists."""
    elec = setup_witnessed_election(test_db, "elec_no_witness")
    witness = test_db.query(WitnessAcknowledgementModel).filter_by(election_id=elec.id).first()
    test_db.delete(witness)
    test_db.commit()

    attestation = {
        "election_id": elec.id,
        "manifest_digest": "manifest_digest_sample_12345",
        "final_checkpoint_digest": "final_root_hash_abcde",
        "anchor_tx_hash": "0x1234567890abcdef",
        "tally": {"cand_1": 25, "cand_2": 17},
        "total_ballots": 42
    }
    sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))

    req = PublicationRequest(
        auditor_public_key=auditor_keypair["public_key_hex"],
        auditor_signature=sig,
        attestation_data=attestation
    )

    with pytest.raises(StatePreconditionError):
        PublicationService.process_publication_request(
            db=test_db,
            election_id=elec.id,
            actor_id="auditor_lead",
            req=req
        )


def test_publication_requires_valid_prerequisite_state(test_db, auditor_keypair):
    """Publication must fail if election is in OPEN or CLOSING state."""
    elec = setup_witnessed_election(test_db, "elec_bad_state")
    state = test_db.query(ElectionStateModel).filter_by(election_id=elec.id).first()
    state.state = "OPEN"
    test_db.commit()

    attestation = {
        "election_id": elec.id,
        "manifest_digest": "manifest_digest_sample_12345",
        "final_checkpoint_digest": "final_root_hash_abcde",
        "anchor_tx_hash": "0x1234567890abcdef",
        "tally": {"cand_1": 25, "cand_2": 17},
        "total_ballots": 42
    }
    sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))

    req = PublicationRequest(
        auditor_public_key=auditor_keypair["public_key_hex"],
        auditor_signature=sig,
        attestation_data=attestation
    )

    with pytest.raises(StatePreconditionError):
        PublicationService.process_publication_request(
            db=test_db,
            election_id=elec.id,
            actor_id="auditor_lead",
            req=req
        )


def test_publication_rejects_unanchored_final_witness(test_db, auditor_keypair):
    """A witnessed root alone cannot move directly to public publication."""
    elec = setup_witnessed_election(test_db, "elec_unanchored_final")
    state = test_db.query(ElectionStateModel).filter_by(election_id=elec.id).first()
    state.state = "FINAL_WITNESSED"
    test_db.commit()

    attestation = {
        "election_id": elec.id,
        "manifest_digest": "manifest_digest_sample_12345",
        "final_checkpoint_digest": "final_root_hash_abcde",
        "anchor_tx_hash": "0x1234567890abcdef",
        "tally": {"cand_1": 25, "cand_2": 17},
        "total_ballots": 42,
    }
    sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))
    req = PublicationRequest(
        auditor_public_key=auditor_keypair["public_key_hex"],
        auditor_signature=sig,
        attestation_data=attestation,
    )

    with pytest.raises(StatePreconditionError, match="externally finalized anchor"):
        PublicationService.process_publication_request(
            db=test_db,
            election_id=elec.id,
            actor_id="auditor_lead",
            req=req,
        )


def test_publication_rejects_mismatched_witness_count(test_db, auditor_keypair):
    """A signed tally cannot claim a ballot count different from the final tree."""
    elec = setup_witnessed_election(test_db, "elec_count_mismatch")
    attestation = {
        "election_id": elec.id,
        "manifest_digest": "manifest_digest_sample_12345",
        "final_checkpoint_digest": "final_root_hash_abcde",
        "anchor_tx_hash": "0x1234567890abcdef",
        "tally": {"cand_1": 25, "cand_2": 17},
        "total_ballots": 41,
    }
    sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))
    req = PublicationRequest(
        auditor_public_key=auditor_keypair["public_key_hex"],
        auditor_signature=sig,
        attestation_data=attestation,
    )

    with pytest.raises(StatePreconditionError, match="ballot count"):
        PublicationService.process_publication_request(
            db=test_db,
            election_id=elec.id,
            actor_id="auditor_lead",
            req=req,
        )


def test_publication_verifies_cryptographic_signature_and_pinned_key(test_db, auditor_keypair):
    """
    Asserts successful publication when auditor signature verifies against pinned key,
    and state transitions to PUBLISHED.
    """
    elec = setup_witnessed_election(test_db, "elec_pub_success")
    settings.auditor_public_key_fingerprint = auditor_keypair["fingerprint"]

    attestation = {
        "election_id": elec.id,
        "manifest_digest": "manifest_digest_sample_12345",
        "final_checkpoint_digest": "final_root_hash_abcde",
        "anchor_tx_hash": "0x9876543210fedcba",
        "tally": {"cand_1": 30, "cand_2": 12},
        "total_ballots": 42
    }
    sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))

    req = PublicationRequest(
        auditor_public_key=auditor_keypair["public_key_hex"],
        auditor_signature=sig,
        attestation_data=attestation
    )

    res = PublicationService.process_publication_request(
        db=test_db,
        election_id=elec.id,
        actor_id="auditor_lead",
        req=req
    )

    assert res["state"] == "PUBLISHED"
    assert res["total_ballots"] == 42

    # Check published results record exists
    pub_res = test_db.query(PublishedResultModel).filter_by(election_id=elec.id).first()
    assert pub_res is not None
    assert pub_res.total_ballots == 42


def test_publication_rejects_tampered_attestation(test_db, auditor_keypair):
    """Asserts that tampering with attestation payload invalidates signature."""
    elec = setup_witnessed_election(test_db, "elec_pub_tamper")
    settings.auditor_public_key_fingerprint = auditor_keypair["fingerprint"]

    attestation = {
        "election_id": elec.id,
        "manifest_digest": "manifest_digest_sample_12345",
        "final_checkpoint_digest": "final_root_hash_abcde",
        "anchor_tx_hash": "0x9876543210fedcba",
        "tally": {"cand_1": 30, "cand_2": 12},
        "total_ballots": 42
    }
    sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))

    # Tamper with attestation data after signing
    attestation["tally"] = {"cand_1": 31, "cand_2": 11}

    req = PublicationRequest(
        auditor_public_key=auditor_keypair["public_key_hex"],
        auditor_signature=sig,
        attestation_data=attestation
    )

    with pytest.raises(StatePreconditionError):
        PublicationService.process_publication_request(
            db=test_db,
            election_id=elec.id,
            actor_id="auditor_lead",
            req=req
        )
