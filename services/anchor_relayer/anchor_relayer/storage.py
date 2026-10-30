"""
Transactional outbox storage repository.
Manages persistent state of checkpoint anchoring jobs.
"""

import sqlite3
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
        self.database_path = database_path
        self._memory_conn: Optional[sqlite3.Connection] = None
        if database_path == ":memory:":
            self._memory_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._memory_conn.row_factory = sqlite3.Row
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self._memory_conn is not None:
            return self._memory_conn
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
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
        record_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            existing = self.get_by_election_and_sequence(checkpoint.election_commitment, checkpoint.sequence)
            if existing:
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
                    checkpoint.election_commitment,
                    checkpoint.sequence,
                    checkpoint.digest,
                    checkpoint.previous_digest,
                    1 if checkpoint.is_final else 0,
                    OutboxStatus.ANCHOR_PENDING.value,
                    0,
                    now,
                    now,
                ),
            )
            conn.commit()

        record = self.get_by_id(record_id)
        if not record:
            raise RuntimeError("Failed to insert record into outbox")
        return record

    def get_pending(self, limit: int = 50) -> List[OutboxRecord]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM anchor_outbox
                WHERE status = ?
                ORDER BY sequence ASC
                LIMIT ?
                """,
                (OutboxStatus.ANCHOR_PENDING.value, limit),
            )
            rows = cursor.fetchall()
            return [self._row_to_record(row) for row in rows]

    def get_in_flight(self) -> List[OutboxRecord]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM anchor_outbox
                WHERE status IN (?, ?, ?)
                ORDER BY sequence ASC
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
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM anchor_outbox WHERE id = ?", (record_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def get_by_election_and_sequence(self, election_commitment: str, sequence: int) -> Optional[OutboxRecord]:
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
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE anchor_outbox
                SET status = ?, tx_nonce = ?, updated_at = ?
                WHERE id = ?
                """,
                (OutboxStatus.ANCHOR_PREPARED.value, tx_nonce, now, record_id),
            )
            conn.commit()

    def mark_submitted(self, record_id: str, tx_hash: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE anchor_outbox
                SET status = ?, tx_hash = ?, updated_at = ?
                WHERE id = ?
                """,
                (OutboxStatus.ANCHOR_SUBMITTED.value, tx_hash, now, record_id),
            )
            conn.commit()

    def mark_confirming(self, record_id: str, block_number: int, block_hash: str, confirmation_count: int) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE anchor_outbox
                SET status = ?, block_number = ?, block_hash = ?, confirmation_count = ?, updated_at = ?
                WHERE id = ?
                """,
                (OutboxStatus.CONFIRMING.value, block_number, block_hash, confirmation_count, now, record_id),
            )
            conn.commit()

    def mark_finalized(self, record_id: str, block_number: int, block_hash: str, confirmation_count: int) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE anchor_outbox
                SET status = ?, block_number = ?, block_hash = ?, confirmation_count = ?, updated_at = ?
                WHERE id = ?
                """,
                (OutboxStatus.ANCHOR_FINALIZED.value, block_number, block_hash, confirmation_count, now, record_id),
            )
            conn.commit()

    def reset_to_pending(self, record_id: str, reason: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE anchor_outbox
                SET status = ?, block_number = NULL, block_hash = NULL, confirmation_count = 0,
                    error_message = ?, updated_at = ?
                WHERE id = ?
                """,
                (OutboxStatus.ANCHOR_PENDING.value, reason, now, record_id),
            )
            conn.commit()

    def mark_failed(self, record_id: str, error_message: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE anchor_outbox
                SET status = ?, error_message = ?, updated_at = ?
                WHERE id = ?
                """,
                (OutboxStatus.FAILED.value, error_message, now, record_id),
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
