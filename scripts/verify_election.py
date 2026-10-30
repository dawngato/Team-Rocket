#!/usr/bin/env python3
"""
CAMPUS VAULT — Independent Election Verification Script
A standalone verification tool that operates independently of the web application.
Verifies Merkle root inclusion, digital signatures, ballot consistency, and tallies.
"""

import argparse
import json
import os
import sys
import hashlib
from typing import Dict, List, Any, Tuple

# Domain separation constants matching the cryptographic specification
LEAF_PREFIX = "CV:LEAF:v1:"
NODE_PREFIX = "CV:NODE:v1:"

def canonicalize_json(data: Dict[str, Any]) -> str:
    """Canonical JSON encoding with sorted keys and no whitespace around separators."""
    return json.dumps(data, sort_keys=True, separators=(',', ':'))

def hash_ballot_leaf(ballot: Dict[str, Any]) -> str:
    payload = {
        "ballotId": ballot["ballotId"],
        "candidateId": ballot["candidateId"],
        "electionId": ballot["electionId"],
        "receiptHash": ballot["receiptHash"],
        "version": ballot.get("version", "1.0")
    }
    canonical = canonicalize_json(payload)
    data = (LEAF_PREFIX + canonical).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def hash_internal_node(left: str, right: str) -> str:
    data = (NODE_PREFIX + left + right).encode('utf-8')
    return hashlib.sha256(data).hexdigest()

def build_merkle_root(leaf_hashes: List[str]) -> str:
    if not leaf_hashes:
        return hashlib.sha256(b"CV:EMPTY_TREE:v1:").hexdigest()

    current_layer = list(leaf_hashes)
    while len(current_layer) > 1:
        next_layer = []
        for i in range(0, len(current_layer), 2):
            left = current_layer[i]
            if i + 1 < len(current_layer):
                right = current_layer[i + 1]
            else:
                right = left # Odd leaf handling: pair with itself
            next_layer.append(hash_internal_node(left, right))
        current_layer = next_layer

    return current_layer[0]

def verify_ed25519_signature(public_key_pem: str, message: bytes, signature_hex: str) -> bool:
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ed25519

        public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        if not isinstance(public_key, ed25519.Ed25519PublicKey):
            print("  [!] Error: Provided key is not an Ed25519 public key")
            return False

        sig_bytes = bytes.fromhex(signature_hex)
        public_key.verify(sig_bytes, message)
        return True
    except Exception as e:
        print(f"  [!] Signature verification exception: {e}")
        return False

def run_verification(manifest_path: str, ballots_path: str, checkpoint_path: str, public_key_path: str) -> bool:
    print("=" * 64)
    print("       CAMPUS VAULT — INDEPENDENT ELECTION VERIFICATION")
    print("=" * 64)

    all_passed = True
    checks: List[Tuple[str, bool, str]] = []

    def record_check(name: str, passed: bool, reason: str = ""):
        nonlocal all_passed
        if not passed:
            all_passed = False
        checks.append((name, passed, reason))
        status_str = "\033[92mPASS\033[0m" if passed else "\033[91mFAIL\033[0m"
        print(f"[{status_str}] {name}")
        if not passed and reason:
            print(f"       └── Reason: {reason}")

    # 1. Load Files
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        record_check("Artifact loading (Manifest)", True)
    except Exception as e:
        record_check("Artifact loading (Manifest)", False, str(e))
        return False

    try:
        with open(checkpoint_path, 'r', encoding='utf-8') as f:
            checkpoint = json.load(f)
        record_check("Artifact loading (Checkpoint)", True)
    except Exception as e:
        record_check("Artifact loading (Checkpoint)", False, str(e))
        return False

    try:
        ballots: List[Dict[str, Any]] = []
        with open(ballots_path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                clean = line.strip()
                if clean:
                    ballots.append(json.loads(clean))
        record_check(f"Artifact loading (Ballots: {len(ballots)} records)", True)
    except Exception as e:
        record_check("Artifact loading (Ballots)", False, str(e))
        return False

    try:
        with open(public_key_path, 'r', encoding='utf-8') as f:
            public_key_pem = f.read().strip()
        record_check("Artifact loading (Auditor Public Key)", True)
    except Exception as e:
        record_check("Artifact loading (Auditor Public Key)", False, str(e))
        return False

    election_id = manifest.get("electionId", "")
    print(f"\nTarget Election ID: {election_id}")
    print(f"Election Title:      {manifest.get('title', 'Unknown')}\n")

    # 2. Manifest and Checkpoint consistency
    if checkpoint.get("electionId") != election_id:
        record_check("Election ID Consistency", False, f"Manifest ({election_id}) != Checkpoint ({checkpoint.get('electionId')})")
    else:
        record_check("Election ID Consistency", True)

    # 3. Checkpoint Digital Signature verification
    signable_checkpoint_data = {
        "ballotCount": checkpoint.get("ballotCount"),
        "createdAt": checkpoint.get("createdAt"),
        "electionId": checkpoint.get("electionId"),
        "keyId": checkpoint.get("keyId"),
        "merkleRoot": checkpoint.get("merkleRoot"),
        "previousCheckpointHash": checkpoint.get("previousCheckpointHash"),
        "sequenceNumber": checkpoint.get("sequenceNumber"),
        "state": checkpoint.get("state")
    }
    signable_message = canonicalize_json(signable_checkpoint_data).encode('utf-8')
    sig_hex = checkpoint.get("signature", "")
    sig_valid = verify_ed25519_signature(public_key_pem, signable_message, sig_hex)
    record_check("Checkpoint Digital Signature Verification", sig_valid, "Ed25519 signature invalid or forged")

    # 4. Ballot record integrity & Duplicate detection
    valid_candidate_ids = {c["id"] for c in manifest.get("candidates", [])}
    seen_ballot_ids = set()
    duplicate_ballots = []
    invalid_candidate_ballots = []
    recomputed_leaf_hashes: List[str] = []

    for ballot in ballots:
        bid = ballot.get("ballotId")
        if bid in seen_ballot_ids:
            duplicate_ballots.append(bid)
        seen_ballot_ids.add(bid)

        cid = ballot.get("candidateId")
        if cid not in valid_candidate_ids:
            invalid_candidate_ballots.append((bid, cid))

        leaf_hash = hash_ballot_leaf(ballot)
        recomputed_leaf_hashes.append(leaf_hash)

    record_check("Duplicate Ballot Identifier Check", len(duplicate_ballots) == 0, f"Found duplicates: {duplicate_ballots}")
    record_check("Candidate Reference Validation", len(invalid_candidate_ballots) == 0, f"Ballots reference invalid candidate IDs: {invalid_candidate_ballots}")

    # 5. Ballot Count Verification
    expected_ballot_count = checkpoint.get("ballotCount", -1)
    actual_count = len(ballots)
    record_check("Ballot Count Match", actual_count == expected_ballot_count, f"Actual ({actual_count}) != Checkpoint ({expected_ballot_count})")

    # 6. Merkle Root Reconstruction & Verification
    recomputed_root = build_merkle_root(recomputed_leaf_hashes)
    expected_root = checkpoint.get("merkleRoot", "")
    root_match = recomputed_root.lower() == expected_root.lower()
    record_check("Merkle Root Verification", root_match, f"Recomputed ({recomputed_root}) != Checkpoint ({expected_root})")

    # 7. Tally Recomputation and Comparison with Published Results
    published_tally = manifest.get("tally", {})
    recomputed_tally = {cid: 0 for cid in valid_candidate_ids}
    for ballot in ballots:
        cid = ballot.get("candidateId")
        if cid in recomputed_tally:
            recomputed_tally[cid] += 1

    tally_match = True
    mismatches = []
    for cid in valid_candidate_ids:
        pub = published_tally.get(cid, 0)
        recomp = recomputed_tally.get(cid, 0)
        if pub != recomp:
            tally_match = False
            mismatches.append(f"Candidate {cid}: published={pub}, recomputed={recomp}")

    record_check("Tally Recomputation Match", tally_match, "; ".join(mismatches))

    # Summary
    print("\n" + "=" * 64)
    if all_passed:
        print("          FINAL VERIFICATION RESULT: \033[92mVERIFIED (PASS)\033[0m")
        print("          All cryptographic commitments and tallies confirmed.")
        print("=" * 64)
        return True
    else:
        print("          FINAL VERIFICATION RESULT: \033[91mFAILED (REJECTED)\033[0m")
        print("          One or more cryptographic integrity checks failed.")
        print("=" * 64)
        return False

def main():
    parser = argparse.ArgumentParser(description="Campus Vault Standalone Independent Election Verifier")
    parser.add_argument("--manifest", required=True, help="Path to election_manifest.json")
    parser.add_argument("--ballots", required=True, help="Path to accepted_ballots.jsonl")
    parser.add_argument("--checkpoint", required=True, help="Path to signed_checkpoint.json")
    parser.add_argument("--public-key", required=True, help="Path to trusted_auditor_public_key.pem")

    args = parser.parse_args()

    success = run_verification(args.manifest, args.ballots, args.checkpoint, args.public_key)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
