#!/usr/bin/env python3
"""
End to end simulation script for HimVote institutional election platform.
Executes complete election lifecycle and asserts verification pass.
"""

import argparse
import base64
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

# Ensure repository root is on sys.path
current_file = Path(__file__).resolve()
fixtures_dir = current_file.parent
repo_root = fixtures_dir.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))


def canonicalize_json(obj: Any) -> bytes:
    """RFC 8785 JSON Canonicalization Scheme implementation in pure Python.
    Strictly orders dictionary keys by UTF 16 code units.
    Rejects floats to eliminate floating point serialization drift.
    """
    if obj is None:
        return b"null"
    if isinstance(obj, bool):
        return b"true" if obj else b"false"
    if isinstance(obj, int):
        return str(obj).encode("utf-8")
    if isinstance(obj, float):
        raise ValueError("Floats are prohibited in canonical records")
    if isinstance(obj, str):
        escaped = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        return escaped.encode("utf-8")
    if isinstance(obj, list):
        items = [canonicalize_json(x) for x in obj]
        return b"[" + b",".join(items) + b"]"
    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys(), key=lambda k: k.encode("utf-16-be"))
        pairs = []
        for k in sorted_keys:
            key_bytes = json.dumps(k, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            val_bytes = canonicalize_json(obj[k])
            pairs.append(key_bytes + b":" + val_bytes)
        return b"{" + b",".join(pairs) + b"}"
    raise TypeError(f"Unsupported data type for canonical serialization: {type(obj)}")


def format_digest(data: bytes) -> str:
    """Format SHA256 digest with standard prefix."""
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def compute_rfc9162_merkle_root(leaf_bytes_list: List[bytes]) -> bytes:
    """Compute RFC 9162 Merkle tree hash across a list of leaf canonical bytes.
    Prefix 0x00 is applied to single leaves.
    Prefix 0x01 is applied to internal node concatenations.
    Split point k is the largest power of two strictly less than n.
    """
    n = len(leaf_bytes_list)
    if n == 0:
        return hashlib.sha256(b"").digest()
    if n == 1:
        return hashlib.sha256(b"\x00" + leaf_bytes_list[0]).digest()
    k = 1 << ((n - 1).bit_length() - 1)
    left_root = compute_rfc9162_merkle_root(leaf_bytes_list[:k])
    right_root = compute_rfc9162_merkle_root(leaf_bytes_list[k:])
    return hashlib.sha256(b"\x01" + left_root + right_root).digest()


def export_public_key_pem(key: ed25519.Ed25519PublicKey) -> str:
    """Export Ed25519 public key as standard PEM string."""
    return key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")


def create_identity_schema(conn: sqlite3.Connection) -> None:
    """Create identity cluster tables in local SQLite database."""
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            domain TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS campuses (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            campus_id TEXT NOT NULL,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS role_definitions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS staff_profiles (
            id TEXT PRIMARY KEY,
            department_id TEXT NOT NULL,
            employee_id TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            role_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS student_profiles (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            department_id TEXT NOT NULL,
            campus_id TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS election_roster_snapshots (
            id TEXT PRIMARY KEY,
            election_id TEXT NOT NULL,
            roster_version INTEGER NOT NULL,
            digest TEXT NOT NULL,
            eligible_count INTEGER NOT NULL,
            signed_by TEXT,
            signed_at TEXT,
            signature TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS roster_members (
            election_id TEXT NOT NULL,
            roster_version INTEGER NOT NULL,
            student_id TEXT NOT NULL,
            department TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (election_id, roster_version, student_id)
        );

        CREATE TABLE IF NOT EXISTS credential_issuance_records (
            id TEXT PRIMARY KEY,
            election_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            blinded_request TEXT NOT NULL,
            request_digest TEXT NOT NULL,
            blind_signature_response TEXT,
            status TEXT NOT NULL DEFAULT 'DELIVERED',
            issuer_key_id TEXT NOT NULL,
            roster_version INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (election_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS issuance_events (
            id TEXT PRIMARY KEY,
            election_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


def create_casting_schema(conn: sqlite3.Connection) -> None:
    """Create casting cluster tables in local SQLite database."""
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS elections (
            id TEXT PRIMARY KEY,
            state TEXT NOT NULL DEFAULT 'DRAFT',
            manifest_digest TEXT,
            opens_at_utc TEXT,
            closes_at_utc TEXT,
            issuance_cutoff_utc TEXT,
            state_version INTEGER NOT NULL DEFAULT 0,
            next_leaf_index INTEGER NOT NULL DEFAULT 0,
            last_witnessed_tree_size INTEGER NOT NULL DEFAULT 0,
            final_tree_size INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS manifest_versions (
            id TEXT PRIMARY KEY,
            election_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            digest TEXT NOT NULL,
            manifest_json TEXT NOT NULL,
            signed_by TEXT,
            signed_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS contests (
            id TEXT PRIMARY KEY,
            election_id TEXT NOT NULL,
            title TEXT NOT NULL,
            selection_rule TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS candidates (
            id TEXT PRIMARY KEY,
            contest_id TEXT NOT NULL,
            name TEXT NOT NULL,
            department TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accepted_encrypted_ballots (
            leaf_index INTEGER PRIMARY KEY,
            election_id TEXT NOT NULL,
            ballot_id TEXT NOT NULL,
            credential_nullifier TEXT NOT NULL,
            credential_proof_b64url TEXT NOT NULL,
            engine_ballot_b64url TEXT NOT NULL,
            engine_proofs_b64url TEXT NOT NULL,
            engine_record_version TEXT NOT NULL,
            committed_at TEXT NOT NULL,
            UNIQUE (election_id, credential_nullifier),
            UNIQUE (election_id, leaf_index)
        );

        CREATE TABLE IF NOT EXISTS checkpoint_outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id TEXT NOT NULL,
            leaf_index INTEGER NOT NULL,
            checkpoint_bytes TEXT NOT NULL,
            checkpoint_digest TEXT NOT NULL,
            acknowledged INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS witness_acknowledgements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id TEXT NOT NULL,
            checkpoint_digest TEXT NOT NULL,
            witness_signature TEXT NOT NULL,
            witness_key_id TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            acknowledged_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS published_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id TEXT NOT NULL,
            manifest_digest TEXT NOT NULL,
            tally_json TEXT NOT NULL,
            total_ballots INTEGER NOT NULL,
            privacy_limited INTEGER NOT NULL DEFAULT 0,
            published_at TEXT NOT NULL,
            auditor_signature TEXT NOT NULL
        );
        """
    )
    conn.commit()


def seed_databases(
    identity_conn: sqlite3.Connection,
    casting_conn: sqlite3.Connection,
    seed_data: Dict[str, Any]
) -> None:
    """Populate initial records from seed data into local databases."""
    now_str = datetime.now(timezone.utc).isoformat()
    t = seed_data["tenant"]
    identity_conn.execute(
        "INSERT OR REPLACE INTO tenants (id, name, domain, created_at) VALUES (?, ?, ?, ?)",
        (t["id"], t["name"], t["domain"], now_str)
    )

    for c in seed_data["campuses"]:
        identity_conn.execute(
            "INSERT OR REPLACE INTO campuses (id, tenant_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)",
            (c["id"], c["tenant_id"], c["name"], c["code"], now_str)
        )

    for d in seed_data["departments"]:
        identity_conn.execute(
            "INSERT OR REPLACE INTO departments (id, campus_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)",
            (d["id"], d["campus_id"], d["name"], d["code"], now_str)
        )

    for r in seed_data["roles"]:
        identity_conn.execute(
            "INSERT OR REPLACE INTO role_definitions (id, name, description, created_at) VALUES (?, ?, ?, ?)",
            (r["id"], r["name"], r["description"], now_str)
        )

    for p in seed_data["permissions"]:
        identity_conn.execute(
            "INSERT OR REPLACE INTO permissions (id, name, description, created_at) VALUES (?, ?, ?, ?)",
            (p["id"], p["name"], p["description"], now_str)
        )

    for s in seed_data["staff_accounts"]:
        identity_conn.execute(
            """INSERT OR REPLACE INTO staff_profiles
            (id, department_id, employee_id, full_name, email, role_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (s["id"], s["department_id"], s["employee_id"], s["full_name"], s["email"], s["role_id"], now_str)
        )

    for st in seed_data["student_roster"]:
        identity_conn.execute(
            """INSERT OR REPLACE INTO student_profiles
            (id, student_id, email, full_name, department_id, campus_id, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (st["student_id"], st["student_id"], st["email"], st["full_name"], st["department_id"], st["campus_id"], 1 if st["verified"] else 0, now_str)
        )
    identity_conn.commit()

    elec = seed_data["sample_election"]
    casting_conn.execute(
        """INSERT OR REPLACE INTO elections
        (id, state, opens_at_utc, closes_at_utc, issuance_cutoff_utc, state_version, next_leaf_index, created_at, updated_at)
        VALUES (?, 'DRAFT', ?, ?, ?, 0, 0, ?, ?)""",
        (elec["id"], elec["opens_at_utc"], elec["closes_at_utc"], elec["issuance_cutoff_utc"], now_str, now_str)
    )

    for contest in elec["contests"]:
        casting_conn.execute(
            "INSERT OR REPLACE INTO contests (id, election_id, title, selection_rule, created_at) VALUES (?, ?, ?, ?, ?)",
            (contest["id"], contest["election_id"], contest["title"], contest["selection_rule"], now_str)
        )
        for cand in contest["candidates"]:
            casting_conn.execute(
                "INSERT OR REPLACE INTO candidates (id, contest_id, name, department, created_at) VALUES (?, ?, ?, ?, ?)",
                (cand["id"], cand["contest_id"], cand["name"], cand["department"], now_str)
            )
    casting_conn.commit()


def run_simulation(base_dir: Path) -> int:
    """Execute complete end to end election simulation."""
    print("[1/10] Setting up local databases and directories")
    db_dir = base_dir / "db"
    export_dir = base_dir / "export"
    external_dir = base_dir / "external"

    if base_dir.exists():
        shutil.rmtree(base_dir)
    db_dir.mkdir(parents=True, exist_ok=True)
    export_dir.mkdir(parents=True, exist_ok=True)
    external_dir.mkdir(parents=True, exist_ok=True)

    identity_db_path = db_dir / "identity.db"
    casting_db_path = db_dir / "casting.db"

    identity_conn = sqlite3.connect(str(identity_db_path))
    casting_conn = sqlite3.connect(str(casting_db_path))

    create_identity_schema(identity_conn)
    create_casting_schema(casting_conn)

    seed_file = fixtures_dir / "seed_data.json"
    with open(seed_file, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    seed_databases(identity_conn, casting_conn, seed_data)

    # Authority key pairs
    roster_approver_priv = ed25519.Ed25519PrivateKey.generate()
    issuer_priv = ed25519.Ed25519PrivateKey.generate()
    witness_priv = ed25519.Ed25519PrivateKey.generate()
    auditor_priv = ed25519.Ed25519PrivateKey.generate()

    election_info = seed_data["sample_election"]
    election_id = election_info["id"]
    students = seed_data["student_roster"]
    total_students = len(students)

    print("[2/10] Freezing election manifest and binding parameters")
    roster_canonical_list = [
        {
            "department": s["department_code"],
            "student_id": s["student_id"],
            "verified": s["verified"]
        }
        for s in students
    ]
    roster_bytes = canonicalize_json(roster_canonical_list)
    roster_commitment = format_digest(roster_bytes)

    manifest_dict = {
        "candidates": [
            {"id": c["id"], "name": c["name"]}
            for contest in election_info["contests"]
            for c in contest["candidates"]
        ],
        "closes_at_utc": election_info["closes_at_utc"],
        "contests": [
            {"id": contest["id"], "title": contest["title"]}
            for contest in election_info["contests"]
        ],
        "election_id": election_id,
        "eligible_count": total_students,
        "issuance_cutoff_utc": election_info["issuance_cutoff_utc"],
        "opens_at_utc": election_info["opens_at_utc"],
        "protocol_version": election_info["protocol_version"],
        "public_eligible_count": total_students,
        "roster_commitment": roster_commitment,
        "roster_version": 1,
        "title": election_info["title"],
        "voting_engine": election_info["voting_engine"]
    }
    manifest_bytes = canonicalize_json(manifest_dict)
    manifest_digest = format_digest(manifest_bytes)
    manifest_dict["manifest_digest"] = manifest_digest

    now_iso = datetime.now(timezone.utc).isoformat()
    casting_conn.execute(
        "UPDATE elections SET state = 'FROZEN', manifest_digest = ?, updated_at = ? WHERE id = ?",
        (manifest_digest, now_iso, election_id)
    )
    casting_conn.execute(
        """INSERT INTO manifest_versions (id, election_id, version, digest, manifest_json, signed_by, signed_at, created_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)""",
        (f"mv_{election_id}_1", election_id, manifest_digest, json.dumps(manifest_dict), "user_eo_001", now_iso, now_iso)
    )
    casting_conn.commit()

    print("[3/10] Signing roster snapshot with Roster Approver key")
    roster_approval_dict = {
        "election_id": election_id,
        "eligible_count": total_students,
        "manifest_digest": manifest_digest,
        "roster_commitment": roster_commitment,
        "roster_version": 1,
        "signed_at": now_iso,
        "signed_by": "user_roster_approver_001"
    }
    roster_approval_bytes = canonicalize_json(roster_approval_dict)
    roster_sig = roster_approver_priv.sign(roster_approval_bytes)
    roster_approval_dict["signature"] = base64.b64encode(roster_sig).decode("utf-8")

    snapshot_id = f"snap_{election_id}_v1"
    identity_conn.execute(
        """INSERT INTO election_roster_snapshots
        (id, election_id, roster_version, digest, eligible_count, signed_by, signed_at, signature, created_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)""",
        (snapshot_id, election_id, roster_commitment, total_students, "user_roster_approver_001", now_iso, roster_approval_dict["signature"], now_iso)
    )
    for st in students:
        identity_conn.execute(
            """INSERT OR REPLACE INTO roster_members
            (election_id, roster_version, student_id, department, verified)
            VALUES (?, 1, ?, ?, ?)""",
            (election_id, st["student_id"], st["department_code"], 1)
        )
    identity_conn.commit()

    print("[4/10] Issues blind credentials to students")
    issued_credentials = []
    ledger_entries = []

    for idx, student in enumerate(students):
        student_id = student["student_id"]
        voter_secret = f"secret_token_{student_id}_{idx}"
        voter_secret_hash = format_digest(voter_secret.encode("utf-8"))
        nullifier = format_digest(f"himvote_nullifier:{election_id}:{voter_secret_hash}".encode("utf-8"))

        blinded_request = format_digest(f"blind_req:{student_id}:{voter_secret}".encode("utf-8"))
        request_digest = format_digest(blinded_request.encode("utf-8"))

        # Sign election binding string: election_id:manifest_digest:nullifier
        binding_message = f"{election_id}:{manifest_digest}:{nullifier}".encode("utf-8")
        proof_signature = issuer_priv.sign(binding_message)
        proof_b64url = base64.urlsafe_b64encode(proof_signature).decode("ascii").rstrip("=")

        identity_conn.execute(
            """INSERT INTO credential_issuance_records
            (id, election_id, student_id, blinded_request, request_digest, blind_signature_response, status, issuer_key_id, roster_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'DELIVERED', 'key_issuer_001', 1, ?)""",
            (f"iss_{student_id}", election_id, student_id, blinded_request, request_digest, proof_b64url, now_iso)
        )
        identity_conn.execute(
            """INSERT INTO issuance_events (id, election_id, student_id, event_type, created_at)
            VALUES (?, ?, ?, 'credential_issued', ?)""",
            (f"evt_{student_id}", election_id, student_id, now_iso)
        )

        issued_credentials.append({
            "nullifier": nullifier,
            "proof_b64url": proof_b64url,
            "student_id": student_id
        })
        ledger_entries.append({"nullifier": nullifier, "student_id": student_id})

    identity_conn.commit()

    issuance_ledger_bytes = canonicalize_json(ledger_entries)
    issuance_ledger_digest = format_digest(issuance_ledger_bytes)

    issuance_closure_dict = {
        "closed_at": now_iso,
        "delivered_count": total_students,
        "election_id": election_id,
        "issuance_ledger_digest": issuance_ledger_digest,
        "issued_count": total_students,
        "manifest_digest": manifest_digest
    }
    issuance_closure_bytes = canonicalize_json(issuance_closure_dict)
    issuance_sig = issuer_priv.sign(issuance_closure_bytes)
    issuance_closure_dict["signature"] = base64.b64encode(issuance_sig).decode("utf-8")

    print("[5/10] Submits encrypted ballots through casting origin")
    casting_conn.execute(
        "UPDATE elections SET state = 'OPEN', updated_at = ? WHERE id = ?",
        (now_iso, election_id)
    )
    casting_conn.commit()

    vote_distribution = [
        ("cand_aarav_sharma", 35),
        ("cand_ananya_verma", 30),
        ("cand_rohit_thakur", 20),
        ("cand_priya_dogra", 15)
    ]
    all_choices: List[str] = []
    for cand_id, count in vote_distribution:
        all_choices.extend([cand_id] * count)

    raw_leaves: List[Dict[str, Any]] = []
    canonical_leaf_bytes_list: List[bytes] = []

    for idx, cred in enumerate(issued_credentials):
        chosen_cand = all_choices[idx]
        ballot_id = f"ballot_{idx + 1:016d}"

        # Valid verifiable encrypted ballot payload
        ballot_dict = {
            "contest_id": "contest_president",
            "election_id": election_id,
            "nonce": f"nonce_{idx}",
            "selections": {chosen_cand: 1}
        }
        ballot_bytes = canonicalize_json(ballot_dict)
        engine_ballot_b64url = base64.urlsafe_b64encode(ballot_bytes).decode("ascii").rstrip("=")

        proof_dict = {
            "commitment": f"comm_{idx}",
            "proof_version": "electionguard_v1",
            "valid_selection": True
        }
        proof_bytes = canonicalize_json(proof_dict)
        engine_proofs_b64url = base64.urlsafe_b64encode(proof_bytes).decode("ascii").rstrip("=")

        leaf_dict = {
            "ballot_id": ballot_id,
            "credential_nullifier": cred["nullifier"],
            "credential_proof_b64url": cred["proof_b64url"],
            "election_id": election_id,
            "engine_ballot_b64url": engine_ballot_b64url,
            "engine_proofs_b64url": engine_proofs_b64url,
            "engine_record_version": "electionguard_1.0.0",
            "leaf_index": idx,
            "manifest_digest": manifest_digest,
            "schema": "himvote.ballot-evidence.v1"
        }
        raw_leaves.append(leaf_dict)

        leaf_bytes = canonicalize_json(leaf_dict)
        canonical_leaf_bytes_list.append(leaf_bytes)

        casting_conn.execute(
            """INSERT INTO accepted_encrypted_ballots
            (leaf_index, election_id, ballot_id, credential_nullifier, credential_proof_b64url, engine_ballot_b64url, engine_proofs_b64url, engine_record_version, committed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (idx, election_id, ballot_id, cred["nullifier"], cred["proof_b64url"], engine_ballot_b64url, engine_proofs_b64url, "electionguard_1.0.0", now_iso)
        )
        casting_conn.execute(
            """INSERT INTO checkpoint_outbox
            (election_id, leaf_index, checkpoint_bytes, checkpoint_digest, acknowledged, created_at)
            VALUES (?, ?, '', '', 1, ?)""",
            (election_id, idx, now_iso)
        )

    casting_conn.execute(
        "UPDATE elections SET next_leaf_index = ?, updated_at = ? WHERE id = ?",
        (len(raw_leaves), now_iso, election_id)
    )
    casting_conn.commit()

    print("[6/10] Executes checkpoint worker to build RFC 9162 Merkle tree")
    recomputed_merkle_root = compute_rfc9162_merkle_root(canonical_leaf_bytes_list)
    merkle_root_hex = f"sha256:{recomputed_merkle_root.hex()}"
    last_leaf_digest = format_digest(b"\x00" + canonical_leaf_bytes_list[-1])

    print("[7/10] Obtains witness signature and witness FINAL")
    final_checkpoint_dict = {
        "checkpoint_kind": "FINAL",
        "checkpoint_sequence": 1,
        "election_id": election_id,
        "issued_count": total_students,
        "last_leaf_digest": last_leaf_digest,
        "last_leaf_index": total_students - 1,
        "manifest_digest": manifest_digest,
        "merkle_root": merkle_root_hex,
        "previous_checkpoint_digest": None,
        "protocol_version": "himvote_2.0.0",
        "roster_commitment": roster_commitment,
        "tree_size": total_students
    }
    final_checkpoint_bytes = canonicalize_json(final_checkpoint_dict)
    witness_sig = witness_priv.sign(final_checkpoint_bytes)
    final_checkpoint_dict["signature"] = base64.b64encode(witness_sig).decode("utf-8")

    casting_conn.execute(
        """INSERT INTO witness_acknowledgements
        (election_id, checkpoint_digest, witness_signature, witness_key_id, sequence, acknowledged_at)
        VALUES (?, ?, ?, 'key_witness_001', 1, ?)""",
        (election_id, merkle_root_hex, final_checkpoint_dict["signature"], now_iso)
    )
    casting_conn.execute(
        """UPDATE elections SET state = 'CLOSED', final_tree_size = ?, last_witnessed_tree_size = ?, updated_at = ?
        WHERE id = ?""",
        (total_students, total_students, now_iso, election_id)
    )
    casting_conn.commit()

    print("[8/10] Simulates anchor relayer posting checkpoint to chain")
    chain_contract_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    chain_code_hash = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    chain_anchor_dict = {
        "anchored_digest": merkle_root_hex,
        "block_hash": "0x3f5c71b1297e64bc81912a76db205731f824948a901f4c2e683e3e06180df145",
        "block_number": 42,
        "chain_id": 31337,
        "code_hash": chain_code_hash,
        "confirmations": 12,
        "contract_address": chain_contract_address,
        "election_id": election_id,
        "is_final": True,
        "relayer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "schema": "himvote.chain_pins.v1",
        "sequence": 1
    }

    print("[9/10] Exports complete evidence package")
    manifest_export_file = export_dir / "manifest.json"
    with open(manifest_export_file, "w", encoding="utf-8") as f:
        json.dump(manifest_dict, f, indent=2)

    leaves_export_file = export_dir / "leaves.json"
    with open(leaves_export_file, "w", encoding="utf-8") as f:
        json.dump(raw_leaves, f, indent=2)

    ballots_export_file = export_dir / "ballots.json"
    with open(ballots_export_file, "w", encoding="utf-8") as f:
        json.dump(raw_leaves, f, indent=2)

    tally_results = {
        "contest_tallies": {
            cand_id: count for cand_id, count in vote_distribution
        },
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "privacy_limited": False,
        "published_at": now_iso,
        "schema": "himvote.results.v1",
        "total_ballots": total_students
    }
    results_export_file = export_dir / "results.json"
    with open(results_export_file, "w", encoding="utf-8") as f:
        json.dump(tally_results, f, indent=2)

    trust_pins_dict = {
        "auditor_key": export_public_key_pem(auditor_priv.public_key()),
        "chain": {
            "chain_id": 31337,
            "code_hash": chain_code_hash,
            "contract_address": chain_contract_address,
            "min_confirmations": 1
        },
        "election_id": election_id,
        "issuer_key": export_public_key_pem(issuer_priv.public_key()),
        "roster_approver_key": export_public_key_pem(roster_approver_priv.public_key()),
        "schema": "himvote.trust_pins.v1",
        "witness_keys": [export_public_key_pem(witness_priv.public_key())]
    }
    trust_pins_file = external_dir / "trust_pins.json"
    with open(trust_pins_file, "w", encoding="utf-8") as f:
        json.dump(trust_pins_dict, f, indent=2)

    final_checkpoint_file = external_dir / "witness_final.json"
    with open(final_checkpoint_file, "w", encoding="utf-8") as f:
        json.dump(final_checkpoint_dict, f, indent=2)

    roster_approval_file = external_dir / "roster_approval.json"
    with open(roster_approval_file, "w", encoding="utf-8") as f:
        json.dump(roster_approval_dict, f, indent=2)

    issuance_closure_file = external_dir / "issuer_closure.json"
    with open(issuance_closure_file, "w", encoding="utf-8") as f:
        json.dump(issuance_closure_dict, f, indent=2)

    chain_pins_file = external_dir / "chain_pins.json"
    with open(chain_pins_file, "w", encoding="utf-8") as f:
        json.dump(chain_anchor_dict, f, indent=2)

    report_file = base_dir / "report.json"

    print("[10/10] Runs the verifier against the explicit development fixture profile")
    verifier_script = repo_root / "verifier" / "verify.py"
    if not verifier_script.exists():
        raise FileNotFoundError(f"Verifier script not found at {verifier_script}")

    cmd = [
        sys.executable,
        str(verifier_script),
        "audit_evidence",
        "--export", str(export_dir),
        "--trust", str(trust_pins_file),
        "--final", str(final_checkpoint_file),
        "--roster", str(roster_approval_file),
        "--issuance", str(issuance_closure_file),
        "--chain", str(chain_pins_file),
        "--report", str(report_file),
        "--allow-development-profile",
    ]

    env = dict(os.environ)
    env["PYTHONPATH"] = str(repo_root)

    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if proc.stdout:
        print("Verifier STDOUT:")
        print(proc.stdout)
    if proc.stderr:
        print("Verifier STDERR:")
        print(proc.stderr)

    assert proc.returncode == 0, f"Verifier failed with unexpected exit code: {proc.returncode}"
    print(
        "[SUCCESS] Development profile audit passed with return code "
        f"{proc.returncode}. This fixture is not evidence of a vetted encrypted engine."
    )

    with open(report_file, "r", encoding="utf-8") as f:
        report_data = json.load(f)
    print(f"[REPORT] Overall status: {report_data.get('overall_status')}")
    props = report_data.get("properties", {})
    for prop_name, prop_status in props.items():
        print(f"  * {prop_name}: {prop_status.get('status')}")

    # Auditor attestation verification
    report_canonical_bytes = canonicalize_json(report_data)
    auditor_sig = auditor_priv.sign(report_canonical_bytes)
    attestation_dict = {
        "report_digest": format_digest(report_canonical_bytes),
        "schema": "himvote.attestation.v1",
        "signature": base64.b64encode(auditor_sig).decode("utf-8")
    }
    attestation_file = external_dir / "attestation.json"
    with open(attestation_file, "w", encoding="utf-8") as f:
        json.dump(attestation_dict, f, indent=2)

    attest_cmd = [
        sys.executable,
        str(verifier_script),
        "verify_attestation",
        "--report", str(report_file),
        "--attestation", str(attestation_file),
        "--trust", str(trust_pins_file)
    ]
    attest_proc = subprocess.run(attest_cmd, env=env, capture_output=True, text=True)
    if attest_proc.stderr:
        print("Attestation STDERR:", attest_proc.stderr)
    assert attest_proc.returncode == 0, f"Attestation failed with return code: {attest_proc.returncode}"
    print(f"[SUCCESS] verify_attestation passed with return code {attest_proc.returncode}")

    return 0


def main() -> int:
    """CLI entrypoint for simulation harness."""
    parser = argparse.ArgumentParser(description="HimVote End to End Election Simulation Harness")
    parser.add_argument(
        "--work_dir",
        default=str(fixtures_dir / "simulation_run"),
        help="Target working directory for database and export files"
    )
    args = parser.parse_args()
    target_path = Path(args.work_dir).resolve()
    return run_simulation(target_path)


if __name__ == "__main__":
    sys.exit(main())
