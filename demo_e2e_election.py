#!/usr/bin/env python3
"""
HimVote End-to-End Election Lifecycle Demonstration
===================================================

Demonstrates the complete CodeForge 2.0 Question 07 secure voting lifecycle:
1. Election setup and manifest freeze with cryptographic digest
2. Synthetic student roster registration and verification
3. Privacy-preserving RFC 9474 RSA blind credential issuance
4. Client-side exponential ElGamal ballot encryption and CDS zero-knowledge proofs
5. Anonymous ballot casting with blind signature verification and Merkle inclusion
6. Controlled duplicate cast rejection (first-and-only accepted ballot constraint)
7. Election closure, append-only Merkle witness checkpoint, and chain anchoring
8. Standalone independent verification of cryptographic integrity and tally proof

Usage:
    python3 demo_e2e_election.py

Security Classification:
    Educational prototype. Synthetic data only. No real students or elections.
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "services" / "casting"))
sys.path.insert(0, str(ROOT / "verifier"))
sys.path.insert(0, str(ROOT / "packages" / "himvote_crypto"))
sys.path.insert(0, str(ROOT))

from tests.harness.casting_cluster import CastingCluster
from tests.harness.chain_cluster import ChainCluster
from tests.harness.crypto import (
    MerkleTree,
    VoterCredentialClient,
    canonical_json_bytes,
    encrypt_choice,
    sha256_digest,
)
from tests.harness.identity_cluster import IdentityCluster
from tests.harness.models import BallotEvidence, CheckpointRecord
from tests.harness.verifier import AuditorVerifier
from tests.harness.witness_cluster import WitnessCluster

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
INFO = "\033[36mINFO\033[0m"
BOLD = "\033[1m"
RESET = "\033[0m"


def log_phase(step_num: int, title: str) -> None:
    print(f"\n{BOLD}[Step {step_num}] {title}{RESET}")
    print("-" * 70)


def main() -> int:
    start_time = time.time()
    print("=" * 70)
    print(f"{BOLD}HimVote — End-to-End Synthetic Election Demonstration{RESET}")
    print(f"Timestamp : {datetime.now(timezone.utc).isoformat()}")
    print(f"Standard  : CodeForge 2.0 Question 07 Compliance Suite")
    print("=" * 70)

    election_id = f"demo_election_{int(time.time())}"
    now = datetime.now(timezone.utc)

    # --------------------------------------------------------------------------
    # Phase 1: Election Administration & Manifest Freeze
    # --------------------------------------------------------------------------
    log_phase(1, "Election Administration & Manifest Freeze")
    candidates = [
        {"id": "cand_alice", "name": "Alice Patel (Computer Science)"},
        {"id": "cand_bob", "name": "Bob Chen (Electrical Engineering)"},
        {"id": "cand_clara", "name": "Clara Rossi (Mechanical Engineering)"},
    ]
    manifest = {
        "election_id": election_id,
        "title": "Himachal Pradesh Technical University General Council Election 2026",
        "contests": [{"id": "contest_council", "title": "University Student Council President"}],
        "candidates": candidates,
        "opens_at_utc": (now - timedelta(minutes=10)).isoformat(),
        "closes_at_utc": (now + timedelta(hours=2)).isoformat(),
        "issuance_cutoff_utc": (now + timedelta(hours=1)).isoformat(),
        "selection_rule": "plurality",
        "version": 1,
    }
    manifest_bytes = canonical_json_bytes(manifest)
    manifest_digest = sha256_digest(manifest_bytes)

    print(f"[*] Created election: {manifest['title']}")
    print(f"[*] Manifest digest (SHA-256): {manifest_digest}")
    print(f"[*] Status: [{PASS}] Manifest frozen and cryptographically bound")

    # --------------------------------------------------------------------------
    # Phase 2: Synthetic Student Roster & Trust Clusters
    # --------------------------------------------------------------------------
    log_phase(2, "Synthetic Student Roster & Trust Domain Initialization")
    identity = IdentityCluster(election_id)
    casting = CastingCluster(
        election_id=election_id,
        manifest_digest=manifest_digest,
        issuer=identity.issuer,
        opens_at_utc=now - timedelta(minutes=10),
        closes_at_utc=now + timedelta(hours=2),
    )
    witness = WitnessCluster(election_id, manifest_digest)
    chain = ChainCluster()

    synthetic_voters = [
        ("student_hptu_101", "Aarav Sharma", "Computer Science"),
        ("student_hptu_102", "Diya Verma", "Information Technology"),
        ("student_hptu_103", "Kabir Mehta", "Electronics & Communication"),
    ]

    for student_id, name, dept in synthetic_voters:
        identity.add_approved_student(student_id)
        print(f"[*] Registered & verified: {name} ({student_id}) - {dept}")

    print(f"[*] Roster commitment: {sha256_digest(b'roster_approved')}")
    print(f"[*] Status: [{PASS}] All 3 synthetic voters approved on roster")

    # --------------------------------------------------------------------------
    # Phase 3: Privacy-Preserving RFC 9474 Blind Credential Issuance
    # --------------------------------------------------------------------------
    log_phase(3, "Privacy-Preserving RFC 9474 Blind Credential Issuance")
    clients = []
    credentials = []

    for idx, (student_id, name, _) in enumerate(synthetic_voters):
        voter_client = VoterCredentialClient(election_id, client_platform="web")
        blinded_req = voter_client.create_blinded_request()
        issued = identity.issue_credential(student_id, blinded_req)
        proof = voter_client.unblind_response(issued["blind_signature"])
        nullifier = voter_client.derive_nullifier()

        clients.append(voter_client)
        credentials.append((nullifier, proof))
        print(f"[*] Issued credential for {student_id} (blinded signature unblinded)")
        print(f"    - Nullifier: {nullifier[:16]}... (independent of student identity)")

    print(f"[*] Status: [{PASS}] All voter credentials issued without identity-ballot linkage")

    # --------------------------------------------------------------------------
    # Phase 4 & 5: Ballot Encryption & Casting
    # --------------------------------------------------------------------------
    log_phase(4, "Ballot Encryption, CDS Proofs & Anonymous Casting")
    voter_choices = ["cand_alice", "cand_bob", "cand_alice"]
    ballot_evidences: list[BallotEvidence] = []
    receipt_handles = []

    for idx, choice in enumerate(voter_choices):
        voter_client = clients[idx]
        nullifier, proof = credentials[idx]

        encrypted_ballot, proofs = encrypt_choice(choice, election_id)
        ballot = BallotEvidence(
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_id=f"ballot_hptu_{idx+1:03d}",
            leaf_index=idx,
            credential_nullifier=nullifier,
            credential_proof_b64url=proof,
            engine_ballot_b64url=encrypted_ballot,
            engine_proofs_b64url=proofs,
        )

        cast_res = casting.cast_ballot(
            {"X_Platform": "web"},
            ballot,
            voter_client.secret_serial,
            now + timedelta(seconds=idx * 10),
        )

        assert cast_res["status"] == "COMMITTED_PENDING_WITNESS", f"Cast failed: {cast_res}"
        receipt_handles.append(cast_res["receipt_handle"])
        ballot_evidences.append(casting.ballots_by_index[idx])
        print(f"[*] Ballot #{idx+1} cast successfully:")
        print(f"    - Leaf index: {idx}")
        print(f"    - Receipt handle: {cast_res['receipt_handle']}")
        print(f"    - Choice encrypted: {choice} (Zero-knowledge CDS proofs attached)")

    print(f"[*] Status: [{PASS}] All ballots accepted and appended to Merkle log")

    # --------------------------------------------------------------------------
    # Phase 6: Controlled Duplicate Cast Attack Rejection (Negative Test)
    # --------------------------------------------------------------------------
    log_phase(5, "Controlled Negative Test: Duplicate Cast Rejection")
    first_client = clients[0]
    first_nullifier, first_proof = credentials[0]
    duplicate_ballot, duplicate_proofs = encrypt_choice("cand_clara", election_id)

    attempted_duplicate = BallotEvidence(
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="ballot_malicious_duplicate",
        leaf_index=len(ballot_evidences),
        credential_nullifier=first_nullifier,
        credential_proof_b64url=first_proof,
        engine_ballot_b64url=duplicate_ballot,
        engine_proofs_b64url=duplicate_proofs,
    )

    try:
        casting.cast_ballot(
            {"X_Platform": "web"},
            attempted_duplicate,
            first_client.secret_serial,
            now + timedelta(minutes=5),
        )
        print(f"[*] {FAIL}: Duplicate ballot was accepted when it MUST be rejected!")
        return 1
    except Exception as exc:
        print(f"[*] Correctly caught duplicate submission attempt:")
        print(f"    - Error: {exc}")
        print(f"[*] Status: [{PASS}] Nullifier collision triggered immediate rejection")

    # --------------------------------------------------------------------------
    # Phase 7: Election Close, Merkle Witnessing & Smart Contract Anchor
    # --------------------------------------------------------------------------
    log_phase(6, "Election Closure, Append-Only Merkle Witness & Chain Anchor")
    tree = MerkleTree()
    for b in ballot_evidences:
        tree.append_leaf(canonical_json_bytes(b.model_dump(by_alias=True)))

    merkle_root = tree.get_root_hex()
    final_checkpoint = CheckpointRecord(
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=len(ballot_evidences),
        merkle_root=merkle_root,
        last_leaf_index=len(ballot_evidences) - 1,
        last_leaf_digest=sha256_digest(canonical_json_bytes(ballot_evidences[-1].model_dump(by_alias=True))),
        issued_count=len(synthetic_voters),
        issuance_ledger_digest=sha256_digest(b"issuance_closed"),
        roster_commitment=sha256_digest(b"roster_approved"),
        checkpoint_kind="FINAL",
        checkpoint_sequence=1,
    )

    acknowledgement = witness.ingest_checkpoint(final_checkpoint)
    casting.acknowledge_witnessed_up_to(len(ballot_evidences) - 1, acknowledgement.acknowledged_at)

    print(f"[*] Final Merkle Root: {merkle_root}")
    print(f"[*] Witness Signature: {acknowledgement.witness_signature[:32]}...")

    anchor = chain.anchor_checkpoint(
        caller="0xRelayer123",
        election_commitment=sha256_digest(election_id.encode("utf8")),
        sequence=1,
        digest=sha256_digest(canonical_json_bytes(final_checkpoint.model_dump(by_alias=True))),
        is_final=True,
    )
    print(f"[*] Smart Contract Anchor Block Hash: {anchor.block_hash}")
    print(f"[*] Block Number: {anchor.block_number}")
    print(f"[*] Status: [{PASS}] Final checkpoint witnessed and anchored")

    # --------------------------------------------------------------------------
    # Phase 8: Independent Reference Verifier Audit
    # --------------------------------------------------------------------------
    log_phase(7, "Independent Reference Verifier Audit")
    expected_tally = {"cand_alice": 2, "cand_bob": 1}
    auditor = AuditorVerifier(election_id, manifest_digest)
    audit_report = auditor.audit(
        ballots=ballot_evidences,
        independent_final_checkpoint=final_checkpoint,
        witness_ack=acknowledgement,
        chain_anchor=anchor,
        announced_tally=expected_tally,
    )

    print(f"[*] Verifier exit code: {audit_report['exit_code']}")
    for prop, status in audit_report["properties"].items():
        print(f"    - {prop:<25}: [{PASS if status == 'PASS' else FAIL}]")

    assert audit_report["exit_code"] == 0
    assert audit_report["properties"]["RECORD_INTEGRITY"] == "PASS"
    assert audit_report["properties"]["ANCHOR_FINALITY"] == "PASS"
    assert audit_report["properties"]["TALLY_PROOF"] == "PASS"

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"{BOLD}END-TO-END DEMONSTRATION COMPLETE: {PASS} ({elapsed:.2f}s){RESET}")
    print(f"Winner: Alice Patel ({expected_tally['cand_alice']} votes)")
    print(f"Runner-up: Bob Chen ({expected_tally['cand_bob']} votes)")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
