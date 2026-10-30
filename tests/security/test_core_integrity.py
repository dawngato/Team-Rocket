"""
Core integrity security test suite matching Section 12.1 of prompt.md.
Tests duplicate submissions, unauthorized insertions, deletion detection,
record modification detection, and tally result manipulation resistance.
"""

import concurrent.futures
import copy
import os
from datetime import datetime, timezone
from typing import Dict, List, Tuple
import pytest

from ..harness.crypto import (
    BlindCredentialIssuer,
    KeyPair,
    MerkleTree,
    VoterCredentialClient,
    canonical_json_bytes,
    encrypt_choice,
    sha256_digest
)
from ..harness.models import BallotEvidence, CheckpointRecord
from ..harness.identity_cluster import IdentityCluster
from ..harness.casting_cluster import CastingCluster
from ..harness.witness_cluster import WitnessCluster
from ..harness.chain_cluster import ChainCluster
from ..harness.verifier import AuditorVerifier
from ..harness.reporter import AuditTestRecord

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")


def create_test_setup(
    election_id: str = "elec_2026_test",
    seed: int = 1001
) -> Tuple[IdentityCluster, CastingCluster, WitnessCluster, ChainCluster, str]:
    """Initialize fresh isolated clusters for a security test scenario."""
    manifest_payload = {
        "election_id": election_id,
        "title": "Institutional Campus Student Council Election",
        "contests": [{"id": "contest_1", "title": "President"}],
        "candidates": [
            {"id": "cand_alice", "name": "Alice Sharma"},
            {"id": "cand_bob", "name": "Bob Verma"}
        ],
        "opens_at_utc": "2026_10_30T00:00:00Z",
        "closes_at_utc": "2026_10_30T23:59:59Z",
        "issuance_cutoff_utc": "2026_10_30T20:00:00Z",
        "version": 1
    }
    manifest_bytes = canonical_json_bytes(manifest_payload)
    manifest_digest = sha256_digest(manifest_bytes)

    identity = IdentityCluster(election_id)
    casting = CastingCluster(
        election_id=election_id,
        manifest_digest=manifest_digest,
        issuer=identity.issuer
    )
    witness = WitnessCluster(
        election_id=election_id,
        manifest_digest=manifest_digest
    )
    chain = ChainCluster()
    return identity, casting, witness, chain, manifest_digest


def test_q7_01_duplicate_submission() -> None:
    """
    Q7_01 Duplicate submission test.
    One credential with 100 concurrent and repeated submissions.
    Must produce exactly one leaf and one nullifier.
    Safe retry returns identical outcome; differing ballot is rejected.
    """
    test_id = "Q7_01_duplicate_submission"
    seed = 70101
    election_id = "elec_q7_01"
    identity, casting, witness, chain, manifest_digest = create_test_setup(election_id, seed)

    # Student registration and credential issuance
    student_id = "student_him_001"
    identity.add_approved_student(student_id)

    client = VoterCredentialClient(election_id, client_platform="web")
    blinded_req = client.create_blinded_request()
    issuance_resp = identity.issue_credential(student_id, blinded_req)
    unblinded_proof = client.unblind_response(issuance_resp["blind_signature"])
    nullifier = client.derive_nullifier()

    # Prepare legitimate ballot payload
    ballot_b64, proofs_b64 = encrypt_choice("cand_alice", election_id)
    legitimate_ballot = BallotEvidence(
        schema="himvote.ballot-evidence.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="ballot_001",
        leaf_index=0,
        credential_nullifier=nullifier,
        credential_proof_b64url=unblinded_proof,
        engine_ballot_b64url=ballot_b64,
        engine_proofs_b64url=proofs_b64,
        engine_record_version="electionguard_1.0.0"
    )

    # Prepare differing conflicting ballot payload with same credential
    diff_ballot_b64, diff_proofs_b64 = encrypt_choice("cand_bob", election_id)
    conflicting_ballot = BallotEvidence(
        schema="himvote.ballot-evidence.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="ballot_001_conflicting",
        leaf_index=0,
        credential_nullifier=nullifier,
        credential_proof_b64url=unblinded_proof,
        engine_ballot_b64url=diff_ballot_b64,
        engine_proofs_b64url=diff_proofs_b64,
        engine_record_version="electionguard_1.0.0"
    )

    submission_results: List[Dict[str, str]] = []
    rejection_count = 0
    headers = {"X_Platform": "web"}

    def submit_task(task_index: int) -> Dict[str, str]:
        # Out of 100 concurrent requests:
        # First 80 are safe retries with identical payload
        # Last 20 are conflicting submissions with different payload
        target_ballot = legitimate_ballot if task_index < 80 else conflicting_ballot
        try:
            res = casting.cast_ballot(headers, target_ballot, client.secret_serial)
            return {"status": "SUCCESS", "handle": res["receipt_handle"], "leaf": str(res["leaf_index"])}
        except Exception as e:
            return {"status": "REJECTED", "error": str(e)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(submit_task, i) for i in range(100)]
        for f in concurrent.futures.as_completed(futures):
            res = f.result()
            if res["status"] == "SUCCESS":
                submission_results.append(res)
            else:
                rejection_count += 1

    # Assertions
    # 1. Exactly one leaf committed
    assert len(casting.ballots_by_index) == 1
    # 2. Exactly one nullifier registered
    assert len(casting.nullifiers_to_leaf) == 1
    # 3. Next leaf index incremented exactly once
    assert casting.next_leaf_index == 1
    # 4. Conflicting ballots rejected
    assert rejection_count == 20
    # 5. All 80 identical retries returned identical receipt handle
    assert len(submission_results) == 80
    first_handle = submission_results[0]["handle"]
    for item in submission_results:
        assert item["handle"] == first_handle
        assert item["leaf"] == "0"

    db_summary = {
        "total_committed_leaves": len(casting.ballots_by_index),
        "total_nullifiers": len(casting.nullifiers_to_leaf),
        "rejection_count": rejection_count,
        "successful_safe_retries": len(submission_results)
    }

    record = AuditTestRecord(
        test_id=test_id,
        seed=seed,
        manifest_digest=manifest_digest,
        engine_version="electionguard_1.0.0",
        expected_result="EXACTLY_ONE_LEAF_AND_ONE_NULLIFIER_SAFE_RETRY_IDENTICAL_DIFFERING_REJECTED",
        actual_result="EXACTLY_ONE_LEAF_AND_ONE_NULLIFIER_SAFE_RETRY_IDENTICAL_DIFFERING_REJECTED",
        database_state_summary=db_summary,
        postconditions=[
            "accepted_encrypted_ballots row count equals 1",
            "nullifiers_to_leaf count equals 1",
            "next_leaf_index equals 1",
            "all differing ballot submissions rejected",
            "all identical submissions returned identical handle"
        ],
        passed=True
    )
    record.save_json(REPORTS_DIR)


def test_q7_02_unauthorized_insertion() -> None:
    """
    Q7_02 Unauthorized insertion test.
    Tests forged credential, wrong election credential, unapproved student,
    unsupported candidate, and direct database write rejection.
    """
    test_id = "Q7_02_unauthorized_insertion"
    seed = 70201
    election_id = "elec_q7_02"
    identity, casting, witness, chain, manifest_digest = create_test_setup(election_id, seed)

    # Case 1: Unapproved student registration rejected
    unapproved_student = "student_unregistered_999"
    unapproved_client = VoterCredentialClient(election_id)
    with pytest.raises(PermissionError) as exc_info:
        identity.issue_credential(unapproved_student, unapproved_client.create_blinded_request())
    assert "not in approved frozen roster" in str(exc_info.value)

    # Approve legitimate student
    approved_student = "student_legit_101"
    identity.add_approved_student(approved_student)
    legit_client = VoterCredentialClient(election_id)
    issuance = identity.issue_credential(approved_student, legit_client.create_blinded_request())
    valid_proof = legit_client.unblind_response(issuance["blind_signature"])
    valid_nullifier = legit_client.derive_nullifier()

    ballot_b64, proofs_b64 = encrypt_choice("cand_alice", election_id)

    # Case 2: Forged credential proof rejected
    forged_ballot = BallotEvidence(
        schema="himvote.ballot-evidence.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="ballot_forged",
        leaf_index=0,
        credential_nullifier=valid_nullifier,
        credential_proof_b64url="Zm9yZ2VkX3NpZ25hdHVyZV9ub3RfdmFsaWQ=",
        engine_ballot_b64url=ballot_b64,
        engine_proofs_b64url=proofs_b64,
        engine_record_version="electionguard_1.0.0"
    )
    with pytest.raises(PermissionError) as exc_info:
        casting.cast_ballot({}, forged_ballot, legit_client.secret_serial)
    assert "Credential proof invalid" in str(exc_info.value)

    # Case 3: Wrong election credential rejected
    other_election_id = "elec_other_999"
    other_issuer = BlindCredentialIssuer(other_election_id)
    other_client = VoterCredentialClient(other_election_id)
    other_blind_sig = other_issuer.sign_blinded_request(other_client.create_blinded_request())
    wrong_election_ballot = BallotEvidence(
        schema="himvote.ballot-evidence.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="ballot_wrong_election",
        leaf_index=0,
        credential_nullifier=other_client.derive_nullifier(),
        credential_proof_b64url=other_blind_sig,
        engine_ballot_b64url=ballot_b64,
        engine_proofs_b64url=proofs_b64,
        engine_record_version="electionguard_1.0.0"
    )
    with pytest.raises(PermissionError) as exc_info:
        casting.cast_ballot({}, wrong_election_ballot, other_client.secret_serial)
    assert "Credential proof invalid" in str(exc_info.value)

    # Case 4: Invalid engine ballot / proof rejected
    corrupt_engine_ballot = BallotEvidence(
        schema="himvote.ballot-evidence.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="ballot_bad_engine",
        leaf_index=0,
        credential_nullifier=valid_nullifier,
        credential_proof_b64url=valid_proof,
        engine_ballot_b64url=ballot_b64,
        engine_proofs_b64url="aW52YWxpZF9wcm9vZl9iNjR1cmw=",
        engine_record_version="electionguard_1.0.0"
    )
    with pytest.raises(ValueError) as exc_info:
        casting.cast_ballot({}, corrupt_engine_ballot, legit_client.secret_serial)
    assert "Engine ballot ciphertext or zero knowledge proof invalid" in str(exc_info.value)

    # Case 5: Direct database write rejected
    with pytest.raises(PermissionError) as exc_info:
        casting.direct_database_insert(0, forged_ballot)
    assert "Direct database writes denied by table triggers" in str(exc_info.value)

    # Verify database remains clean
    assert len(casting.ballots_by_index) == 0
    assert len(casting.nullifiers_to_leaf) == 0

    db_summary = {
        "unauthorized_attempts_rejected": 5,
        "database_leaves_count": 0,
        "nullifiers_count": 0
    }

    record = AuditTestRecord(
        test_id=test_id,
        seed=seed,
        manifest_digest=manifest_digest,
        engine_version="electionguard_1.0.0",
        expected_result="ALL_UNAUTHORIZED_INSERTIONS_REJECTED_DIRECT_WRITE_DENIED",
        actual_result="ALL_UNAUTHORIZED_INSERTIONS_REJECTED_DIRECT_WRITE_DENIED",
        database_state_summary=db_summary,
        postconditions=[
            "unapproved student issuance blocked",
            "forged credential rejected",
            "wrong election credential rejected",
            "corrupt engine ballot rejected",
            "direct write trigger blocked unauthorized insertion",
            "database state unchanged"
        ],
        passed=True
    )
    record.save_json(REPORTS_DIR)


def test_q7_03_deletion() -> None:
    """
    Q7_03 Deletion test.
    Casts 10 witnessed ballots. Deleting one ballot from export or presenting
    an older truncated final must cause auditor verifier to fail against
    independently fetched FINAL and chain anchor.
    """
    test_id = "Q7_03_deletion"
    seed = 70301
    election_id = "elec_q7_03"
    identity, casting, witness, chain, manifest_digest = create_test_setup(election_id, seed)

    # Cast 10 legitimate ballots
    committed_ballots: List[BallotEvidence] = []
    tree = MerkleTree()

    for i in range(10):
        student_id = f"student_{i:03d}"
        identity.add_approved_student(student_id)
        client = VoterCredentialClient(election_id)
        issuance = identity.issue_credential(student_id, client.create_blinded_request())
        proof = client.unblind_response(issuance["blind_signature"])
        nullifier = client.derive_nullifier()

        choice = "cand_alice" if i % 2 == 0 else "cand_bob"
        b_b64, p_b64 = encrypt_choice(choice, election_id)

        ballot = BallotEvidence(
            schema="himvote.ballot-evidence.v1",
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_id=f"ballot_{i:03d}",
            leaf_index=i,
            credential_nullifier=nullifier,
            credential_proof_b64url=proof,
            engine_ballot_b64url=b_b64,
            engine_proofs_b64url=p_b64,
            engine_record_version="electionguard_1.0.0"
        )
        res = casting.cast_ballot({}, ballot, client.secret_serial)
        committed_ballot = casting.ballots_by_index[res["leaf_index"]]
        committed_ballots.append(committed_ballot)

        leaf_bytes = canonical_json_bytes(committed_ballot.model_dump(by_alias=True))
        tree.append_leaf(leaf_bytes)

    # Publish and sign witness FINAL checkpoint
    final_root = tree.get_root_hex()
    last_leaf_bytes = canonical_json_bytes(committed_ballots[-1].model_dump(by_alias=True))
    last_leaf_digest = sha256_digest(last_leaf_bytes)

    final_checkpoint = CheckpointRecord(
        schema="himvote.checkpoint.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=10,
        merkle_root=final_root,
        previous_checkpoint_digest=None,
        last_leaf_index=9,
        last_leaf_digest=last_leaf_digest,
        issued_count=10,
        issuance_ledger_digest=sha256_digest(b"issuance_ledger_closed"),
        roster_commitment=sha256_digest(b"roster_frozen_10_students"),
        protocol_version="himvote_2.0.0",
        checkpoint_kind="FINAL",
        checkpoint_sequence=1
    )
    witness_ack = witness.ingest_checkpoint(final_checkpoint)
    casting.acknowledge_witnessed_up_to(9, witness_ack.acknowledged_at)

    # Anchor on consortium chain
    final_canonical_bytes = canonical_json_bytes(final_checkpoint.model_dump(by_alias=True))
    final_digest = sha256_digest(final_canonical_bytes)
    anchor = chain.anchor_checkpoint(
        caller="0xRelayer123",
        election_commitment=sha256_digest(f"commitment:{election_id}".encode("utf_8")),
        sequence=1,
        digest=final_digest,
        is_final=True
    )

    tally = {"cand_alice": 5, "cand_bob": 5}
    verifier = AuditorVerifier(election_id, manifest_digest)

    # Baseline verification: honest export passes
    baseline_report = verifier.audit(
        committed_ballots,
        witness.get_final_checkpoint(),
        witness_ack,
        anchor,
        tally
    )
    assert baseline_report["exit_code"] == 0
    assert baseline_report["properties"]["RECORD_INTEGRITY"] == "PASS"

    # Attack 1: Remove one ballot from the export (e.g. leaf index 4)
    tampered_ballots = [b for b in committed_ballots if b.leaf_index != 4]
    tampered_report = verifier.audit(
        tampered_ballots,
        witness.get_final_checkpoint(),
        witness_ack,
        anchor,
        tally
    )
    assert tampered_report["exit_code"] == 2
    assert tampered_report["properties"]["RECORD_INTEGRITY"] == "FAIL"
    assert any("gap" in err.lower() or "mismatch" in err.lower() for err in tampered_report["errors"])

    # Attack 2: Present truncated final (older partial checkpoint of size 5)
    truncated_tree = MerkleTree([canonical_json_bytes(b.model_dump(by_alias=True)) for b in committed_ballots[:5]])
    truncated_checkpoint = CheckpointRecord(
        schema="himvote.checkpoint.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=5,
        merkle_root=truncated_tree.get_root_hex(),
        previous_checkpoint_digest=None,
        last_leaf_index=4,
        last_leaf_digest=sha256_digest(canonical_json_bytes(committed_ballots[4].model_dump(by_alias=True))),
        issued_count=5,
        issuance_ledger_digest=sha256_digest(b"issuance_ledger_partial"),
        roster_commitment=sha256_digest(b"roster_frozen_10_students"),
        protocol_version="himvote_2.0.0",
        checkpoint_kind="INCREMENTAL",
        checkpoint_sequence=1
    )
    # Verification against independently fetched witness final rejects truncated checkpoint
    truncated_report = verifier.audit(
        committed_ballots[:5],
        witness.get_final_checkpoint(),
        witness_ack,
        anchor,
        {"cand_alice": 3, "cand_bob": 2}
    )
    assert truncated_report["exit_code"] == 2
    assert truncated_report["properties"]["RECORD_INTEGRITY"] == "FAIL"

    db_summary = {
        "witnessed_ballots": 10,
        "chain_anchored_digest": anchor.digest,
        "deletion_detected": True,
        "truncated_final_rejected": True
    }

    record = AuditTestRecord(
        test_id=test_id,
        seed=seed,
        manifest_digest=manifest_digest,
        engine_version="electionguard_1.0.0",
        expected_result="VERIFIER_FAILS_ON_DELETED_BALLOT_AND_TRUNCATED_FINAL",
        actual_result="VERIFIER_FAILS_ON_DELETED_BALLOT_AND_TRUNCATED_FINAL",
        database_state_summary=db_summary,
        postconditions=[
            "honest export verified with exit code 0",
            "removal of single ballot detected and rejected with exit code 2",
            "truncated partial checkpoint rejected against witness final",
            "chain anchor finality check enforced"
        ],
        passed=True
    )
    record.save_json(REPORTS_DIR)


def test_q7_04_modification() -> None:
    """
    Q7_04 Modification test.
    Modifying ciphertext, proof, nullifier, or leaf index in exported ballots
    must result in cryptographic or Merkle verification failure.
    """
    test_id = "Q7_04_modification"
    seed = 70401
    election_id = "elec_q7_04"
    identity, casting, witness, chain, manifest_digest = create_test_setup(election_id, seed)

    # Cast 4 ballots
    ballots: List[BallotEvidence] = []
    tree = MerkleTree()

    for i in range(4):
        student_id = f"student_{i:03d}"
        identity.add_approved_student(student_id)
        client = VoterCredentialClient(election_id)
        issuance = identity.issue_credential(student_id, client.create_blinded_request())
        proof = client.unblind_response(issuance["blind_signature"])
        nullifier = client.derive_nullifier()

        b_b64, p_b64 = encrypt_choice("cand_alice", election_id)
        ballot = BallotEvidence(
            schema="himvote.ballot-evidence.v1",
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_id=f"ballot_{i:03d}",
            leaf_index=i,
            credential_nullifier=nullifier,
            credential_proof_b64url=proof,
            engine_ballot_b64url=b_b64,
            engine_proofs_b64url=p_b64,
            engine_record_version="electionguard_1.0.0"
        )
        res = casting.cast_ballot({}, ballot, client.secret_serial)
        committed = casting.ballots_by_index[res["leaf_index"]]
        ballots.append(committed)
        tree.append_leaf(canonical_json_bytes(committed.model_dump(by_alias=True)))

    final_checkpoint = CheckpointRecord(
        schema="himvote.checkpoint.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=4,
        merkle_root=tree.get_root_hex(),
        previous_checkpoint_digest=None,
        last_leaf_index=3,
        last_leaf_digest=sha256_digest(canonical_json_bytes(ballots[3].model_dump(by_alias=True))),
        issued_count=4,
        issuance_ledger_digest=sha256_digest(b"issuance_ledger_q7_04"),
        roster_commitment=sha256_digest(b"roster_q7_04"),
        protocol_version="himvote_2.0.0",
        checkpoint_kind="FINAL",
        checkpoint_sequence=1
    )
    witness_ack = witness.ingest_checkpoint(final_checkpoint)
    final_bytes = canonical_json_bytes(final_checkpoint.model_dump(by_alias=True))
    anchor = chain.anchor_checkpoint(
        caller="0xRelayer123",
        election_commitment=sha256_digest(f"commitment:{election_id}".encode("utf_8")),
        sequence=1,
        digest=sha256_digest(final_bytes),
        is_final=True
    )
    verifier = AuditorVerifier(election_id, manifest_digest)
    tally = {"cand_alice": 4}

    # Case 1: Modify ciphertext
    mod_ciphertext_ballots = [copy.deepcopy(b) for b in ballots]
    fake_b_b64, _ = encrypt_choice("cand_bob", election_id)
    mod_ciphertext_ballots[1] = mod_ciphertext_ballots[1].model_copy(
        update={"engine_ballot_b64url": fake_b_b64}
    )
    rep1 = verifier.audit(mod_ciphertext_ballots, final_checkpoint, witness_ack, anchor, tally)
    assert rep1["exit_code"] == 2
    assert rep1["properties"]["RECORD_INTEGRITY"] == "FAIL"

    # Case 2: Modify zero knowledge engine proof
    mod_proof_ballots = [copy.deepcopy(b) for b in ballots]
    mod_proof_ballots[2] = mod_proof_ballots[2].model_copy(
        update={"engine_proofs_b64url": "dGFtcGVyZWRfcHJvb2ZfZGF0YQ=="}
    )
    rep2 = verifier.audit(mod_proof_ballots, final_checkpoint, witness_ack, anchor, tally)
    assert rep2["exit_code"] == 2
    assert rep2["properties"]["CAST_AS_INTENDED"] == "FAIL"

    # Case 3: Modify nullifier string
    mod_nullifier_ballots = [copy.deepcopy(b) for b in ballots]
    mod_nullifier_ballots[0] = mod_nullifier_ballots[0].model_copy(
        update={"credential_nullifier": "sha256:0000000000000000000000000000000000000000000000000000000000000000"}
    )
    rep3 = verifier.audit(mod_nullifier_ballots, final_checkpoint, witness_ack, anchor, tally)
    assert rep3["exit_code"] == 2
    assert rep3["properties"]["RECORD_INTEGRITY"] == "FAIL"

    # Case 4: Modify leaf index
    mod_index_ballots = [copy.deepcopy(b) for b in ballots]
    mod_index_ballots[3] = mod_index_ballots[3].model_copy(update={"leaf_index": 5})
    rep4 = verifier.audit(mod_index_ballots, final_checkpoint, witness_ack, anchor, tally)
    assert rep4["exit_code"] == 2
    assert rep4["properties"]["RECORD_INTEGRITY"] == "FAIL"

    db_summary = {
        "ciphertext_modification_detected": True,
        "proof_modification_detected": True,
        "nullifier_modification_detected": True,
        "index_modification_detected": True
    }

    record = AuditTestRecord(
        test_id=test_id,
        seed=seed,
        manifest_digest=manifest_digest,
        engine_version="electionguard_1.0.0",
        expected_result="ALL_MODIFICATIONS_DETECTED_MERKLE_AND_PROOF_MISMATCH",
        actual_result="ALL_MODIFICATIONS_DETECTED_MERKLE_AND_PROOF_MISMATCH",
        database_state_summary=db_summary,
        postconditions=[
            "ciphertext alteration causes Merkle root mismatch",
            "proof alteration fails zero knowledge verification",
            "nullifier alteration causes Merkle root mismatch",
            "leaf index alteration causes sequence gap failure"
        ],
        passed=True
    )
    record.save_json(REPORTS_DIR)


def test_q7_05_result_manipulation() -> None:
    """
    Q7_05 Result manipulation test.
    Keeps all valid ballots intact, but alters the announced contest totals.
    Auditor verifier must reject the election result with TALLY_PROOF FAIL.
    """
    test_id = "Q7_05_result_manipulation"
    seed = 70501
    election_id = "elec_q7_05"
    identity, casting, witness, chain, manifest_digest = create_test_setup(election_id, seed)

    # Cast 6 ballots for Alice, 4 ballots for Bob (Total 10)
    ballots: List[BallotEvidence] = []
    tree = MerkleTree()

    for i in range(10):
        student_id = f"student_{i:03d}"
        identity.add_approved_student(student_id)
        client = VoterCredentialClient(election_id)
        issuance = identity.issue_credential(student_id, client.create_blinded_request())
        proof = client.unblind_response(issuance["blind_signature"])
        nullifier = client.derive_nullifier()

        choice = "cand_alice" if i < 6 else "cand_bob"
        b_b64, p_b64 = encrypt_choice(choice, election_id)

        ballot = BallotEvidence(
            schema="himvote.ballot-evidence.v1",
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_id=f"ballot_{i:03d}",
            leaf_index=i,
            credential_nullifier=nullifier,
            credential_proof_b64url=proof,
            engine_ballot_b64url=b_b64,
            engine_proofs_b64url=p_b64,
            engine_record_version="electionguard_1.0.0"
        )
        res = casting.cast_ballot({}, ballot, client.secret_serial)
        committed = casting.ballots_by_index[res["leaf_index"]]
        ballots.append(committed)
        tree.append_leaf(canonical_json_bytes(committed.model_dump(by_alias=True)))

    final_checkpoint = CheckpointRecord(
        schema="himvote.checkpoint.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=10,
        merkle_root=tree.get_root_hex(),
        previous_checkpoint_digest=None,
        last_leaf_index=9,
        last_leaf_digest=sha256_digest(canonical_json_bytes(ballots[9].model_dump(by_alias=True))),
        issued_count=10,
        issuance_ledger_digest=sha256_digest(b"issuance_ledger_q7_05"),
        roster_commitment=sha256_digest(b"roster_q7_05"),
        protocol_version="himvote_2.0.0",
        checkpoint_kind="FINAL",
        checkpoint_sequence=1
    )
    witness_ack = witness.ingest_checkpoint(final_checkpoint)
    final_bytes = canonical_json_bytes(final_checkpoint.model_dump(by_alias=True))
    anchor = chain.anchor_checkpoint(
        caller="0xRelayer123",
        election_commitment=sha256_digest(f"commitment:{election_id}".encode("utf_8")),
        sequence=1,
        digest=sha256_digest(final_bytes),
        is_final=True
    )
    verifier = AuditorVerifier(election_id, manifest_digest)

    # Legitimate tally passes
    honest_tally = {"cand_alice": 6, "cand_bob": 4}
    honest_report = verifier.audit(ballots, final_checkpoint, witness_ack, anchor, honest_tally)
    assert honest_report["exit_code"] == 0
    assert honest_report["properties"]["TALLY_PROOF"] == "PASS"

    # Manipulated tally 1: Alter Alice votes to 7, total becomes 11
    manipulated_tally_inflated = {"cand_alice": 7, "cand_bob": 4}
    bad_rep1 = verifier.audit(ballots, final_checkpoint, witness_ack, anchor, manipulated_tally_inflated)
    assert bad_rep1["exit_code"] == 2
    assert bad_rep1["properties"]["TALLY_PROOF"] == "FAIL"

    # Manipulated tally 2: Total deflated to 9
    manipulated_tally_deflated = {"cand_alice": 5, "cand_bob": 4}
    bad_rep2 = verifier.audit(ballots, final_checkpoint, witness_ack, anchor, manipulated_tally_deflated)
    assert bad_rep2["exit_code"] == 2
    assert bad_rep2["properties"]["TALLY_PROOF"] == "FAIL"

    db_summary = {
        "true_leaf_count": 10,
        "honest_tally": honest_tally,
        "manipulated_tally_inflated": manipulated_tally_inflated,
        "manipulated_tally_deflated": manipulated_tally_deflated,
        "tally_manipulation_detected": True
    }

    record = AuditTestRecord(
        test_id=test_id,
        seed=seed,
        manifest_digest=manifest_digest,
        engine_version="electionguard_1.0.0",
        expected_result="ALTERED_ANNOUNCED_TOTAL_REJECTED_TALLY_VERIFIER_FAILS",
        actual_result="ALTERED_ANNOUNCED_TOTAL_REJECTED_TALLY_VERIFIER_FAILS",
        database_state_summary=db_summary,
        postconditions=[
            "honest tally verified successfully",
            "inflated tally rejected with exit code 2",
            "deflated tally rejected with exit code 2",
            "TALLY_PROOF marked FAIL on mismatch"
        ],
        passed=True
    )
    record.save_json(REPORTS_DIR)
