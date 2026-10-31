"""
End to end API integration tests for HimVote Admin API endpoints.
Tests full lifecycle via HTTP endpoints from draft creation to evidence export.
"""

import io
import zipfile
from src.crypto.signatures import sign_data_ed25519
from src.crypto.canonical import canonical_json_bytes
from src.models.database import ElectionModel, ElectionStateModel, WitnessAcknowledgementModel
from src.config import settings


def test_full_election_lifecycle_via_api(client, test_db, auditor_keypair, roster_approver_keypair):
    """
    Executes an end to end test exercising all admin endpoints:
    1. Create draft election
    2. Add candidates
    3. Submit roster (importer)
    4. Approve roster (independent approver with distinct ID)
    5. Freeze manifest
    6. Verify immutability (adding candidate fails)
    7. Open election
    8. Close election
    9. Final witness acknowledgment and publication request
    10. Query published results
    11. Download evidence ZIP bundle
    12. Query audit events log
    """
    settings.auditor_public_key_fingerprint = auditor_keypair["fingerprint"]

    # 1. Create Draft Election
    create_payload = {
        "title": "Computer Science Department Election",
        "contest": "Department Chair",
        "selection_rule": "plurality",
        "opens_at_utc": "2026_11_15T09:00:00Z",
        "closes_at_utc": "2026_11_15T17:00:00Z",
        "issuance_cutoff_utc": "2026_11_15T08:30:00Z",
        "min_anonymous_turnout": 10
    }
    res = client.post("/v1/elections", json=create_payload, headers={"X_Actor_ID": "officer_dave"})
    assert res.status_code == 201
    election_data = res.json()
    election_id = election_data["id"]
    assert election_data["state"] == "DRAFT"

    # 2. Add Candidates
    cand_payload = [
        {"id": "cand_prof_x", "name": "Prof X", "contest": "Department Chair"},
        {"id": "cand_prof_y", "name": "Prof Y", "contest": "Department Chair"}
    ]
    res = client.post(f"/v1/elections/{election_id}/candidates", json=cand_payload)
    assert res.status_code == 200

    # 3. Submit Roster (importer)
    roster_payload = {
        "roster_version": "v1",
        "records": [
            {"student_id": "ST101", "email": "st101@univ.edu", "full_name": "Student A", "department": "CS"},
            {"student_id": "ST102", "email": "st102@univ.edu", "full_name": "Student B", "department": "CS"}
        ]
    }
    res = client.post(
        f"/v1/elections/{election_id}/roster",
        json=roster_payload,
        headers={"X_Actor_ID": "importer_carol"}
    )
    assert res.status_code == 202
    sub_data = res.json()
    commitment = sub_data["roster_commitment"]

    # 3b. Importer attempts to approve own roster (must fail 403)
    res = client.post(
        f"/v1/elections/{election_id}/roster/approve",
        json={"roster_version": "v1"},
        headers={"X_Actor_ID": "importer_carol"}
    )
    assert res.status_code == 403

    # 4. Independent Roster Approver signs roster
    message = f"{election_id}:{commitment}:2".encode("utf-8")
    approver_sig = sign_data_ed25519(roster_approver_keypair["private_key_hex"], message)
    res = client.post(
        f"/v1/elections/{election_id}/roster/approve",
        json={
            "roster_version": "v1",
            "approver_public_key": roster_approver_keypair["public_key_hex"],
            "approver_signature": approver_sig
        },
        headers={"X_Actor_ID": "approver_frank"}  # Distinct actor
    )
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"

    # 5. Freeze manifest
    freeze_payload = {
        "issuer_key_id": "kms_issuer_1",
        "engine_name": "himvote_engine_v1",
        "engine_version": "1.0.0",
        "trustees": ["trustee_1", "trustee_2"],
        "log_key_id": "log_key_1",
        "witness_keys": ["witness_primary"],
        "auditor_key_fingerprint": auditor_keypair["fingerprint"],
        "verifier_version": "1.0.0"
    }
    res = client.post(f"/v1/elections/{election_id}/freeze", json=freeze_payload)
    assert res.status_code == 200
    freeze_data = res.json()
    manifest_digest = freeze_data["manifest_digest"]
    assert len(manifest_digest) == 64

    # 6. Verify Immutability: Adding another candidate must fail with 409
    res = client.post(
        f"/v1/elections/{election_id}/candidates",
        json=[{"id": "cand_prof_z", "name": "Prof Z", "contest": "Department Chair"}]
    )
    assert res.status_code == 409

    # 7. Open Election
    res = client.post(f"/v1/elections/{election_id}/open")
    assert res.status_code == 200
    assert res.json()["state"] == "OPEN"

    # 8. Close Election
    res = client.post(f"/v1/elections/{election_id}/close")
    assert res.status_code == 200
    assert res.json()["state"] == "CLOSING"

    # 9. Register final witness ack in casting db
    final_witness = WitnessAcknowledgementModel(
        election_id=election_id,
        checkpoint_sequence=1,
        tree_size=0,
        merkle_root="merkle_root_final_001",
        witness_signature="witness_sig_b64",
        witness_key_id="witness_primary",
        is_final=True
    )
    test_db.add(final_witness)
    test_db.commit()

    # Move election through CLOSED_PENDING_WITNESS to FINAL_WITNESSED
    from src.state_machine.lifecycle import ElectionLifecycleManager
    ElectionLifecycleManager.transition(test_db, election_id, "CLOSED_PENDING_WITNESS", "worker")
    ElectionLifecycleManager.transition(test_db, election_id, "FINAL_WITNESSED", "worker")
    # The publication gate must observe an externally finalized anchor state;
    # a witness checkpoint alone is not sufficient.
    ElectionLifecycleManager.transition(test_db, election_id, "ANCHOR_FINALIZED", "anchor_worker")

    # Results endpoint before publication must return 404
    res = client.get(f"/v1/elections/{election_id}/results")
    assert res.status_code == 404

    # 10. Publication Request signed by Auditor
    attestation = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "final_checkpoint_digest": "merkle_root_final_001",
        "anchor_tx_hash": "0xfeeeddccbbaa99887766",
        "tally": {"cand_prof_x": 0, "cand_prof_y": 0},
        "total_ballots": 0
    }
    auditor_sig = sign_data_ed25519(auditor_keypair["private_key_hex"], canonical_json_bytes(attestation))

    pub_payload = {
        "auditor_public_key": auditor_keypair["public_key_hex"],
        "auditor_signature": auditor_sig,
        "attestation_data": attestation
    }
    res = client.post(f"/v1/elections/{election_id}/publication-request", json=pub_payload)
    assert res.status_code == 202
    assert res.json()["state"] == "PUBLISHED"

    # 11. Query Results (now accessible)
    res = client.get(f"/v1/elections/{election_id}/results")
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["election_id"] == election_id
    assert res_data["manifest_digest"] == manifest_digest

    # 12. Download Evidence ZIP
    res = client.get(f"/v1/elections/{election_id}/evidence?download=true")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    zip_bytes = res.content
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        assert "manifest.json" in names
        assert "SHA256SUMS" in names

    # 13. Query Audit Events
    res = client.get("/v1/admin/audit-events")
    assert res.status_code == 200
    events_data = res.json()
    assert events_data["total"] >= 5


def test_admin_rejects_caller_actor_headers_when_dev_mode_is_disabled(client):
    """Production must not trust an actor identity supplied by the caller."""
    original = settings.allow_dev_actor_headers
    settings.allow_dev_actor_headers = False
    try:
        response = client.post(
            "/v1/elections",
            json={
                "title": "Should be blocked",
                "contest": "President",
                "selection_rule": "plurality",
                "opens_at_utc": "2026-12-01T09:00:00Z",
                "closes_at_utc": "2026-12-01T17:00:00Z",
                "issuance_cutoff_utc": "2026-12-01T08:00:00Z",
            },
            headers={"X-Actor-ID": "forged_actor"},
        )
    finally:
        settings.allow_dev_actor_headers = original

    assert response.status_code == 401


def test_evidence_download_is_blocked_before_release(client, test_db):
    """The download route must not manufacture a pre-publication archive."""
    election_id = "elec_unreleased_download"
    test_db.add(ElectionModel(
        id=election_id,
        title="Unreleased election",
        contest="President",
        selection_rule="plurality",
        opens_at_utc="2026-12-01T09:00:00Z",
        closes_at_utc="2026-12-01T17:00:00Z",
        issuance_cutoff_utc="2026-12-01T08:00:00Z",
    ))
    test_db.add(ElectionStateModel(
        election_id=election_id,
        state="CLOSED_PENDING_WITNESS",
        manifest_digest="manifest_unreleased",
        opens_at_utc="2026-12-01T09:00:00Z",
        closes_at_utc="2026-12-01T17:00:00Z",
        issuance_cutoff_utc="2026-12-01T08:00:00Z",
    ))
    test_db.commit()

    response = client.get(f"/v1/elections/{election_id}/evidence?download=true")

    assert response.status_code == 404
    assert response.json()["error_code"] == "EVIDENCE_NOT_RELEASED"


def test_unauthorized_actor_rejected_for_mutations_and_audit(client, test_db):
    """Actors without the required role must be rejected with 403 Forbidden."""
    # Student cannot create election
    res = client.post(
        "/v1/elections",
        json={
            "title": "Unauthorized attempt",
            "contest": "Test",
            "selection_rule": "plurality",
            "opens_at_utc": "2026-11-20T09:00:00Z",
            "closes_at_utc": "2026-11-20T17:00:00Z",
            "issuance_cutoff_utc": "2026-11-20T08:30:00Z",
        },
        headers={"X-Actor-ID": "student_sam", "X-Actor-Roles": "student"}
    )
    assert res.status_code == 403

    # Teacher cannot view administrative audit events
    res = client.get(
        "/v1/admin/audit-events",
        headers={"X-Actor-ID": "teacher_tina", "X-Actor-Roles": "teacher"}
    )
    assert res.status_code == 403

    # Administrator can view audit events
    res = client.get(
        "/v1/admin/audit-events",
        headers={"X-Actor-ID": "admin_alice", "X-Actor-Roles": "administrator"}
    )
    assert res.status_code == 200


def test_internal_election_visibility_enforcement(client, test_db):
    """Internal elections (DRAFT, etc.) must not be visible publicly."""
    election_id = "elec_draft_visibility_test"
    test_db.add(ElectionModel(
        id=election_id,
        title="Secret Draft Election",
        contest="Secret Contest",
        selection_rule="plurality",
        opens_at_utc="2026-12-01T09:00:00Z",
        closes_at_utc="2026-12-01T17:00:00Z",
        issuance_cutoff_utc="2026-12-01T08:00:00Z",
    ))
    test_db.add(ElectionStateModel(
        election_id=election_id,
        state="DRAFT",
        manifest_digest="",
        opens_at_utc="2026-12-01T09:00:00Z",
        closes_at_utc="2026-12-01T17:00:00Z",
        issuance_cutoff_utc="2026-12-01T08:00:00Z",
    ))
    test_db.commit()

    # Public list does not return draft elections
    res = client.get("/v1/elections")
    assert res.status_code == 200
    ids = [e["id"] for e in res.json()["elections"]]
    assert election_id not in ids

    # Public query for state=DRAFT is strictly rejected with 403
    res = client.get("/v1/elections?state=DRAFT")
    assert res.status_code == 403

    # Direct query without include_internal returns 404
    res = client.get(f"/v1/elections/{election_id}")
    assert res.status_code == 404

    # Query with include_internal by unauthorized user returns 403
    res = client.get(
        f"/v1/elections/{election_id}?include_internal=true",
        headers={"X-Actor-ID": "student_sam", "X-Actor-Roles": "student"}
    )
    assert res.status_code == 403

    # Query with include_internal by authorized officer returns 200
    res = client.get(
        f"/v1/elections/{election_id}?include_internal=true",
        headers={"X-Actor-ID": "officer_dave", "X-Actor-Roles": "election_officer"}
    )
    assert res.status_code == 200
    assert res.json()["id"] == election_id
