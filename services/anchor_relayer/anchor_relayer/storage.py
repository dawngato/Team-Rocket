"""
Transactional outbox storage repository.
Manages persistent state of checkpoint anchoring jobs.
"""

import sqlite3
import threading
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Optional
from anchor_relayer.models import OutboxRecord, OutboxStatus, WitnessedCheckpoint


class OutboxRepository(ABC):
    """
    Abstract interface for outbox storage.
    """

    @abstractmethod
    def enqueue(self, checkpoint: WitnessedCheckpoint) -> OutboxRecord:
        pass

    @abstractmethod
    def get_pending(self, limit: int = 50) -> List[OutboxRecord]:
        pass

    @abstractmethod
    def get_in_flight(self) -> List[OutboxRecord]:
        pass

    @abstractmethod
    def get_by_id(self, record_id: str) -> Optional[OutboxRecord]:
        pass

    @abstractmethod
    def get_by_election_and_sequence(self, election_commitment: str, sequence: int) -> Optional[OutboxRecord]:
        pass

    @abstractmethod
    def mark_prepared(self, record_id: str, tx_nonce: int) -> None:
        pass

    @abstractmethod
    def mark_submitted(self, record_id: str, tx_hash: str) -> None:
        pass

    @abstractmethod
    def mark_confirming(self, record_id: str, block_number: int, block_hash: str, confirmation_count: int) -> None:
        pass

    @abstractmethod
    def mark_finalized(self, record_id: str, block_number: int, block_hash: str, confirmation_count: int) -> None:
        pass

    @abstractmethod
    def reset_to_pending(self, record_id: str, reason: str) -> None:
        pass

    @abstractmethod
    def mark_failed(self, record_id: str, error_message: str) -> None:
        pass


class SQLiteOutboxRepository(OutboxRepository):
    """
    SQLite implementation of outbox storage.
    Thread safe with row locking semantics.
    """

    def __init__(self, database_path: str = ":memory:"):
        if not isinstance(database_path, str) or not database_path:
            raise ValueError("database_path must be a non-empty string")
        self.database_path = database_path
        self._lock = threading.RLock()
        self._memory_conn: Optional[sqlite3.Connection] = None
        if database_path == ":memory:":
            self._memory_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._memory_conn.row_factory = sqlite3.Row
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self._memory_conn is not None:
            return self._memory_conn
        conn = sqlite3.connect(self.database_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def _validate_bytes32(name: str, value: str) -> str:
        if not isinstance(value, str):
            raise TypeError(f"{name} must be a hexadecimal string")
        normalized = value[2:] if value.startswith(("0x", "0X")) else value
        if len(normalized) != 64:
            raise ValueError(f"{name} must contain exactly 32 bytes")
        try:
            bytes.fromhex(normalized)
        except ValueError as exc:
            raise ValueError(f"{name} must contain only hexadecimal characters") from exc
        return "0x" + normalized.lower()

    @classmethod
    def _validate_checkpoint(cls, checkpoint: WitnessedCheckpoint) -> None:
        if not isinstance(checkpoint, WitnessedCheckpoint):
            raise TypeError("checkpoint must be a WitnessedCheckpoint")
        if isinstance(checkpoint.sequence, bool) or not isinstance(checkpoint.sequence, int):
            raise TypeError("checkpoint sequence must be an integer")
        if checkpoint.sequence < 1:
            raise ValueError("checkpoint sequence must be at least 1")
        if not isinstance(checkpoint.is_final, bool):
            raise TypeError("checkpoint is_final must be a boolean")
        cls._validate_bytes32("election_commitment", checkpoint.election_commitment)
        cls._validate_bytes32("digest", checkpoint.digest)
        cls._validate_bytes32("previous_digest", checkpoint.previous_digest)

    @staticmethod
    def _validate_record_id(record_id: str) -> None:
        if not isinstance(record_id, str) or not record_id.strip():
            raise ValueError("record_id must be a non-empty string")

    @staticmethod
    def _validate_non_negative_int(name: str, value: int) -> None:
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError(f"{name} must be a non-negative integer")

    @staticmethod
    def _validate_text(name: str, value: str) -> None:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{name} must be a non-empty string")

    def _init_db(self) -> None:
        with self._lock:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS anchor_outbox (
                        id TEXT PRIMARY KEY,
                        election_commitment TEXT NOT NULL,
                        sequence INTEGER NOT NULL,
                        digest TEXT NOT NULL,
                        previous_digest TEXT NOT NULL,
                        is_final INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        tx_hash TEXT,
                        tx_nonce INTEGER,
                        block_number INTEGER,
                        block_hash TEXT,
                        confirmation_count INTEGER DEFAULT 0,
                        error_message TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        UNIQUE(election_commitment, sequence)
                    )
                    """
                )
                conn.commit()

    def enqueue(self, checkpoint: WitnessedCheckpoint) -> OutboxRecord:
        self._validate_checkpoint(checkpoint)
        election_commitment = self._validate_bytes32(
            "election_commitment", checkpoint.election_commitment
        )
        digest = self._validate_bytes32("digest", checkpoint.digest)
        previous_digest = self._validate_bytes32(
            "previous_digest", checkpoint.previous_digest
        )
        with self._lock:
            record_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            with self._get_connection() as conn:
                existing_row = conn.execute(
                    "SELECT * FROM anchor_outbox WHERE election_commitment = ? AND sequence = ?",
                    (election_commitment, checkpoint.sequence),
                ).fetchone()
                if existing_row:
                    existing = self._row_to_record(existing_row)
                    if (
                        existing.digest != digest
                        or existing.previous_digest != previous_digest
                        or existing.is_final != checkpoint.is_final
                    ):
                        raise ValueError(
                            "conflicting checkpoint for election commitment and sequence"
                        )
                    return existing

                conn.execute(
                    """
                    INSERT INTO anchor_outbox (
                        id, election_commitment, sequence, digest, previous_digest,
                        is_final, status, confirmation_count, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id,
                        election_commitment,
                        checkpoint.sequence,
                        digest,
                        previous_digest,
                        1 if checkpoint.is_final else 0,
                        OutboxStatus.ANCHOR_PENDING.value,
                        0,
                        now,
                        now,
                    ),
                )
                row = conn.execute(
                    "SELECT * FROM anchor_outbox WHERE id = ?", (record_id,)
                ).fetchone()
                if row is None:
                    raise RuntimeError("Failed to insert record into outbox")
                return self._row_to_record(row)

    def get_pending(self, limit: int = 50) -> List[OutboxRecord]:
        self._validate_non_negative_int("limit", limit)
        if limit == 0:
            raise ValueError("limit must be greater than zero")
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    """
                    SELECT * FROM anchor_outbox
                    WHERE status = ?
                    ORDER BY election_commitment ASC, sequence ASC, created_at ASC
                    LIMIT ?
                    """,
                    (OutboxStatus.ANCHOR_PENDING.value, limit),
                )
                rows = cursor.fetchall()
                return [self._row_to_record(row) for row in rows]

    def get_in_flight(self) -> List[OutboxRecord]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    """
                    SELECT * FROM anchor_outbox
                    WHERE status IN (?, ?, ?)
                    ORDER BY election_commitment ASC, sequence ASC, created_at ASC
                    """,
                    (
                        OutboxStatus.ANCHOR_PREPARED.value,
                        OutboxStatus.ANCHOR_SUBMITTED.value,
                        OutboxStatus.CONFIRMING.value,
                    ),
                )
                rows = cursor.fetchall()
                return [self._row_to_record(row) for row in rows]

    def get_by_id(self, record_id: str) -> Optional[OutboxRecord]:
        self._validate_record_id(record_id)
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute("SELECT * FROM anchor_outbox WHERE id = ?", (record_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                return self._row_to_record(row)

    def get_by_tx_hash(self, tx_hash: str) -> Optional[OutboxRecord]:
        """Returns the durable outbox record associated with a transaction hash."""
        self._validate_text("tx_hash", tx_hash)
        self._validate_hex_text("tx_hash", tx_hash)
        with self._lock:
            with self._get_connection() as conn:
                row = conn.execute(
                    "SELECT * FROM anchor_outbox WHERE tx_hash = ?", (tx_hash,)
                ).fetchone()
                return self._row_to_record(row) if row else None

    def get_latest_for_election(self, election_commitment: str) -> Optional[OutboxRecord]:
        """Returns the highest durable sequence for an election commitment."""
        election_commitment = self._validate_bytes32("election_commitment", election_commitment)
        with self._lock:
            with self._get_connection() as conn:
                row = conn.execute(
                    """
                    SELECT * FROM anchor_outbox
                    WHERE election_commitment = ?
                    ORDER BY sequence DESC
                    LIMIT 1
                    """,
                    (election_commitment,),
                ).fetchone()
                return self._row_to_record(row) if row else None

    def get_by_election_and_sequence(self, election_commitment: str, sequence: int) -> Optional[OutboxRecord]:
        election_commitment = self._validate_bytes32("election_commitment", election_commitment)
        if isinstance(sequence, bool) or not isinstance(sequence, int) or sequence < 1:
            raise ValueError("sequence must be a positive integer")
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT * FROM anchor_outbox WHERE election_commitment = ? AND sequence = ?",
                    (election_commitment, sequence),
                )
                row = cursor.fetchone()
                if not row:
                    return None
                return self._row_to_record(row)

    def mark_prepared(self, record_id: str, tx_nonce: int) -> None:
        self._validate_non_negative_int("tx_nonce", tx_nonce)
        self._update_status(
            record_id,
            OutboxStatus.ANCHOR_PREPARED,
            tx_nonce=tx_nonce,
        )

    def mark_submitted(self, record_id: str, tx_hash: str) -> None:
        self._validate_text("tx_hash", tx_hash)
        self._validate_hex_text("tx_hash", tx_hash)
        self._update_status(record_id, OutboxStatus.ANCHOR_SUBMITTED, tx_hash=tx_hash)

    def mark_confirming(self, record_id: str, block_number: int, block_hash: str, confirmation_count: int) -> None:
        self._validate_non_negative_int("block_number", block_number)
        self._validate_non_negative_int("confirmation_count", confirmation_count)
        self._validate_text("block_hash", block_hash)
        self._validate_hex_text("block_hash", block_hash)
        self._update_status(
            record_id,
            OutboxStatus.CONFIRMING,
            block_number=block_number,
            block_hash=block_hash,
            confirmation_count=confirmation_count,
        )

    def mark_finalized(self, record_id: str, block_number: int, block_hash: str, confirmation_count: int) -> None:
        self._validate_non_negative_int("block_number", block_number)
        self._validate_non_negative_int("confirmation_count", confirmation_count)
        self._validate_text("block_hash", block_hash)
        self._validate_hex_text("block_hash", block_hash)
        self._update_status(
            record_id,
            OutboxStatus.ANCHOR_FINALIZED,
            block_number=block_number,
            block_hash=block_hash,
            confirmation_count=confirmation_count,
        )

    def reset_to_pending(self, record_id: str, reason: str) -> None:
        self._validate_text("reason", reason)
        self._update_status(
            record_id,
            OutboxStatus.ANCHOR_PENDING,
            tx_hash=None,
            tx_nonce=None,
            block_number=None,
            block_hash=None,
            confirmation_count=0,
            error_message=reason,
        )

    def mark_failed(self, record_id: str, error_message: str) -> None:
        self._validate_text("error_message", error_message)
        self._update_status(
            record_id,
            OutboxStatus.FAILED,
            error_message=error_message,
        )

    @staticmethod
    def _validate_hex_text(name: str, value: str) -> None:
        normalized = value[2:] if value.startswith(("0x", "0X")) else value
        if not normalized or len(normalized) % 2:
            raise ValueError(f"{name} must be an even length hexadecimal string")
        try:
            bytes.fromhex(normalized)
        except ValueError as exc:
            raise ValueError(f"{name} must contain only hexadecimal characters") from exc

    def _update_status(self, record_id: str, target: OutboxStatus, **fields: object) -> None:
        self._validate_record_id(record_id)
        allowed = {
            OutboxStatus.ANCHOR_PENDING: {
                OutboxStatus.ANCHOR_PENDING,
                OutboxStatus.ANCHOR_PREPARED,
                OutboxStatus.ANCHOR_SUBMITTED,
                OutboxStatus.CONFIRMING,
                OutboxStatus.ANCHOR_FINALIZED,
                OutboxStatus.FAILED,
            },
            OutboxStatus.ANCHOR_PREPARED: {
                OutboxStatus.ANCHOR_PREPARED,
                OutboxStatus.ANCHOR_SUBMITTED,
                OutboxStatus.ANCHOR_PENDING,
                OutboxStatus.FAILED,
            },
            OutboxStatus.ANCHOR_SUBMITTED: {
                OutboxStatus.ANCHOR_SUBMITTED,
                OutboxStatus.CONFIRMING,
                OutboxStatus.ANCHOR_FINALIZED,
                OutboxStatus.ANCHOR_PENDING,
                OutboxStatus.FAILED,
            },
            OutboxStatus.CONFIRMING: {
                OutboxStatus.CONFIRMING,
                OutboxStatus.ANCHOR_FINALIZED,
                OutboxStatus.ANCHOR_PENDING,
                OutboxStatus.FAILED,
            },
            OutboxStatus.FAILED: {OutboxStatus.FAILED},
            OutboxStatus.ANCHOR_FINALIZED: {OutboxStatus.ANCHOR_FINALIZED},
        }
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            with self._get_connection() as conn:
                row = conn.execute(
                    "SELECT * FROM anchor_outbox WHERE id = ?", (record_id,)
                ).fetchone()
                if row is None:
                    raise KeyError(f"outbox record not found: {record_id}")
                current = OutboxStatus(row["status"])
                if target not in allowed[current]:
                    raise ValueError(f"invalid outbox transition {current.value} to {target.value}")

                if target == OutboxStatus.ANCHOR_SUBMITTED and fields.get("tx_hash") is not None:
                    prior_hash = row["tx_hash"]
                    if prior_hash is not None and prior_hash != fields["tx_hash"]:
                        raise ValueError("submitted outbox record cannot change transaction hash")
                if (
                    current == target
                    and target in {OutboxStatus.CONFIRMING, OutboxStatus.ANCHOR_FINALIZED}
                ):
                    prior_block = row["block_number"]
                    prior_hash = row["block_hash"]
                    if prior_block is not None and prior_block != fields.get("block_number"):
                        raise ValueError("confirmed outbox record cannot change block number")
                    if prior_hash is not None and prior_hash != fields.get("block_hash"):
                        raise ValueError("confirmed outbox record cannot change block hash")
                if target == OutboxStatus.ANCHOR_PREPARED:
                    prior_nonce = row["tx_nonce"]
                    if prior_nonce is not None and prior_nonce != fields.get("tx_nonce"):
                        raise ValueError("prepared outbox record cannot change transaction nonce")

                assignments = ["status = ?", "updated_at = ?"]
                values: list[object] = [target.value, now]
                for name, value in fields.items():
                    if name not in {
                        "tx_hash",
                        "tx_nonce",
                        "block_number",
                        "block_hash",
                        "confirmation_count",
                        "error_message",
                    }:
                        raise ValueError(f"unsupported outbox field: {name}")
                    assignments.append(f"{name} = ?")
                    values.append(value)
                values.append(record_id)
                conn.execute(
                    f"UPDATE anchor_outbox SET {', '.join(assignments)} WHERE id = ?",
                    values,
                )
                conn.commit()

    def _row_to_record(self, row: sqlite3.Row) -> OutboxRecord:
        return OutboxRecord(
            id=row["id"],
            election_commitment=row["election_commitment"],
            sequence=row["sequence"],
            digest=row["digest"],
            previous_digest=row["previous_digest"],
            is_final=bool(row["is_final"]),
            status=OutboxStatus(row["status"]),
            tx_hash=row["tx_hash"],
            tx_nonce=row["tx_nonce"],
            block_number=row["block_number"],
            block_hash=row["block_hash"],
            confirmation_count=row["confirmation_count"] or 0,
            error_message=row["error_message"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )
