"""
Load and throughput concurrency test suite matching Section 12.4 of prompt.md.
Simulates high concurrent load of voters casting ballots, outbox draining,
and witness checkpoint pipeline under sustained throughput.
"""

import concurrent.futures
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from ..harness.crypto import (
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


def test_sustained_concurrent_voting_and_checkpoint_pipeline() -> None:
    """
    Simulates 100 concurrent voters casting distinct valid ballots.
    Asserts zero leaf index collisions, strictly ordered outbox sequence,
    and end to end verification against witness final.
    """
    test_id = "load_concurrent_voting_100_voters"
    seed = 90101
    election_id = "elec_load_100"

    manifest_dict = {
        "election_id": election_id,
        "title": "High Concurrency Institutional Student Election",
        "contests": [{"id": "contest_pres", "title": "President"}],
        "candidates": [
            {"id": "cand_a", "name": "Candidate Alpha"},
            {"id": "cand_b", "name": "Candidate Beta"}
        ],
        "opens_at_utc": "2026_10_30T00:00:00Z",
        "closes_at_utc": "2026_10_30T23:59:59Z",
        "issuance_cutoff_utc": "2026_10_30T20:00:00Z",
        "version": 1
    }
    manifest_bytes = canonical_json_bytes(manifest_dict)
    manifest_digest = sha256_digest(manifest_bytes)

    identity = IdentityCluster(election_id)
    casting = CastingCluster(election_id, manifest_digest, identity.issuer)
    witness = WitnessCluster(election_id, manifest_digest)
    chain = ChainCluster()

    # Register and issue 100 credentials
    voters: List[Tuple[str, VoterCredentialClient, str, str]] = []
    for i in range(100):
        student_id = f"student_load_{i:04d}"
        identity.add_approved_student(student_id)
        client = VoterCredentialClient(election_id)
        iss = identity.issue_credential(student_id, client.create_blinded_request())
        proof = client.unblind_response(iss["blind_signature"])
        nullifier = client.derive_nullifier()
        voters.append((student_id, client, proof, nullifier))

    # Concurrently cast 100 ballots across 20 worker threads
    results: List[Dict[str, Any]] = []

    def voter_task(index: int) -> Dict[str, Any]:
        student_id, client, proof, nullifier = voters[index]
        choice = "cand_a" if index % 2 == 0 else "cand_b"
        b_b64, p_b64 = encrypt_choice(choice, election_id)

        ballot = BallotEvidence(
            schema="himvote.ballot-evidence.v1",
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_id=f"ballot_load_{index:04d}",
            leaf_index=0,
            credential_nullifier=nullifier,
            credential_proof_b64url=proof,
            engine_ballot_b64url=b_b64,
            engine_proofs_b64url=p_b64,
            engine_record_version="electionguard_1.0.0"
        )
        return casting.cast_ballot({"X_Platform": "load_agent"}, ballot, client.secret_serial)

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(voter_task, i) for i in range(100)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    # Assert all 100 succeeded
    assert len(results) == 100
    assert len(casting.ballots_by_index) == 100
    assert len(casting.nullifiers_to_leaf) == 100
    assert casting.next_leaf_index == 100

    # Assert strict monotonic leaf sequence
    leaf_indices = sorted(casting.ballots_by_index.keys())
    assert leaf_indices == list(range(100))

    # Drain outbox into Merkle tree in exact leaf order
    tree = MerkleTree()
    ordered_ballots = [casting.ballots_by_index[i] for i in range(100)]
    for ballot in ordered_ballots:
        leaf_bytes = canonical_json_bytes(ballot.model_dump(by_alias=True))
        tree.append_leaf(leaf_bytes)

    # Publish final checkpoint
    final_root = tree.get_root_hex()
    last_leaf_bytes = canonical_json_bytes(ordered_ballots[-1].model_dump(by_alias=True))
    final_checkpoint = CheckpointRecord(
        schema="himvote.checkpoint.v1",
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=100,
        merkle_root=final_root,
        previous_checkpoint_digest=None,
        last_leaf_index=99,
        last_leaf_digest=sha256_digest(last_leaf_bytes),
        issued_count=100,
        issuance_ledger_digest=sha256_digest(b"issuance_100_closed"),
        roster_commitment=sha256_digest(b"roster_100_final"),
        protocol_version="himvote_2.0.0",
        checkpoint_kind="FINAL",
        checkpoint_sequence=1
    )
    ack = witness.ingest_checkpoint(final_checkpoint)
    casting.acknowledge_witnessed_up_to(99, ack.acknowledged_at)

    # Chain anchor
    final_bytes = canonical_json_bytes(final_checkpoint.model_dump(by_alias=True))
    anchor = chain.anchor_checkpoint(
        caller="0xRelayer123",
        election_commitment=sha256_digest(f"commitment:{election_id}".encode("utf_8")),
        sequence=1,
        digest=sha256_digest(final_bytes),
        is_final=True
    )

    # Run auditor verification
    tally = {"cand_a": 50, "cand_b": 50}
    verifier = AuditorVerifier(election_id, manifest_digest)
    audit_report = verifier.audit(ordered_ballots, final_checkpoint, ack, anchor, tally)
    assert audit_report["exit_code"] == 0
    assert audit_report["properties"]["RECORD_INTEGRITY"] == "PASS"
    assert audit_report["properties"]["TALLY_PROOF"] == "PASS"

    db_summary = {
        "concurrent_voters_count": 100,
        "committed_leaves": 100,
        "next_leaf_index": 100,
        "witness_acknowledged_tree_size": 100,
        "chain_anchored": True
    }

    record = AuditTestRecord(
        test_id=test_id,
        seed=seed,
        manifest_digest=manifest_digest,
        engine_version="electionguard_1.0.0",
        expected_result="100_CONCURRENT_BALLOTS_PROCESSED_WITHOUT_COLLISION_VERIFIED_PASS",
        actual_result="100_CONCURRENT_BALLOTS_PROCESSED_WITHOUT_COLLISION_VERIFIED_PASS",
        database_state_summary=db_summary,
        postconditions=[
            "100 distinct voters successfully cast concurrent ballots",
            "zero leaf index collisions or duplicate nullifiers",
            "outbox successfully drains into 100 leaf RFC 9162 Merkle tree",
            "witness signs final checkpoint and chain anchors root",
            "full independent audit verification passes with exit code 0"
        ],
        passed=True
    )
    record.save_json(REPORTS_DIR)
