"""End to end acceptance tests for the staged launch scenario."""

from datetime import datetime, timedelta, timezone

import pytest

from tests.harness.casting_cluster import CastingCluster
from tests.harness.chain_cluster import ChainCluster
from tests.harness.crypto import MerkleTree, VoterCredentialClient, canonical_json_bytes, encrypt_choice, sha256_digest
from tests.harness.identity_cluster import IdentityCluster
from tests.harness.models import BallotEvidence, CheckpointRecord
from tests.harness.verifier import AuditorVerifier
from tests.harness.witness_cluster import WitnessCluster


def test_staged_launch_from_issuance_to_published_result() -> None:
    """Prove issuance, casting, witnessing, anchoring, and independent verification."""
    election_id = "acceptance_launch_2026"
    now = datetime.now(timezone.utc)
    manifest = {
        "election_id": election_id,
        "title": "Institutional Student Council Election",
        "contests": [{"id": "president", "title": "President"}],
        "candidates": [{"id": "candidate_a", "name": "Candidate A"}, {"id": "candidate_b", "name": "Candidate B"}],
        "opens_at_utc": (now - timedelta(minutes=5)).isoformat(),
        "closes_at_utc": (now + timedelta(minutes=5)).isoformat(),
        "issuance_cutoff_utc": (now - timedelta(minutes=1)).isoformat(),
        "version": 1,
    }
    manifest_digest = sha256_digest(canonical_json_bytes(manifest))
    identity = IdentityCluster(election_id)
    casting = CastingCluster(election_id, manifest_digest, identity.issuer, now - timedelta(minutes=5), now + timedelta(minutes=5))
    witness = WitnessCluster(election_id, manifest_digest)
    chain = ChainCluster()

    identity.add_approved_student("student_acceptance_001")
    client = VoterCredentialClient(election_id, client_platform="web")
    issued = identity.issue_credential("student_acceptance_001", client.create_blinded_request())
    proof = client.unblind_response(issued["blind_signature"])
    nullifier = client.derive_nullifier()
    encrypted, proofs = encrypt_choice("candidate_a", election_id)
    ballot = BallotEvidence(
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_id="acceptance_ballot_001",
        leaf_index=0,
        credential_nullifier=nullifier,
        credential_proof_b64url=proof,
        engine_ballot_b64url=encrypted,
        engine_proofs_b64url=proofs,
    )

    first = casting.cast_ballot({"X_Platform": "web"}, ballot, client.secret_serial, now)
    assert first["status"] == "COMMITTED_PENDING_WITNESS"
    for platform in ("android", "ios", "windows"):
        assert casting.cast_ballot({"X_Platform": platform}, ballot, client.secret_serial, now) == first
    assert casting.next_leaf_index == 1

    stored = casting.ballots_by_index[0]
    tree = MerkleTree()
    stored_bytes = canonical_json_bytes(stored.model_dump(by_alias=True))
    tree.append_leaf(stored_bytes)
    final = CheckpointRecord(
        election_id=election_id,
        manifest_digest=manifest_digest,
        tree_size=1,
        merkle_root=tree.get_root_hex(),
        last_leaf_index=0,
        last_leaf_digest=sha256_digest(stored_bytes),
        issued_count=1,
        issuance_ledger_digest=sha256_digest(b"issuance_closed"),
        roster_commitment=sha256_digest(b"roster_approved"),
        checkpoint_kind="FINAL",
        checkpoint_sequence=1,
    )
    acknowledgement = witness.ingest_checkpoint(final)
    casting.acknowledge_witnessed_up_to(0, acknowledgement.acknowledged_at)
    assert casting.get_receipt_status(first["receipt_handle"])["status"] == "WITNESSED"

    anchor = chain.anchor_checkpoint(
        caller="0xRelayer123",
        election_commitment=sha256_digest(election_id.encode("utf8")),
        sequence=1,
        digest=sha256_digest(canonical_json_bytes(final.model_dump(by_alias=True))),
        is_final=True,
    )
    report = AuditorVerifier(election_id, manifest_digest).audit([stored], final, acknowledgement, anchor, {"candidate_a": 1})
    assert report["exit_code"] == 0
    assert report["properties"]["RECORD_INTEGRITY"] == "PASS"
    assert report["properties"]["ANCHOR_FINALITY"] == "PASS"
    assert report["properties"]["TALLY_PROOF"] == "PASS"


def test_acceptance_rejects_a_different_ballot_from_a_second_platform() -> None:
    """A credential may retry its exact request but cannot change its ballot."""
    election_id = "acceptance_duplicate_2026"
    identity = IdentityCluster(election_id)
    manifest_digest = sha256_digest(b"acceptance manifest")
    casting = CastingCluster(election_id, manifest_digest, identity.issuer)
    identity.add_approved_student("student_acceptance_002")
    client = VoterCredentialClient(election_id, client_platform="web")
    issued = identity.issue_credential("student_acceptance_002", client.create_blinded_request())
    proof = client.unblind_response(issued["blind_signature"])
    nullifier = client.derive_nullifier()

    def make_ballot(choice: str, ballot_id: str) -> BallotEvidence:
        encrypted, proofs = encrypt_choice(choice, election_id)
        return BallotEvidence(
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_id=ballot_id,
            leaf_index=0,
            credential_nullifier=nullifier,
            credential_proof_b64url=proof,
            engine_ballot_b64url=encrypted,
            engine_proofs_b64url=proofs,
        )

    casting.cast_ballot({"X_Platform": "web"}, make_ballot("candidate_a", "ballot_a"), client.secret_serial)
    with pytest.raises(ValueError, match="Duplicate credential nullifier"):
        casting.cast_ballot({"X_Platform": "android"}, make_ballot("candidate_b", "ballot_b"), client.secret_serial)
