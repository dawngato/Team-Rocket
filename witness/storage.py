"""
Backing store for HimVote Witness service.
Uses SQLite with Write Ahead Logging (WAL) and optional append only disk log.
Enforces atomic state transitions, sequence ordering, and tamper evident history.
"""

import os
import json
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone


class StorageError(Exception):
    """Base exception for storage errors."""
    pass


class ElectionNotFoundError(StorageError):
    """Raised when an operation targets an unknown election."""
    pass


class ElectionAlreadyFinalizedError(StorageError):
    """Raised when an update is attempted on an election already sealed as FINAL."""
    pass


class ConflictingFinalCheckpointError(StorageError):
    """Raised when a second incompatible FINAL checkpoint is submitted."""
    pass


class SequenceGapError(StorageError):
    """Raised when a checkpoint sequence skips numbers (gap refused)."""
    pass


class SequenceRollbackError(StorageError):
    """Raised when a checkpoint sequence decreases or repeats."""
    pass


class TreeSizeRollbackError(StorageError):
    """Raised when tree size decreases (non monotonic tree size)."""
    pass


class ManifestMismatchError(StorageError):
    """Raised when manifest digest changes for an existing election."""
    pass


class PreviousCheckpointMismatchError(StorageError):
    """Raised when previous_checkpoint_digest does not match previous checkpoint."""
    pass


def get_utc_iso_timestamp() -> str:
    """Return current UTC timestamp in ISO format with trailing Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class WitnessStorage:
    """
    SQLite backing store for Witness service with append only audit log.
    Ensures strict sequencing, monotonic growth, and immutable audit entries.
    """

    def __init__(self, db_path: str, append_log_path: Optional[str] = None):
        self.db_path = db_path
        self.append_log_path = append_log_path
        self._ensure_directories()
        self._init_database()

    def _ensure_directories(self) -> None:
        """Create parent directory for database and append log if needed."""
        db_dir = os.path.dirname(os.path.abspath(self.db_path))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        if self.append_log_path:
            log_dir = os.path.dirname(os.path.abspath(self.append_log_path))
            if log_dir:
                os.makedirs(log_dir, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Create and configure a SQLite connection with WAL mode."""
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_database(self) -> None:
        """Initialize tables and indexes if they do not exist."""
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS trusted_writers (
                    election_id TEXT PRIMARY KEY,
                    writer_public_key TEXT NOT NULL,
                    description TEXT,
                    created_at_utc TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS election_states (
                    election_id TEXT PRIMARY KEY,
                    manifest_digest TEXT NOT NULL,
                    current_tree_size INTEGER NOT NULL,
                    latest_merkle_root TEXT NOT NULL,
                    latest_sequence INTEGER NOT NULL,
                    latest_checkpoint_digest TEXT NOT NULL,
                    latest_witness_sequence INTEGER NOT NULL,
                    is_final INTEGER NOT NULL DEFAULT 0,
                    final_checkpoint_digest TEXT,
                    created_at_utc TEXT NOT NULL,
                    updated_at_utc TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS checkpoints_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    election_id TEXT NOT NULL,
                    checkpoint_sequence INTEGER NOT NULL,
                    witness_sequence INTEGER NOT NULL,
                    previous_witness_sequence INTEGER NOT NULL,
                    checkpoint_kind TEXT NOT NULL,
                    tree_size INTEGER NOT NULL,
                    merkle_root TEXT NOT NULL,
                    checkpoint_digest TEXT NOT NULL,
                    checkpoint_canonical_json TEXT NOT NULL,
                    writer_signature TEXT NOT NULL,
                    writer_public_key TEXT,
                    witness_signature TEXT NOT NULL,
                    witness_public_key TEXT NOT NULL,
                    witnessed_at_utc TEXT NOT NULL,
                    UNIQUE(election_id, checkpoint_sequence),
                    UNIQUE(election_id, witness_sequence)
                );

                CREATE INDEX IF NOT EXISTS idx_audit_election_seq
                ON checkpoints_audit (election_id, checkpoint_sequence);
            """)

    def set_trusted_writer(
        self,
        election_id: str,
        writer_public_key: str,
        description: str = ""
    ) -> None:
        """Register or update pinned writer public key for an election."""
        now = get_utc_iso_timestamp()
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO trusted_writers (election_id, writer_public_key, description, created_at_utc)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(election_id) DO UPDATE SET
                    writer_public_key = excluded.writer_public_key,
                    description = excluded.description
            """, (election_id, writer_public_key, description, now))

    def get_trusted_writer(self, election_id: str) -> Optional[str]:
        """Retrieve pinned writer public key for an election or global wildcard."""
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT writer_public_key FROM trusted_writers WHERE election_id = ?",
                (election_id,)
            )
            row = cur.fetchone()
            if row:
                return row["writer_public_key"]

            # Fallback to wildcard writer if registered
            cur = conn.execute(
                "SELECT writer_public_key FROM trusted_writers WHERE election_id = '*'"
            )
            row = cur.fetchone()
            if row:
                return row["writer_public_key"]
            return None

    def get_election_state(self, election_id: str) -> Optional[Dict[str, Any]]:
        """Fetch current state record for an election."""
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT * FROM election_states WHERE election_id = ?",
                (election_id,)
            )
            row = cur.fetchone()
            if not row:
                return None
            return dict(row)

    def get_checkpoint_by_sequence(
        self,
        election_id: str,
        sequence: int
    ) -> Optional[Dict[str, Any]]:
        """Retrieve audit record for specific sequence."""
        with self._get_connection() as conn:
            cur = conn.execute("""
                SELECT * FROM checkpoints_audit
                WHERE election_id = ? AND checkpoint_sequence = ?
            """, (election_id, sequence))
            row = cur.fetchone()
            if not row:
                return None
            return dict(row)

    def get_latest_checkpoint(self, election_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve latest audit record for an election."""
        with self._get_connection() as conn:
            cur = conn.execute("""
                SELECT * FROM checkpoints_audit
                WHERE election_id = ?
                ORDER BY checkpoint_sequence DESC
                LIMIT 1
            """, (election_id,))
            row = cur.fetchone()
            if not row:
                return None
            return dict(row)

    def list_checkpoints(
        self, election_id: str, after_sequence: int = 0
    ) -> List[Dict[str, Any]]:
        """Return witnessed checkpoints after a checkpoint sequence, oldest first."""
        with self._get_connection() as conn:
            cur = conn.execute(
                """
                SELECT * FROM checkpoints_audit
                WHERE election_id = ? AND checkpoint_sequence > ?
                ORDER BY checkpoint_sequence ASC
                """,
                (election_id, after_sequence),
            )
            return [dict(row) for row in cur.fetchall()]

    def get_final_checkpoint(self, election_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the sealed FINAL checkpoint audit record."""
        with self._get_connection() as conn:
            cur = conn.execute("""
                SELECT * FROM checkpoints_audit
                WHERE election_id = ? AND checkpoint_kind = 'FINAL'
                ORDER BY checkpoint_sequence DESC
                LIMIT 1
            """, (election_id,))
            row = cur.fetchone()
            if not row:
                return None
            return dict(row)

    def append_audit_log_file(self, record: Dict[str, Any]) -> None:
        """Append audit record as JSON line to immutable text file."""
        if not self.append_log_path:
            return
        line = json.dumps(record, sort_keys=True) + "\n"
        with open(self.append_log_path, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()
            os.fsync(f.fileno())

    def record_checkpoint(
        self,
        election_id: str,
        manifest_digest: str,
        tree_size: int,
        merkle_root: str,
        checkpoint_sequence: int,
        checkpoint_kind: str,
        checkpoint_digest: str,
        canonical_json: str,
        previous_checkpoint_digest: Optional[str],
        writer_signature: str,
        writer_public_key: Optional[str],
        witness_signature_fn: Any,
        witness_public_key: str
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Atomically validate and record a checkpoint.
        Uses an exclusive transaction to prevent concurrent race conditions.
        Returns tuple of (audit_record, is_idempotent_replay).
        """
        now = get_utc_iso_timestamp()

        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")

            cur = conn.execute(
                "SELECT * FROM election_states WHERE election_id = ?",
                (election_id,)
            )
            state_row = cur.fetchone()

            if state_row is not None:
                state = dict(state_row)

                # Check if election is sealed as FINAL
                if state["is_final"] == 1:
                    # Check for idempotent replay of latest checkpoint
                    if state["latest_checkpoint_digest"] == checkpoint_digest:
                        existing = self.get_checkpoint_by_sequence(
                            election_id, checkpoint_sequence
                        )
                        if existing:
                            conn.rollback()
                            return existing, True
                    conn.rollback()
                    raise ElectionAlreadyFinalizedError(
                        f"Election {election_id} is already sealed as FINAL, updates refused"
                    )

                # Verify manifest digest immutability
                if state["manifest_digest"] != manifest_digest:
                    conn.rollback()
                    raise ManifestMismatchError(
                        f"Manifest digest {manifest_digest} does not match election manifest {state['manifest_digest']}"
                    )

                # Check for idempotent replay
                if (state["latest_sequence"] == checkpoint_sequence and
                        state["latest_checkpoint_digest"] == checkpoint_digest):
                    existing = self.get_checkpoint_by_sequence(
                        election_id, checkpoint_sequence
                    )
                    if existing:
                        conn.rollback()
                        return existing, True

                # Sequence rollback check
                if checkpoint_sequence <= state["latest_sequence"]:
                    conn.rollback()
                    raise SequenceRollbackError(
                        f"Sequence {checkpoint_sequence} is not greater than latest {state['latest_sequence']}"
                    )

                # Sequence gap check
                if checkpoint_sequence != state["latest_sequence"] + 1:
                    conn.rollback()
                    raise SequenceGapError(
                        f"Gap refused: incoming sequence {checkpoint_sequence} expected {state['latest_sequence'] + 1}"
                    )

                # Previous checkpoint digest check
                if previous_checkpoint_digest != state["latest_checkpoint_digest"]:
                    conn.rollback()
                    raise PreviousCheckpointMismatchError(
                        f"previous_checkpoint_digest {previous_checkpoint_digest} does not match latest digest {state['latest_checkpoint_digest']}"
                    )

                # Tree size monotonicity check
                if tree_size < state["current_tree_size"]:
                    conn.rollback()
                    raise TreeSizeRollbackError(
                        f"Tree size rollback: new size {tree_size} is smaller than current {state['current_tree_size']}"
                    )

                previous_witness_seq = state["latest_witness_sequence"]
                witness_seq = previous_witness_seq + 1
            else:
                # First checkpoint for new election
                if checkpoint_sequence != 1:
                    conn.rollback()
                    raise SequenceGapError(
                        f"Initial checkpoint sequence must be 1, got {checkpoint_sequence}"
                    )
                previous_witness_seq = 0
                witness_seq = 1

            # Compute witness signature using callback
            witness_sig = witness_signature_fn(
                election_id=election_id,
                previous_witness_sequence=previous_witness_seq,
                checkpoint_canonical_bytes=canonical_json.encode("utf-8")
            )

            is_final_flag = 1 if checkpoint_kind == "FINAL" else 0

            # Insert into append only audit table
            conn.execute("""
                INSERT INTO checkpoints_audit (
                    election_id, checkpoint_sequence, witness_sequence,
                    previous_witness_sequence, checkpoint_kind, tree_size,
                    merkle_root, checkpoint_digest, checkpoint_canonical_json,
                    writer_signature, writer_public_key, witness_signature,
                    witness_public_key, witnessed_at_utc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                election_id, checkpoint_sequence, witness_seq,
                previous_witness_seq, checkpoint_kind, tree_size,
                merkle_root, checkpoint_digest, canonical_json,
                writer_signature, writer_public_key, witness_sig,
                witness_public_key, now
            ))

            # Update or create election state
            if state_row is not None:
                conn.execute("""
                    UPDATE election_states SET
                        current_tree_size = ?,
                        latest_merkle_root = ?,
                        latest_sequence = ?,
                        latest_checkpoint_digest = ?,
                        latest_witness_sequence = ?,
                        is_final = ?,
                        final_checkpoint_digest = CASE WHEN ? = 1 THEN ? ELSE final_checkpoint_digest END,
                        updated_at_utc = ?
                    WHERE election_id = ?
                """, (
                    tree_size, merkle_root, checkpoint_sequence,
                    checkpoint_digest, witness_seq, is_final_flag,
                    is_final_flag, checkpoint_digest, now, election_id
                ))
            else:
                conn.execute("""
                    INSERT INTO election_states (
                        election_id, manifest_digest, current_tree_size,
                        latest_merkle_root, latest_sequence, latest_checkpoint_digest,
                        latest_witness_sequence, is_final, final_checkpoint_digest,
                        created_at_utc, updated_at_utc
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    election_id, manifest_digest, tree_size,
                    merkle_root, checkpoint_sequence, checkpoint_digest,
                    witness_seq, is_final_flag,
                    checkpoint_digest if is_final_flag == 1 else None,
                    now, now
                ))

            conn.commit()

        audit_entry = {
            "election_id": election_id,
            "checkpoint_sequence": checkpoint_sequence,
            "witness_sequence": witness_seq,
            "previous_witness_sequence": previous_witness_seq,
            "checkpoint_kind": checkpoint_kind,
            "tree_size": tree_size,
            "merkle_root": merkle_root,
            "checkpoint_digest": checkpoint_digest,
            "checkpoint_canonical_json": canonical_json,
            "writer_signature": writer_signature,
            "writer_public_key": writer_public_key,
            "witness_signature": witness_sig,
            "witness_public_key": witness_public_key,
            "witnessed_at_utc": now
        }
        self.append_audit_log_file(audit_entry)
        return audit_entry, False

    def seal_final_existing(
        self,
        election_id: str,
        witness_signature_fn: Any,
        witness_public_key: str
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Seal existing latest checkpoint as FINAL when no new tree entries are added.
        """
        with self._get_connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            cur = conn.execute(
                "SELECT * FROM election_states WHERE election_id = ?",
                (election_id,)
            )
            state_row = cur.fetchone()
            if not state_row:
                conn.rollback()
                raise ElectionNotFoundError(f"Election {election_id} not found to finalize")

            state = dict(state_row)
            if state["is_final"] == 1:
                final_entry = self.get_final_checkpoint(election_id)
                if final_entry:
                    conn.rollback()
                    return final_entry, True

            latest_audit = self.get_latest_checkpoint(election_id)
            if not latest_audit:
                conn.rollback()
                raise ElectionNotFoundError(f"No checkpoint exists for election {election_id}")

            # Finalization appends a new checkpoint sequence that links to the
            # latest accepted checkpoint, even when the Merkle tree is unchanged.
            next_seq = state["latest_sequence"] + 1
            checkpoint_obj = json.loads(latest_audit["checkpoint_canonical_json"])
            checkpoint_obj["checkpoint_kind"] = "FINAL"
            checkpoint_obj["checkpoint_sequence"] = next_seq
            checkpoint_obj["previous_checkpoint_digest"] = latest_audit["checkpoint_digest"]
            from witness.canonical import canonical_json_str
            final_canonical_json = canonical_json_str(checkpoint_obj)
            import hashlib
            final_checkpoint_digest = hashlib.sha256(final_canonical_json.encode("utf-8")).hexdigest()

            previous_witness_seq = state["latest_witness_sequence"]
            witness_seq = previous_witness_seq + 1
            now = get_utc_iso_timestamp()

            witness_sig = witness_signature_fn(
                election_id=election_id,
                previous_witness_sequence=previous_witness_seq,
                checkpoint_canonical_bytes=final_canonical_json.encode("utf-8")
            )

            # Insert final checkpoint into audit table
            conn.execute("""
                INSERT INTO checkpoints_audit (
                    election_id, checkpoint_sequence, witness_sequence,
                    previous_witness_sequence, checkpoint_kind, tree_size,
                    merkle_root, checkpoint_digest, checkpoint_canonical_json,
                    writer_signature, writer_public_key, witness_signature,
                    witness_public_key, witnessed_at_utc
                ) VALUES (?, ?, ?, ?, 'FINAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                election_id, next_seq, witness_seq,
                previous_witness_seq, state["current_tree_size"],
                state["latest_merkle_root"], final_checkpoint_digest,
                final_canonical_json, latest_audit["writer_signature"],
                latest_audit["writer_public_key"], witness_sig,
                witness_public_key, now
            ))

            conn.execute("""
                UPDATE election_states SET
                    latest_sequence = ?,
                    latest_checkpoint_digest = ?,
                    latest_witness_sequence = ?,
                    is_final = 1,
                    final_checkpoint_digest = ?,
                    updated_at_utc = ?
                WHERE election_id = ?
            """, (
                next_seq, final_checkpoint_digest,
                witness_seq, final_checkpoint_digest, now, election_id
            ))

            conn.commit()

        final_audit_entry = {
            "election_id": election_id,
            "checkpoint_sequence": next_seq,
            "witness_sequence": witness_seq,
            "previous_witness_sequence": previous_witness_seq,
            "checkpoint_kind": "FINAL",
            "tree_size": state["current_tree_size"],
            "merkle_root": state["latest_merkle_root"],
            "checkpoint_digest": final_checkpoint_digest,
            "checkpoint_canonical_json": final_canonical_json,
            "writer_signature": latest_audit["writer_signature"],
            "writer_public_key": latest_audit["writer_public_key"],
            "witness_signature": witness_sig,
            "witness_public_key": witness_public_key,
            "witnessed_at_utc": now
        }
        self.append_audit_log_file(final_audit_entry)
        return final_audit_entry, False
