from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Callable, TypeVar


T = TypeVar("T")


SCHEMA = """
CREATE TABLE IF NOT EXISTS elections (
    election_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    state TEXT NOT NULL,
    manifest_digest TEXT,
    manifest_json TEXT,
    created_at TEXT NOT NULL,
    closed_at TEXT,
    next_leaf_index INTEGER NOT NULL DEFAULT 0,
    final_tree_size INTEGER
);

CREATE TABLE IF NOT EXISTS candidates (
    election_id TEXT NOT NULL REFERENCES elections(election_id),
    candidate_id TEXT NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (election_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS roster_members (
    election_id TEXT NOT NULL REFERENCES elections(election_id),
    student_id TEXT NOT NULL,
    PRIMARY KEY (election_id, student_id)
);

CREATE TABLE IF NOT EXISTS credential_authorizations (
    election_id TEXT NOT NULL REFERENCES elections(election_id),
    student_id TEXT NOT NULL,
    credential_digest TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    PRIMARY KEY (election_id, student_id),
    UNIQUE (election_id, credential_digest)
);

CREATE TABLE IF NOT EXISTS ballot_records (
    election_id TEXT NOT NULL REFERENCES elections(election_id),
    ballot_id TEXT NOT NULL,
    leaf_index INTEGER NOT NULL,
    manifest_digest TEXT NOT NULL,
    credential_digest TEXT NOT NULL,
    encrypted_ballot TEXT NOT NULL,
    proof_artifact TEXT NOT NULL,
    canonical_leaf TEXT NOT NULL,
    record_digest TEXT NOT NULL,
    accepted_at TEXT NOT NULL,
    PRIMARY KEY (election_id, ballot_id),
    UNIQUE (election_id, leaf_index),
    UNIQUE (election_id, credential_digest)
);

CREATE TABLE IF NOT EXISTS outbox_events (
    event_id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL REFERENCES elections(election_id),
    leaf_index INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    record_digest TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'ACKNOWLEDGED')),
    created_at TEXT NOT NULL,
    UNIQUE (election_id, leaf_index)
);

CREATE TABLE IF NOT EXISTS audit_events (
    event_id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    detail_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


class Database:
    """SQLite adapter with a serialized write transaction for local tests."""

    def __init__(self, path: str | Path):
        self.path = str(path)
        if self.path == ":memory:":
            raise ValueError("Use a file-backed SQLite database for concurrent tests")
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            self.path,
            timeout=30,
            isolation_level=None,
            check_same_thread=False,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 30000")
        return connection

    def initialize(self) -> None:
        connection = self.connect()
        try:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.executescript(SCHEMA)
        finally:
            connection.close()
    def write(self, operation: Callable[[sqlite3.Connection], T]) -> T:
        last_locked_error: sqlite3.OperationalError | None = None
        for attempt in range(8):
            connection = self.connect()
            try:
                connection.execute("BEGIN IMMEDIATE")
                result = operation(connection)
                connection.execute("COMMIT")
                return result
            except sqlite3.OperationalError as error:
                connection.execute("ROLLBACK")
                if "locked" not in str(error).lower():
                    raise
                last_locked_error = error
                time.sleep(0.02 * (attempt + 1))
            except Exception:
                connection.execute("ROLLBACK")
                raise
            finally:
                connection.close()
        assert last_locked_error is not None
        raise last_locked_error

    def read(self, operation: Callable[[sqlite3.Connection], T]) -> T:
        connection = self.connect()
        try:
            return operation(connection)
        finally:
            connection.close()
