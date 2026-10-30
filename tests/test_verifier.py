"""Unit and integration tests for HimVote standalone auditor and verifier CLI.
Compliant with Section 6.8 and Section 12 of prompt specification.
"""

import base64
import hashlib
import io
import json
import os
import shutil
import tarfile
import tempfile
import zipfile
from typing import Any, Dict, List, Tuple

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, padding, rsa

from himvote_crypto.rsa_blind import (
    RSABSSAVariant,
    client_blind,
    client_finalize,
    generate_rsa_keypair,
    server_blind_sign,
)
from services.election_engine.booth import create_encrypted_ballot
from services.election_engine.constants import G, P
from services.election_engine.crypto import ElGamalCiphertext, TrusteeKeyPair, prove_dleq

# Import verifier modules
from verifier.verify import (
    EXIT_PASS,
    EXIT_CRYPTO_FAIL,
    EXIT_UNVERIFIABLE,
    EXIT_BAD_ARCHIVE,
    FAIL_BAD_SIGNATURE,
    FAIL_INVALID_TALLY,
    FAIL_DUPLICATE_NULLIFIER,
    PROPERTY_RECORD_INTEGRITY,
    PROPERTY_CREDENTIAL_UNIQUENESS,
    PROPERTY_ROSTER_ATTESTATION,
    PROPERTY_TALLY_PROOF,
    PROPERTY_ANCHOR_FINALITY,
    STATUS_PASS,
    STATUS_FAIL,
    STATUS_UNVERIFIABLE,
    audit_evidence,
    canonicalize_json,
    compute_rfc9162_merkle_root,
    decode_signature_bytes,
    format_digest,
    main,
    safe_json_loads,
    verify_inclusion,
    verify_attestation,
    BadArchiveError,
    CryptoAuthError,
    UnverifiableError,
)


def generate_ed25519_keypair() -> Tuple[ed25519.Ed25519PrivateKey, str, str]:
    """Generate Ed25519 keypair returning private key, raw base64 public key, and pem."""
    priv = ed25519.Ed25519PrivateKey.generate()
    pub = priv.public_key()
    pub_raw = pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    pub_b64 = base64.b64encode(pub_raw).decode("utf_8")
    pub_pem = pub.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf_8")
    return priv, pub_b64, pub_pem


class ElectionFixtureHelper:
    """Helper to generate signed election fixtures for verifier testing."""

    def __init__(self, tmp_path_factory) -> None:
        self.base_dir = tmp_path_factory.mktemp("himvote_test_fixtures")
        self.election_id = "elec_0000000000000001"
        self.chain_id = 1337
        self.contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
        self.code_hash = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

        # Authority keypairs
        self.roster_priv, self.roster_pub_b64, self.roster_pub_pem = generate_ed25519_keypair()
        self.issuer_priv, self.issuer_pub_b64, self.issuer_pub_pem = generate_ed25519_keypair()
        self.witness_priv, self.witness_pub_b64, self.witness_pub_pem = generate_ed25519_keypair()
        self.auditor_priv, self.auditor_pub_b64, self.auditor_pub_pem = generate_ed25519_keypair()

    def build_trust_pins(self) -> Dict[str, Any]:
        return {
            "schema": "himvote.trust_pins.v1",
            "election_id": self.election_id,
            "roster_approver_key": {
                "key_id": "key_roster_01",
                "algorithm": "Ed25519",
                "public_key_pem": self.roster_pub_pem,
            },
            "issuer_key": {
                "key_id": "key_issuer_01",
                "algorithm": "Ed25519",
                "public_key_pem": self.issuer_pub_pem,
            },
            "witness_keys": [
                {
                    "key_id": "key_witness_01",
                    "algorithm": "Ed25519",
                    "public_key_pem": self.witness_pub_pem,
                }
            ],
            "auditor_key": {
                "key_id": "key_auditor_01",
                "algorithm": "Ed25519",
                "public_key_pem": self.auditor_pub_pem,
            },
            "chain": {
                "chain_id": self.chain_id,
                "contract_address": self.contract_address,
                "code_hash": self.code_hash,
                "min_confirmations": 6,
            },
        }

    def build_valid_election_bundle(
        self,
        num_ballots: int = 3,
        export_as_archive: bool = False,
    ) -> Dict[str, str]:
        bundle_dir = tempfile.mkdtemp(prefix="bundle_", dir=str(self.base_dir))
        export_dir = os.path.join(bundle_dir, "export")
        os.makedirs(export_dir, exist_ok=True)

        roster_commitment = "sha256:2222222222222222222222222222222222222222222222222222222222222222"
        eligible_count = 100

        # Manifest
        manifest_core = {
            "schema": "himvote.manifest.v1",
            "election_id": self.election_id,
            "contest": "General Election",
            "candidate_ids": ["cand_alice", "cand_bob"],
            "selection_rule": "plurality",
            "roster_version": 1,
            "roster_commitment": roster_commitment,
            "public_eligible_count": eligible_count,
            "issuer_key_id": "key_issuer_01",
            "engine_name": "electionguard",
            "engine_version": "1.0.0",
            "trustees": ["trustee_1"],
            "log_key_id": "key_log_01",
            "witness_keys": ["key_witness_01"],
            "auditor_key_fingerprint": "sha256:auditor_fp",
            "issuance_start_utc": "2026_10_30T08:00:00Z",
            "issuance_cutoff_utc": "2026_10_30T10:00:00Z",
            "opens_at_utc": "2026_10_30T10:00:00Z",
            "closes_at_utc": "2026_10_30T18:00:00Z",
            "minimum_anonymity_policy": 10,
            "verifier_version": "2.0.0",
            "anchor_policy": "required_before_publication",
        }
        manifest_bytes = canonicalize_json(manifest_core)
        manifest_digest = format_digest(manifest_bytes)
        manifest_full = dict(manifest_core)
        manifest_full["manifest_digest"] = manifest_digest

        with open(os.path.join(export_dir, "manifest.json"), "wb") as f:
            f.write(canonicalize_json(manifest_full))

        # Roster Approval
        roster_approval_core = {
            "schema": "himvote.roster_approval.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "roster_version": 1,
            "roster_commitment": roster_commitment,
            "eligible_count": eligible_count,
            "approver_key_id": "key_roster_01",
        }
        roster_sig = self.roster_priv.sign(canonicalize_json(roster_approval_core))
        roster_approval_full = dict(roster_approval_core)
        roster_approval_full["signature"] = base64.b64encode(roster_sig).decode("utf_8")
        roster_path = os.path.join(bundle_dir, "roster_approval.json")
        with open(roster_path, "wb") as f:
            f.write(canonicalize_json(roster_approval_full))

        # Issuance Closure
        issuance_closure_core = {
            "schema": "himvote.issuance_closure.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "issued_count": num_ballots,
            "issuance_ledger_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "closed_at_utc": "2026_10_30T09:59:00Z",
            "issuer_key_id": "key_issuer_01",
        }
        issuance_sig = self.issuer_priv.sign(canonicalize_json(issuance_closure_core))
        issuance_closure_full = dict(issuance_closure_core)
        issuance_closure_full["signature"] = base64.b64encode(issuance_sig).decode("utf_8")
        issuance_path = os.path.join(bundle_dir, "issuance_closure.json")
        with open(issuance_path, "wb") as f:
            f.write(canonicalize_json(issuance_closure_full))

        # Ballots and Leaves
        leaves: List[Dict[str, Any]] = []
        canonical_leaf_bytes_list: List[bytes] = []
        alice_votes = 0
        bob_votes = 0

        for i in range(num_ballots):
            cand = "cand_alice" if i % 2 == 0 else "cand_bob"
            if cand == "cand_alice":
                alice_votes += 1
            else:
                bob_votes += 1

            nullifier = f"sha256:{hashlib.sha256(f'nullifier_{i}'.encode('utf_8')).hexdigest()}"
            binding_msg = f"{self.election_id}:{manifest_digest}:{nullifier}".encode("utf_8")
            cred_sig = self.issuer_priv.sign(binding_msg)
            cred_proof_b64url = base64.urlsafe_b64encode(cred_sig).decode("utf_8")

            ballot_payload = {
                "contest_id": "General Election",
                "selections": {cand: 1},
                "ballot_serial": f"serial_{i}",
            }
            engine_ballot_b64url = base64.urlsafe_b64encode(
                canonicalize_json(ballot_payload)
            ).decode("utf_8")
            engine_proofs_b64url = base64.urlsafe_b64encode(
                canonicalize_json({"zkp_valid": True, "ballot_index": i})
            ).decode("utf_8")

            leaf = {
                "schema": "himvote.ballot_evidence.v1",
                "election_id": self.election_id,
                "manifest_digest": manifest_digest,
                "ballot_id": f"ballot_{i:016d}",
                "leaf_index": i,
                "credential_nullifier": nullifier,
                "credential_proof_b64url": cred_proof_b64url,
                "engine_ballot_b64url": engine_ballot_b64url,
                "engine_proofs_b64url": engine_proofs_b64url,
                "engine_record_version": "electionguard_1.0.0",
            }
            c_leaf = canonicalize_json(leaf)
            canonical_leaf_bytes_list.append(c_leaf)
            leaves.append(leaf)

        with open(os.path.join(export_dir, "leaves.json"), "wb") as f:
            f.write(canonicalize_json(leaves))

        # Tally / Results
        tally_data = {
            "schema": "himvote.tally.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "contest_tallies": {"cand_alice": alice_votes, "cand_bob": bob_votes},
            "total_ballots": num_ballots,
        }
        with open(os.path.join(export_dir, "results.json"), "wb") as f:
            f.write(canonicalize_json(tally_data))

        # Merkle root calculation
        merkle_root = compute_rfc9162_merkle_root(canonical_leaf_bytes_list)
        merkle_root_hex = f"sha256:{merkle_root.hex()}"
        last_leaf_digest = ""
        if canonical_leaf_bytes_list:
            last_leaf_digest = format_digest(b"\x00" + canonical_leaf_bytes_list[-1])

        # Witness Final Checkpoint
        checkpoint_core = {
            "schema": "himvote.checkpoint.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "tree_size": num_ballots,
            "merkle_root": merkle_root_hex,
            "previous_checkpoint_digest": None,
            "last_leaf_index": num_ballots - 1 if num_ballots > 0 else -1,
            "last_leaf_digest": last_leaf_digest,
            "issued_count": num_ballots,
            "issuance_ledger_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "roster_commitment": roster_commitment,
            "protocol_version": "himvote_2.0.0",
            "checkpoint_kind": "FINAL",
            "checkpoint_sequence": 1,
            "witness_key_id": "key_witness_01",
        }
        cp_sig = self.witness_priv.sign(canonicalize_json(checkpoint_core))
        checkpoint_full = dict(checkpoint_core)
        checkpoint_full["signature"] = base64.b64encode(cp_sig).decode("utf_8")
        final_path = os.path.join(bundle_dir, "final_checkpoint.json")
        with open(final_path, "wb") as f:
            f.write(canonicalize_json(checkpoint_full))

        checkpoint_digest = format_digest(canonicalize_json(checkpoint_core))

        # Chain Anchor
        chain_core = {
            "schema": "himvote.chain_anchor.v1",
            "chain_id": self.chain_id,
            "contract_address": self.contract_address,
            "code_hash": self.code_hash,
            "block_number": 100,
            "block_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "confirmations": 12,
            "is_final": True,
            "anchored_digest": checkpoint_digest,
            "previous_anchored_digest": None,
            "election_commitment": manifest_digest,
            "sequence": 1,
            "relayer_address": "0x0000000000000000000000000000000000000001",
        }
        chain_path = os.path.join(bundle_dir, "chain_anchor.json")
        with open(chain_path, "wb") as f:
            f.write(canonicalize_json(chain_core))

        # Trust pins
        trust_path = os.path.join(bundle_dir, "trust_pins.json")
        with open(trust_path, "wb") as f:
            f.write(canonicalize_json(self.build_trust_pins()))

        final_export_target = export_dir
        if export_as_archive:
            zip_target = os.path.join(bundle_dir, "export.zip")
            with zipfile.ZipFile(zip_target, "w") as zf:
                for root, _, files in os.walk(export_dir):
                    for file in files:
                        full_f = os.path.join(root, file)
                        rel_f = os.path.relpath(full_f, export_dir)
                        zf.write(full_f, rel_f)
            final_export_target = zip_target

        report_path = os.path.join(bundle_dir, "report.json")

        return {
            "bundle_dir": bundle_dir,
            "export": final_export_target,
            "export_dir": export_dir,
            "trust": trust_path,
            "final": final_path,
            "roster": roster_path,
            "issuance": issuance_path,
            "chain": chain_path,
            "report": report_path,
            "manifest_digest": manifest_digest,
        }

    def build_homomorphic_election_bundle(
        self,
        num_ballots: int = 3,
    ) -> Dict[str, Any]:
        """Construct election bundle with homomorphic encrypted ballots and trustee decryption proofs."""
        bundle_dir = tempfile.mkdtemp(prefix="bundle_homomorphic_", dir=str(self.base_dir))
        export_dir = os.path.join(bundle_dir, "export")
        os.makedirs(export_dir, exist_ok=True)

        roster_commitment = "sha256:2222222222222222222222222222222222222222222222222222222222222222"
        eligible_count = 100
        candidates = ["cand_alice", "cand_bob"]

        # Setup trustees
        prelim_digest = "sha256:0000000000000000000000000000000000000000000000000000000000000000"
        t1 = TrusteeKeyPair.generate("trustee_1", prelim_digest, self.election_id)
        t2 = TrusteeKeyPair.generate("trustee_2", prelim_digest, self.election_id)
        joint_pk = (t1.public_key_share * t2.public_key_share) % P

        manifest_core = {
            "schema": "himvote.manifest.v1",
            "election_id": self.election_id,
            "contest": "General Election",
            "candidates": candidates,
            "candidate_ids": candidates,
            "joint_public_key": hex(joint_pk),
            "selection_rule": "plurality",
            "roster_version": 1,
            "roster_commitment": roster_commitment,
            "public_eligible_count": eligible_count,
            "issuer_key_id": "key_issuer_01",
            "engine_name": "electionguard",
            "engine_version": "1.0.0",
            "trustees": ["trustee_1", "trustee_2"],
            "log_key_id": "key_log_01",
            "witness_keys": ["key_witness_01"],
            "auditor_key_fingerprint": "sha256:auditor_fp",
            "issuance_start_utc": "2026_10_30T08:00:00Z",
            "issuance_cutoff_utc": "2026_10_30T10:00:00Z",
            "opens_at_utc": "2026_10_30T10:00:00Z",
            "closes_at_utc": "2026_10_30T18:00:00Z",
            "minimum_anonymity_policy": 10,
            "verifier_version": "2.0.0",
            "anchor_policy": "required_before_publication",
        }
        manifest_bytes = canonicalize_json(manifest_core)
        manifest_digest = format_digest(manifest_bytes)

        manifest_full = dict(manifest_core)
        manifest_full["manifest_digest"] = manifest_digest

        with open(os.path.join(export_dir, "manifest.json"), "wb") as f:
            f.write(canonicalize_json(manifest_full))

        # Roster approval
        roster_approval_core = {
            "schema": "himvote.roster_approval.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "roster_version": 1,
            "roster_commitment": roster_commitment,
            "eligible_count": eligible_count,
            "approver_key_id": "key_roster_01",
        }
        roster_sig = self.roster_priv.sign(canonicalize_json(roster_approval_core))
        roster_approval_full = dict(roster_approval_core)
        roster_approval_full["signature"] = base64.b64encode(roster_sig).decode("utf_8")
        roster_path = os.path.join(bundle_dir, "roster_approval.json")
        with open(roster_path, "wb") as f:
            f.write(canonicalize_json(roster_approval_full))

        # Issuance closure
        issuance_closure_core = {
            "schema": "himvote.issuance_closure.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "issued_count": num_ballots,
            "issuance_ledger_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "closed_at_utc": "2026_10_30T09:59:00Z",
            "issuer_key_id": "key_issuer_01",
        }
        issuance_sig = self.issuer_priv.sign(canonicalize_json(issuance_closure_core))
        issuance_closure_full = dict(issuance_closure_core)
        issuance_closure_full["signature"] = base64.b64encode(issuance_sig).decode("utf_8")
        issuance_path = os.path.join(bundle_dir, "issuance_closure.json")
        with open(issuance_path, "wb") as f:
            f.write(canonicalize_json(issuance_closure_full))

        # Create encrypted ballots
        leaves: List[Dict[str, Any]] = []
        canonical_leaf_bytes_list: List[bytes] = []
        alice_votes = 0
        bob_votes = 0
        cts_accum: Dict[str, List[ElGamalCiphertext]] = {c: [] for c in candidates}

        for i in range(num_ballots):
            chosen_cand = "cand_alice" if i % 2 == 0 else "cand_bob"
            if chosen_cand == "cand_alice":
                alice_votes += 1
            else:
                bob_votes += 1

            nullifier = f"sha256:{hashlib.sha256(f'nullifier_{i}'.encode('utf_8')).hexdigest()}"
            binding_msg = f"{self.election_id}:{manifest_digest}:{nullifier}".encode("utf_8")
            cred_sig = self.issuer_priv.sign(binding_msg)
            cred_proof_b64url = base64.urlsafe_b64encode(cred_sig).decode("utf_8")

            b_data, p_data, _ = create_encrypted_ballot(
                election_id=self.election_id,
                manifest_digest=manifest_digest,
                candidates=candidates,
                selected_candidate_id=chosen_cand,
                joint_public_key=joint_pk,
            )

            for c_entry in b_data["ciphertexts"]:
                cts_accum[c_entry["candidate_id"]].append(ElGamalCiphertext.from_dict(c_entry))

            leaf = {
                "schema": "himvote.ballot_evidence.v1",
                "election_id": self.election_id,
                "manifest_digest": manifest_digest,
                "ballot_id": f"ballot_{i:016d}",
                "leaf_index": i,
                "credential_nullifier": nullifier,
                "credential_proof_b64url": cred_proof_b64url,
                "engine_ballot_b64url": base64.urlsafe_b64encode(canonicalize_json(b_data)).decode("utf_8"),
                "engine_proofs_b64url": base64.urlsafe_b64encode(canonicalize_json(p_data)).decode("utf_8"),
                "engine_record_version": "electionguard_1.0.0",
            }
            c_leaf = canonicalize_json(leaf)
            canonical_leaf_bytes_list.append(c_leaf)
            leaves.append(leaf)

        with open(os.path.join(export_dir, "leaves.json"), "wb") as f:
            f.write(canonicalize_json(leaves))

        # Accumulate ciphertexts homomorphically
        agg_a: Dict[str, int] = {}
        agg_b: Dict[str, int] = {}
        for c_id in candidates:
            cur_a = 1
            cur_b = 1
            for ct in cts_accum[c_id]:
                cur_a = (cur_a * ct.a) % P
                cur_b = (cur_b * ct.b) % P
            agg_a[c_id] = cur_a
            agg_b[c_id] = cur_b

        # Compute trustee decryption shares and DLEQ proofs
        trustee_proofs = {"trustees": []}
        for t_obj in [t1, t2]:
            t_shares = {}
            for c_id in candidates:
                share_val = pow(agg_a[c_id], t_obj.secret_key, P)
                dleq = prove_dleq(
                    manifest_digest=manifest_digest,
                    election_id=self.election_id,
                    trustee_id=t_obj.trustee_id,
                    candidate_id=c_id,
                    public_key_share=t_obj.public_key_share,
                    aggregated_a=agg_a[c_id],
                    decryption_share=share_val,
                    secret_key_share=t_obj.secret_key,
                )
                t_shares[c_id] = {
                    "share": hex(share_val),
                    "dleq_proof": dleq.to_dict(),
                }
            trustee_proofs["trustees"].append({
                "trustee_id": t_obj.trustee_id,
                "public_key_share": hex(t_obj.public_key_share),
                "decryption_shares": t_shares,
            })

        tally_data = {
            "schema": "himvote.results.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "contest_tallies": {"cand_alice": alice_votes, "cand_bob": bob_votes},
            "total_ballots": num_ballots,
            "trustee_decryptions": trustee_proofs,
        }
        with open(os.path.join(export_dir, "results.json"), "wb") as f:
            f.write(canonicalize_json(tally_data))

        # Merkle tree
        merkle_root = compute_rfc9162_merkle_root(canonical_leaf_bytes_list)
        merkle_root_hex = f"sha256:{merkle_root.hex()}"
        last_leaf_digest = format_digest(b"\x00" + canonical_leaf_bytes_list[-1]) if canonical_leaf_bytes_list else ""

        checkpoint_core = {
            "schema": "himvote.checkpoint.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "tree_size": num_ballots,
            "merkle_root": merkle_root_hex,
            "previous_checkpoint_digest": None,
            "last_leaf_index": num_ballots - 1 if num_ballots > 0 else -1,
            "last_leaf_digest": last_leaf_digest,
            "issued_count": num_ballots,
            "issuance_ledger_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "roster_commitment": roster_commitment,
            "protocol_version": "himvote_2.0.0",
            "checkpoint_kind": "FINAL",
            "checkpoint_sequence": 1,
            "witness_key_id": "key_witness_01",
        }
        cp_sig = self.witness_priv.sign(canonicalize_json(checkpoint_core))
        checkpoint_full = dict(checkpoint_core)
        checkpoint_full["signature"] = base64.b64encode(cp_sig).decode("utf_8")
        final_path = os.path.join(bundle_dir, "final_checkpoint.json")
        with open(final_path, "wb") as f:
            f.write(canonicalize_json(checkpoint_full))

        checkpoint_digest = format_digest(canonicalize_json(checkpoint_core))

        chain_core = {
            "schema": "himvote.chain_anchor.v1",
            "chain_id": self.chain_id,
            "contract_address": self.contract_address,
            "code_hash": self.code_hash,
            "block_number": 100,
            "block_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "confirmations": 12,
            "is_final": True,
            "anchored_digest": checkpoint_digest,
            "previous_anchored_digest": None,
            "election_commitment": manifest_digest,
            "sequence": 1,
            "relayer_address": "0x0000000000000000000000000000000000000001",
        }
        chain_path = os.path.join(bundle_dir, "chain_anchor.json")
        with open(chain_path, "wb") as f:
            f.write(canonicalize_json(chain_core))

        trust_path = os.path.join(bundle_dir, "trust_pins.json")
        with open(trust_path, "wb") as f:
            f.write(canonicalize_json(self.build_trust_pins()))

        report_path = os.path.join(bundle_dir, "report.json")

        return {
            "bundle_dir": bundle_dir,
            "export": export_dir,
            "export_dir": export_dir,
            "trust": trust_path,
            "final": final_path,
            "roster": roster_path,
            "issuance": issuance_path,
            "chain": chain_path,
            "report": report_path,
            "manifest_digest": manifest_digest,
        }

    def build_rsa_blind_credential_bundle(
        self,
        num_ballots: int = 3,
        use_rsabssa: bool = True,
    ) -> Dict[str, Any]:
        """Construct election bundle with RSA blind signed credentials."""
        bundle_dir = tempfile.mkdtemp(prefix="bundle_rsa_", dir=str(self.base_dir))
        export_dir = os.path.join(bundle_dir, "export")
        os.makedirs(export_dir, exist_ok=True)

        roster_commitment = "sha256:2222222222222222222222222222222222222222222222222222222222222222"
        eligible_count = 100

        rsa_priv, rsa_pub = generate_rsa_keypair(key_size=2048)
        rsa_pub_pem = rsa_pub.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf_8")

        manifest_core = {
            "schema": "himvote.manifest.v1",
            "election_id": self.election_id,
            "contest": "General Election",
            "candidate_ids": ["cand_alice", "cand_bob"],
            "selection_rule": "plurality",
            "roster_version": 1,
            "roster_commitment": roster_commitment,
            "public_eligible_count": eligible_count,
            "issuer_key_id": "key_issuer_rsa_01",
            "engine_name": "electionguard",
            "engine_version": "1.0.0",
            "trustees": ["trustee_1"],
            "log_key_id": "key_log_01",
            "witness_keys": ["key_witness_01"],
            "auditor_key_fingerprint": "sha256:auditor_fp",
            "issuance_start_utc": "2026_10_30T08:00:00Z",
            "issuance_cutoff_utc": "2026_10_30T10:00:00Z",
            "opens_at_utc": "2026_10_30T10:00:00Z",
            "closes_at_utc": "2026_10_30T18:00:00Z",
            "minimum_anonymity_policy": 10,
            "verifier_version": "2.0.0",
            "anchor_policy": "required_before_publication",
        }
        manifest_bytes = canonicalize_json(manifest_core)
        manifest_digest = format_digest(manifest_bytes)
        manifest_full = dict(manifest_core)
        manifest_full["manifest_digest"] = manifest_digest

        with open(os.path.join(export_dir, "manifest.json"), "wb") as f:
            f.write(canonicalize_json(manifest_full))

        roster_approval_core = {
            "schema": "himvote.roster_approval.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "roster_version": 1,
            "roster_commitment": roster_commitment,
            "eligible_count": eligible_count,
            "approver_key_id": "key_roster_01",
        }
        roster_sig = self.roster_priv.sign(canonicalize_json(roster_approval_core))
        roster_approval_full = dict(roster_approval_core)
        roster_approval_full["signature"] = base64.b64encode(roster_sig).decode("utf_8")
        roster_path = os.path.join(bundle_dir, "roster_approval.json")
        with open(roster_path, "wb") as f:
            f.write(canonicalize_json(roster_approval_full))

        # Issuance closure signed with RSA
        issuance_closure_core = {
            "schema": "himvote.issuance_closure.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "issued_count": num_ballots,
            "issuance_ledger_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "closed_at_utc": "2026_10_30T09:59:00Z",
            "issuer_key_id": "key_issuer_rsa_01",
        }
        iss_sig = rsa_priv.sign(canonicalize_json(issuance_closure_core), padding.PKCS1v15(), hashes.SHA256())
        issuance_closure_full = dict(issuance_closure_core)
        issuance_closure_full["signature"] = base64.b64encode(iss_sig).decode("utf_8")
        issuance_path = os.path.join(bundle_dir, "issuance_closure.json")
        with open(issuance_path, "wb") as f:
            f.write(canonicalize_json(issuance_closure_full))

        leaves: List[Dict[str, Any]] = []
        canonical_leaf_bytes_list: List[bytes] = []
        alice_votes = 0
        bob_votes = 0

        for i in range(num_ballots):
            cand = "cand_alice" if i % 2 == 0 else "cand_bob"
            if cand == "cand_alice":
                alice_votes += 1
            else:
                bob_votes += 1

            voter_token = f"token_secret_{i}"
            if use_rsabssa:
                blinded_msg, secret, prepared = client_blind(
                    rsa_pub,
                    voter_token.encode("utf_8"),
                    variant=RSABSSAVariant.RSABSSA_SHA384_PSS_RANDOMIZED,
                )
                blind_sig = server_blind_sign(rsa_priv, blinded_msg)
                sig = client_finalize(rsa_pub, prepared, blind_sig, secret)
                nullifier = f"sha256:{hashlib.sha256(f'himvote_nullifier_v1:{self.election_id}:{voter_token}'.encode('utf_8')).hexdigest()}"
                cred_proof = {
                    "election_id": self.election_id,
                    "manifest_digest": manifest_digest,
                    "voter_token": voter_token,
                    "prepared_msg": base64.b64encode(prepared).decode("utf_8"),
                    "signature": base64.b64encode(sig).decode("utf_8"),
                    "variant": "RSABSSA_SHA384_PSS_RANDOMIZED",
                }
            else:
                m_int = int.from_bytes(hashlib.sha256(voter_token.encode("utf_8")).digest(), "big") % rsa_pub.public_numbers().n
                sig_int = pow(m_int, rsa_priv.private_numbers().d, rsa_pub.public_numbers().n)
                nullifier = f"sha256:{hashlib.sha256(f'himvote_nullifier_v1:{self.election_id}:{voter_token}'.encode('utf_8')).hexdigest()}"
                cred_proof = {
                    "election_id": self.election_id,
                    "manifest_digest": manifest_digest,
                    "voter_token": voter_token,
                    "signature": hex(sig_int),
                }

            cred_proof_b64url = base64.urlsafe_b64encode(canonicalize_json(cred_proof)).decode("utf_8")

            ballot_payload = {
                "contest_id": "General Election",
                "selections": {cand: 1},
                "ballot_serial": f"serial_{i}",
            }
            engine_ballot_b64url = base64.urlsafe_b64encode(canonicalize_json(ballot_payload)).decode("utf_8")
            engine_proofs_b64url = base64.urlsafe_b64encode(canonicalize_json({"zkp_valid": True, "ballot_index": i})).decode("utf_8")

            leaf = {
                "schema": "himvote.ballot_evidence.v1",
                "election_id": self.election_id,
                "manifest_digest": manifest_digest,
                "ballot_id": f"ballot_{i:016d}",
                "leaf_index": i,
                "credential_nullifier": nullifier,
                "credential_proof_b64url": cred_proof_b64url,
                "engine_ballot_b64url": engine_ballot_b64url,
                "engine_proofs_b64url": engine_proofs_b64url,
                "engine_record_version": "electionguard_1.0.0",
            }
            c_leaf = canonicalize_json(leaf)
            canonical_leaf_bytes_list.append(c_leaf)
            leaves.append(leaf)

        with open(os.path.join(export_dir, "leaves.json"), "wb") as f:
            f.write(canonicalize_json(leaves))

        tally_data = {
            "schema": "himvote.tally.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "contest_tallies": {"cand_alice": alice_votes, "cand_bob": bob_votes},
            "total_ballots": num_ballots,
        }
        with open(os.path.join(export_dir, "results.json"), "wb") as f:
            f.write(canonicalize_json(tally_data))

        merkle_root = compute_rfc9162_merkle_root(canonical_leaf_bytes_list)
        merkle_root_hex = f"sha256:{merkle_root.hex()}"
        last_leaf_digest = format_digest(b"\x00" + canonical_leaf_bytes_list[-1]) if canonical_leaf_bytes_list else ""

        checkpoint_core = {
            "schema": "himvote.checkpoint.v1",
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "tree_size": num_ballots,
            "merkle_root": merkle_root_hex,
            "previous_checkpoint_digest": None,
            "last_leaf_index": num_ballots - 1 if num_ballots > 0 else -1,
            "last_leaf_digest": last_leaf_digest,
            "issued_count": num_ballots,
            "issuance_ledger_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            "roster_commitment": roster_commitment,
            "protocol_version": "himvote_2.0.0",
            "checkpoint_kind": "FINAL",
            "checkpoint_sequence": 1,
            "witness_key_id": "key_witness_01",
        }
        cp_sig = self.witness_priv.sign(canonicalize_json(checkpoint_core))
        checkpoint_full = dict(checkpoint_core)
        checkpoint_full["signature"] = base64.b64encode(cp_sig).decode("utf_8")
        final_path = os.path.join(bundle_dir, "final_checkpoint.json")
        with open(final_path, "wb") as f:
            f.write(canonicalize_json(checkpoint_full))

        checkpoint_digest = format_digest(canonicalize_json(checkpoint_core))

        chain_core = {
            "schema": "himvote.chain_anchor.v1",
            "chain_id": self.chain_id,
            "contract_address": self.contract_address,
            "code_hash": self.code_hash,
            "block_number": 100,
            "block_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "confirmations": 12,
            "is_final": True,
            "anchored_digest": checkpoint_digest,
            "previous_anchored_digest": None,
            "election_commitment": manifest_digest,
            "sequence": 1,
            "relayer_address": "0x0000000000000000000000000000000000000001",
        }
        chain_path = os.path.join(bundle_dir, "chain_anchor.json")
        with open(chain_path, "wb") as f:
            f.write(canonicalize_json(chain_core))

        # Trust pins with RSA issuer key
        if use_rsabssa:
            issuer_key_pin = {
                "key_id": "key_issuer_rsa_01",
                "algorithm": "RSA",
                "public_key_pem": rsa_pub_pem,
            }
        else:
            issuer_key_pin = {
                "key_id": "key_issuer_rsa_01",
                "algorithm": "RSA",
                "n": hex(rsa_pub.public_numbers().n),
                "e": rsa_pub.public_numbers().e,
            }

        trust_pins = {
            "schema": "himvote.trust_pins.v1",
            "election_id": self.election_id,
            "roster_approver_key": {
                "key_id": "key_roster_01",
                "algorithm": "Ed25519",
                "public_key_pem": self.roster_pub_pem,
            },
            "issuer_key": issuer_key_pin,
            "witness_keys": [
                {
                    "key_id": "key_witness_01",
                    "algorithm": "Ed25519",
                    "public_key_pem": self.witness_pub_pem,
                }
            ],
            "auditor_key": {
                "key_id": "key_auditor_01",
                "algorithm": "Ed25519",
                "public_key_pem": self.auditor_pub_pem,
            },
            "chain": {
                "chain_id": self.chain_id,
                "contract_address": self.contract_address,
                "code_hash": self.code_hash,
                "min_confirmations": 6,
            },
        }

        trust_path = os.path.join(bundle_dir, "trust_pins.json")
        with open(trust_path, "wb") as f:
            f.write(canonicalize_json(trust_pins))

        report_path = os.path.join(bundle_dir, "report.json")

        return {
            "bundle_dir": bundle_dir,
            "export": export_dir,
            "export_dir": export_dir,
            "trust": trust_path,
            "final": final_path,
            "roster": roster_path,
            "issuance": issuance_path,
            "chain": chain_path,
            "report": report_path,
            "manifest_digest": manifest_digest,
        }


@pytest.fixture
def election_helper(tmp_path_factory) -> ElectionFixtureHelper:
    return ElectionFixtureHelper(tmp_path_factory)


def test_canonical_json_rfc8785() -> None:
    """Test RFC 8785 JSON canonicalization implementation."""
    # Test dictionary key ordering by UTF 16 code units
    data = {"z": 1, "a": 2, "m": 3}
    canonical = canonicalize_json(data)
    assert canonical == b'{"a":2,"m":3,"z":1}'

    # Test nested sorting and types
    complex_data = {
        "b": [3, 1, 2],
        "a": {"y": False, "x": True, "n": None},
        "c": "simple text",
    }
    canon_complex = canonicalize_json(complex_data)
    assert canon_complex == b'{"a":{"n":null,"x":true,"y":false},"b":[3,1,2],"c":"simple text"}'

    # Test float rejection
    with pytest.raises(BadArchiveError):
        canonicalize_json({"float_value": 3.1415})


def test_safe_json_loads_duplicate_key_rejection() -> None:
    """Test parser safety: reject duplicate JSON keys."""
    raw_dup = '{"key": 1, "key": 2}'
    with pytest.raises(BadArchiveError) as exc_info:
        safe_json_loads(raw_dup)
    assert "Duplicate JSON key detected" in str(exc_info.value)


def test_safe_json_loads_float_rejection() -> None:
    """Test parser safety: reject float values in JSON."""
    raw_float = '{"amount": 12.34}'
    with pytest.raises(BadArchiveError) as exc_info:
        safe_json_loads(raw_float)
    assert "Floats not permitted" in str(exc_info.value)


def test_rfc9162_merkle_tree() -> None:
    """Test RFC 9162 Merkle tree hash algorithm."""
    # Zero leaves
    root_0 = compute_rfc9162_merkle_root([])
    assert root_0 == hashlib.sha256(b"").digest()

    # Single leaf
    leaf_0 = b"leaf_payload_0"
    root_1 = compute_rfc9162_merkle_root([leaf_0])
    assert root_1 == hashlib.sha256(b"\x00" + leaf_0).digest()

    # Two leaves
    leaf_1 = b"leaf_payload_1"
    root_2 = compute_rfc9162_merkle_root([leaf_0, leaf_1])
    h0 = hashlib.sha256(b"\x00" + leaf_0).digest()
    h1 = hashlib.sha256(b"\x00" + leaf_1).digest()
    assert root_2 == hashlib.sha256(b"\x01" + h0 + h1).digest()


def test_audit_evidence_happy_path(election_helper: ElectionFixtureHelper) -> None:
    """Test complete verification flow on valid election package: exit code 0."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_PASS
    assert report["overall_status"] == STATUS_PASS
    assert len(report["failure_reasons"]) == 0

    # Verify all 11 required properties exist
    properties = report["properties"]
    assert properties[PROPERTY_RECORD_INTEGRITY]["status"] == STATUS_PASS
    assert properties[PROPERTY_CREDENTIAL_UNIQUENESS]["status"] == STATUS_PASS
    assert properties[PROPERTY_ROSTER_ATTESTATION]["status"] == STATUS_PASS
    assert properties[PROPERTY_TALLY_PROOF]["status"] == STATUS_PASS
    assert properties[PROPERTY_ANCHOR_FINALITY]["status"] == STATUS_PASS

    # Verify report was written to destination
    assert os.path.exists(bundle["report"])
    written_data = safe_json_loads(open(bundle["report"], "rb").read())
    assert written_data["overall_status"] == STATUS_PASS


def test_audit_evidence_zip_archive(election_helper: ElectionFixtureHelper) -> None:
    """Test verification on zipped archive export: exit code 0."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3, export_as_archive=True)
    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_PASS
    assert report["overall_status"] == STATUS_PASS


def test_verify_attestation_happy_path(election_helper: ElectionFixtureHelper) -> None:
    """Test auditor attestation verification flow: exit code 0."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )
    assert exit_code == EXIT_PASS

    # Auditor signs the canonical report
    report_bytes = canonicalize_json(report)
    report_digest = format_digest(report_bytes)
    attestation_core = {
        "schema": "himvote.auditor_attestation.v1",
        "election_id": election_helper.election_id,
        "report_digest": report_digest,
        "auditor_key_id": "key_auditor_01",
        "attestation_timestamp_utc": "2026_10_30T14:00:00Z",
    }
    auditor_sig = election_helper.auditor_priv.sign(canonicalize_json(attestation_core))
    attestation_full = dict(attestation_core)
    attestation_full["signature"] = base64.b64encode(auditor_sig).decode("utf_8")

    attestation_path = os.path.join(bundle["bundle_dir"], "attestation.json")
    with open(attestation_path, "wb") as f:
        f.write(canonicalize_json(attestation_full))

    attest_exit = verify_attestation(
        report_path=bundle["report"],
        attestation_path=attestation_path,
        trust_path=bundle["trust"],
    )
    assert attest_exit == EXIT_PASS


def test_verify_attestation_bad_signature(election_helper: ElectionFixtureHelper) -> None:
    """Test auditor attestation with invalid signature: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    attestation_data = {
        "schema": "himvote.auditor_attestation.v1",
        "election_id": election_helper.election_id,
        "report_digest": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        "auditor_key_id": "key_auditor_01",
        "attestation_timestamp_utc": "2026_10_30T14:00:00Z",
        "signature": base64.b64encode(b"invalid_signature_bytes_12345678").decode("utf_8"),
    }
    attestation_path = os.path.join(bundle["bundle_dir"], "bad_attestation.json")
    with open(attestation_path, "wb") as f:
        f.write(canonicalize_json(attestation_data))

    with pytest.raises(CryptoAuthError):
        verify_attestation(
            report_path=bundle["report"],
            attestation_path=attestation_path,
            trust_path=bundle["trust"],
        )


def test_tamper_drill_modified_leaf(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: modify one byte of a leaf record: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    leaves_file = os.path.join(bundle["export_dir"], "leaves.json")
    leaves = safe_json_loads(open(leaves_file, "rb").read())

    # Tamper with leaf 0
    leaves[0]["ballot_id"] = "ballot_tampered_000001"
    with open(leaves_file, "wb") as f:
        f.write(canonicalize_json(leaves))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_RECORD_INTEGRITY]["status"] == STATUS_FAIL


def test_tamper_drill_tally_mismatch(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: change announced candidate totals: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    results_file = os.path.join(bundle["export_dir"], "results.json")
    tally = safe_json_loads(open(results_file, "rb").read())

    # Change count
    tally["contest_tallies"]["cand_alice"] += 10
    with open(results_file, "wb") as f:
        f.write(canonicalize_json(tally))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_TALLY_PROOF]["status"] == STATUS_FAIL


def test_tamper_drill_duplicate_nullifier(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: duplicate credential nullifier across leaves: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    leaves_file = os.path.join(bundle["export_dir"], "leaves.json")
    leaves = safe_json_loads(open(leaves_file, "rb").read())

    # Duplicate nullifier of leaf 0 into leaf 1
    leaves[1]["credential_nullifier"] = leaves[0]["credential_nullifier"]
    with open(leaves_file, "wb") as f:
        f.write(canonicalize_json(leaves))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_CREDENTIAL_UNIQUENESS]["status"] == STATUS_FAIL


def test_tamper_drill_leaf_gap(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: gap in leaf index sequence: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    leaves_file = os.path.join(bundle["export_dir"], "leaves.json")
    leaves = safe_json_loads(open(leaves_file, "rb").read())

    # Change index of leaf 1 to 3 creating gap
    leaves[1]["leaf_index"] = 3
    with open(leaves_file, "wb") as f:
        f.write(canonicalize_json(leaves))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["properties"][PROPERTY_RECORD_INTEGRITY]["status"] == STATUS_FAIL


def test_tamper_drill_truncated_leaves(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: missing leaf from export: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    leaves_file = os.path.join(bundle["export_dir"], "leaves.json")
    leaves = safe_json_loads(open(leaves_file, "rb").read())

    # Remove last leaf
    leaves.pop()
    with open(leaves_file, "wb") as f:
        f.write(canonicalize_json(leaves))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["properties"][PROPERTY_RECORD_INTEGRITY]["status"] == STATUS_FAIL


def test_tamper_drill_bad_witness_signature(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: forge witness checkpoint signature: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    final_file = bundle["final"]
    cp = safe_json_loads(open(final_file, "rb").read())

    cp["signature"] = base64.b64encode(b"forged_witness_signature_123456").decode("utf_8")
    with open(final_file, "wb") as f:
        f.write(canonicalize_json(cp))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["properties"][PROPERTY_RECORD_INTEGRITY]["status"] == STATUS_FAIL


def test_tamper_drill_wrong_chain_id(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill: chain anchor points to wrong chain ID: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    chain_file = bundle["chain"]
    chain_anchor = safe_json_loads(open(chain_file, "rb").read())

    chain_anchor["chain_id"] = 9999
    with open(chain_file, "wb") as f:
        f.write(canonicalize_json(chain_anchor))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["properties"][PROPERTY_ANCHOR_FINALITY]["status"] == STATUS_FAIL


def test_unverifiable_unfinalized_chain(election_helper: ElectionFixtureHelper) -> None:
    """Unverifiable case: chain anchor is not marked final: exit code 3."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    chain_file = bundle["chain"]
    chain_anchor = safe_json_loads(open(chain_file, "rb").read())

    chain_anchor["is_final"] = False
    chain_anchor["confirmations"] = 1
    with open(chain_file, "wb") as f:
        f.write(canonicalize_json(chain_anchor))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_UNVERIFIABLE
    assert report["overall_status"] == STATUS_UNVERIFIABLE
    assert report["properties"][PROPERTY_ANCHOR_FINALITY]["status"] == STATUS_UNVERIFIABLE


def test_parser_safety_path_traversal(election_helper: ElectionFixtureHelper) -> None:
    """Parser safety: reject archive containing path traversal: exit code 4."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=1)
    bad_zip = os.path.join(bundle["bundle_dir"], "evil_traversal.zip")

    with zipfile.ZipFile(bad_zip, "w") as zf:
        zf.writestr("../evil_file.txt", "payload")

    with pytest.raises(BadArchiveError) as exc_info:
        audit_evidence(
            export_path=bad_zip,
            trust_path=bundle["trust"],
            final_path=bundle["final"],
            roster_path=bundle["roster"],
            issuance_path=bundle["issuance"],
            chain_path=bundle["chain"],
            report_path=bundle["report"],
        )
    assert "Path traversal detected" in str(exc_info.value)


def test_parser_safety_symlink(election_helper: ElectionFixtureHelper) -> None:
    """Parser safety: reject archive containing symlinks: exit code 4."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=1)
    bad_zip = os.path.join(bundle["bundle_dir"], "evil_symlink.zip")

    with zipfile.ZipFile(bad_zip, "w") as zf:
        zi = zipfile.ZipInfo("symlink_entry")
        zi.create_system = 3
        zi.external_attr = 0o120777 << 16
        zf.writestr(zi, "target_file")

    with pytest.raises(BadArchiveError) as exc_info:
        audit_evidence(
            export_path=bad_zip,
            trust_path=bundle["trust"],
            final_path=bundle["final"],
            roster_path=bundle["roster"],
            issuance_path=bundle["issuance"],
            chain_path=bundle["chain"],
            report_path=bundle["report"],
        )
    assert "Symlinks are prohibited" in str(exc_info.value)


def test_cli_main_audit_evidence(election_helper: ElectionFixtureHelper) -> None:
    """Test CLI entry point with audit_evidence arguments."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    argv = [
        "audit_evidence",
        "--export", bundle["export"],
        "--trust", bundle["trust"],
        "--final", bundle["final"],
        "--roster", bundle["roster"],
        "--issuance", bundle["issuance"],
        "--chain", bundle["chain"],
        "--report", bundle["report"],
    ]
    ret = main(argv)
    assert ret == EXIT_PASS


def test_cli_main_verify_inclusion(election_helper: ElectionFixtureHelper) -> None:
    """Verify a tracker against the exported leaf and signed final root."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    leaves = safe_json_loads(open(os.path.join(bundle["export_dir"], "leaves.json"), "rb").read())
    canonical_leaves = [canonicalize_json(item) for item in leaves]
    leaf_hashes = [hashlib.sha256(b"\x00" + item).digest() for item in canonical_leaves]
    tracker_path = os.path.join(bundle["bundle_dir"], "tracker.json")
    tracker = {
        "schema": "himvote.inclusion_tracker.v1",
        "election_id": election_helper.election_id,
        "manifest_digest": bundle["manifest_digest"],
        "leaf_index": 0,
        "leaf_digest": format_digest(b"\x00" + canonical_leaves[0]),
        "audit_path": [
            {"hash": f"sha256:{leaf_hashes[1].hex()}", "position": "right"},
            {"hash": f"sha256:{leaf_hashes[2].hex()}", "position": "right"},
        ],
        "root": f"sha256:{compute_rfc9162_merkle_root(canonical_leaves).hex()}",
    }
    with open(tracker_path, "wb") as stream:
        stream.write(canonicalize_json(tracker))

    ret = main(
        [
            "verify",
            "--archive",
            bundle["export"],
            "--trust",
            bundle["trust"],
            "--final",
            bundle["final"],
            "--verify-inclusion",
            tracker_path,
            "--report",
            bundle["report"],
        ]
    )

    assert ret == EXIT_PASS
    report = safe_json_loads(open(bundle["report"], "rb").read())
    assert report["status"] == STATUS_PASS


def test_homomorphic_tally_with_trustee_proofs(election_helper: ElectionFixtureHelper) -> None:
    """Verify homomorphic encrypted ballots with trustee decryption proofs in results JSON."""
    bundle = election_helper.build_homomorphic_election_bundle(num_ballots=3)
    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_PASS
    assert report["overall_status"] == STATUS_PASS
    assert len(report["failure_reasons"]) == 0
    assert report["properties"][PROPERTY_TALLY_PROOF]["status"] == STATUS_PASS


def test_homomorphic_tally_tampered_trustee_proof(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill with corrupted trustee DLEQ decryption proof: exit code 2."""
    bundle = election_helper.build_homomorphic_election_bundle(num_ballots=3)
    results_path = os.path.join(bundle["export_dir"], "results.json")
    results_data = safe_json_loads(open(results_path, "rb").read())

    # Corrupt response in trustee 0 DLEQ proof for cand_alice
    proof_obj = results_data["trustee_decryptions"]["trustees"][0]["decryption_shares"]["cand_alice"]["dleq_proof"]
    orig_z = proof_obj["z"]
    flipped_char = "0" if orig_z[-1] != "0" else "1"
    proof_obj["z"] = orig_z[:-1] + flipped_char

    with open(results_path, "wb") as f:
        f.write(canonicalize_json(results_data))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_TALLY_PROOF]["status"] == STATUS_FAIL
    assert FAIL_INVALID_TALLY in report["failure_reasons"]


def test_encrypted_ballots_missing_trustee_proofs(election_helper: ElectionFixtureHelper) -> None:
    """Encrypted ballots present but trustee decryption proofs missing: exit code 2."""
    bundle = election_helper.build_homomorphic_election_bundle(num_ballots=3)
    results_path = os.path.join(bundle["export_dir"], "results.json")
    results_data = safe_json_loads(open(results_path, "rb").read())

    # Remove trustee decryptions from results
    results_data.pop("trustee_decryptions", None)

    with open(results_path, "wb") as f:
        f.write(canonicalize_json(results_data))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_TALLY_PROOF]["status"] == STATUS_FAIL
    assert FAIL_INVALID_TALLY in report["failure_reasons"]


def test_rfc9474_rsabssa_credential_verification(election_helper: ElectionFixtureHelper) -> None:
    """Verify credential proofs using RFC 9474 RSABSSA blind signatures: exit code 0."""
    bundle = election_helper.build_rsa_blind_credential_bundle(num_ballots=3, use_rsabssa=True)
    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_PASS
    assert report["overall_status"] == STATUS_PASS
    assert len(report["failure_reasons"]) == 0
    assert report["properties"][PROPERTY_CREDENTIAL_UNIQUENESS]["status"] == STATUS_PASS


def test_rfc9474_rsabssa_bad_signature(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill with forged RSABSSA signature: exit code 2."""
    bundle = election_helper.build_rsa_blind_credential_bundle(num_ballots=3, use_rsabssa=True)
    leaves_path = os.path.join(bundle["export_dir"], "leaves.json")
    leaves_data = safe_json_loads(open(leaves_path, "rb").read())

    # Corrupt signature in leaf 0
    proof_bytes = decode_signature_bytes(leaves_data[0]["credential_proof_b64url"])
    proof_dict = safe_json_loads(proof_bytes)
    sig_raw = base64.b64decode(proof_dict["signature"])
    bad_sig = bytearray(sig_raw)
    bad_sig[10] ^= 0xFF
    proof_dict["signature"] = base64.b64encode(bytes(bad_sig)).decode("utf_8")
    leaves_data[0]["credential_proof_b64url"] = base64.urlsafe_b64encode(canonicalize_json(proof_dict)).decode("utf_8")

    with open(leaves_path, "wb") as f:
        f.write(canonicalize_json(leaves_data))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_CREDENTIAL_UNIQUENESS]["status"] == STATUS_FAIL
    assert FAIL_BAD_SIGNATURE in report["failure_reasons"]


def test_scalar_rsa_blind_credential_verification(election_helper: ElectionFixtureHelper) -> None:
    """Verify credential proofs using scalar RSA blind signatures: exit code 0."""
    bundle = election_helper.build_rsa_blind_credential_bundle(num_ballots=3, use_rsabssa=False)
    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_PASS
    assert report["overall_status"] == STATUS_PASS
    assert len(report["failure_reasons"]) == 0
    assert report["properties"][PROPERTY_CREDENTIAL_UNIQUENESS]["status"] == STATUS_PASS


def test_ed25519_credential_bad_signature(election_helper: ElectionFixtureHelper) -> None:
    """Tamper drill with forged Ed25519 credential signature: exit code 2."""
    bundle = election_helper.build_valid_election_bundle(num_ballots=3)
    leaves_path = os.path.join(bundle["export_dir"], "leaves.json")
    leaves_data = safe_json_loads(open(leaves_path, "rb").read())

    # Corrupt Ed25519 signature in leaf 0
    sig_raw = decode_signature_bytes(leaves_data[0]["credential_proof_b64url"])
    bad_sig = bytearray(sig_raw)
    bad_sig[5] ^= 0xFF
    leaves_data[0]["credential_proof_b64url"] = base64.urlsafe_b64encode(bytes(bad_sig)).decode("utf_8")

    with open(leaves_path, "wb") as f:
        f.write(canonicalize_json(leaves_data))

    exit_code, report = audit_evidence(
        export_path=bundle["export"],
        trust_path=bundle["trust"],
        final_path=bundle["final"],
        roster_path=bundle["roster"],
        issuance_path=bundle["issuance"],
        chain_path=bundle["chain"],
        report_path=bundle["report"],
    )

    assert exit_code == EXIT_CRYPTO_FAIL
    assert report["overall_status"] == STATUS_FAIL
    assert report["properties"][PROPERTY_CREDENTIAL_UNIQUENESS]["status"] == STATUS_FAIL
    assert FAIL_BAD_SIGNATURE in report["failure_reasons"]
