from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

from .db import Database
from .models import BallotSubmission, CandidateView, ElectionState, ElectionView, Role


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    """Deterministic JSON for the versioned evidence wrapper.

    This is an integrity serialization helper, not a voting protocol. It
    intentionally does not implement ballot encryption or tally proofs.
    """

    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Actor:
    role: Role
    actor_id: str


class DomainError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 409):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


ADMIN_ROLES = {Role.ADMIN, Role.ELECTION_OFFICER}
ROSTER_APPROVER_ROLES = {Role.ADMIN, Role.TEACHER}


class HimVoteService:
    def __init__(self, database: Database):
        self.database = database

    @staticmethod
    def _require_role(actor: Actor, allowed: set[Role]) -> None:
        if actor.role not in allowed:
            raise DomainError("FORBIDDEN_SCOPE", "This role cannot perform the requested action", 403)

    @staticmethod
    def _election_or_error(connection: sqlite3.Connection, election_id: str) -> sqlite3.Row:
        election = connection.execute(
            "SELECT * FROM elections WHERE election_id = ?", (election_id,)
        ).fetchone()
        if election is None:
            raise DomainError("ELECTION_NOT_FOUND", "Election does not exist", 404)
        return election

    @staticmethod
    def _require_state(election: sqlite3.Row, expected: ElectionState, action: str) -> None:
        actual = ElectionState(election["state"])
        if actual != expected:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot {action} while election is {actual.value}; expected {expected.value}",
                409,
            )

    @staticmethod
    def _audit(
        connection: sqlite3.Connection,
        election_id: str,
        event_type: str,
        actor: Actor,
        detail: dict[str, Any],
    ) -> None:
        connection.execute(
            """
            INSERT INTO audit_events
              (event_id, election_id, event_type, actor_role, actor_id, detail_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                election_id,
                event_type,
                actor.role.value,
                actor.actor_id,
                canonical_json(detail),
                utc_now(),
            ),
        )
    def create_election(self, actor: Actor, title: str) -> ElectionView:
        self._require_role(actor, ADMIN_ROLES)
        election_id = str(uuid.uuid4())

        def operation(connection: sqlite3.Connection) -> ElectionView:
            connection.execute(
                "INSERT INTO elections (election_id, title, state, created_at) VALUES (?, ?, ?, ?)",
                (election_id, title, ElectionState.DRAFT.value, utc_now()),
            )
            self._audit(connection, election_id, "ELECTION_CREATED", actor, {"title": title})
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def add_candidate(self, actor: Actor, election_id: str, candidate_id: str, name: str) -> ElectionView:
        self._require_role(actor, ADMIN_ROLES)

        def operation(connection: sqlite3.Connection) -> ElectionView:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.DRAFT, "edit candidates")
            try:
                connection.execute(
                    "INSERT INTO candidates (election_id, candidate_id, name) VALUES (?, ?, ?)",
                    (election_id, candidate_id, name),
                )
            except sqlite3.IntegrityError as error:
                raise DomainError("CANDIDATE_ALREADY_EXISTS", "Candidate ID is already used", 409) from error
            self._audit(connection, election_id, "CANDIDATE_ADDED", actor, {"candidate_id": candidate_id})
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def set_roster(self, actor: Actor, election_id: str, student_ids: Iterable[str]) -> ElectionView:
        self._require_role(actor, ADMIN_ROLES)
        roster = list(student_ids)
        if not roster or len(set(roster)) != len(roster):
            raise DomainError("INVALID_ROSTER", "Roster must contain at least one unique student ID", 422)

        def operation(connection: sqlite3.Connection) -> ElectionView:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.DRAFT, "edit the roster")
            connection.execute("DELETE FROM roster_members WHERE election_id = ?", (election_id,))
            connection.executemany(
                "INSERT INTO roster_members (election_id, student_id) VALUES (?, ?)",
                [(election_id, student_id) for student_id in roster],
            )
            self._audit(connection, election_id, "ROSTER_SUBMITTED", actor, {"roster_count": len(roster)})
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def approve_roster(self, actor: Actor, election_id: str) -> ElectionView:
        if actor.role not in ROSTER_APPROVER_ROLES:
            raise DomainError("FORBIDDEN_SCOPE", "This role cannot approve a roster", 403)

        def operation(connection: sqlite3.Connection) -> ElectionView:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.DRAFT, "approve the roster")
            count = connection.execute(
                "SELECT COUNT(*) FROM roster_members WHERE election_id = ?", (election_id,)
            ).fetchone()[0]
            if count == 0:
                raise DomainError("ROSTER_EMPTY", "A non-empty roster is required", 422)
            connection.execute(
                "UPDATE elections SET state = ? WHERE election_id = ?",
                (ElectionState.ROSTER_APPROVED.value, election_id),
            )
            self._audit(connection, election_id, "ROSTER_APPROVED", actor, {"roster_count": count})
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def provision_credential(
        self, actor: Actor, election_id: str, student_id: str, credential_token: str
    ) -> None:
        self._require_role(actor, ADMIN_ROLES)
        credential_digest = sha256_text(credential_token)

        def operation(connection: sqlite3.Connection) -> None:
            election = self._election_or_error(connection, election_id)
            if ElectionState(election["state"]) not in {ElectionState.ROSTER_APPROVED, ElectionState.FROZEN}:
                raise DomainError(
                    "INVALID_TRANSITION",
                    "Credentials can only be provisioned after roster approval and before voting",
                    409,
                )
            member = connection.execute(
                "SELECT 1 FROM roster_members WHERE election_id = ? AND student_id = ?",
                (election_id, student_id),
            ).fetchone()
            if member is None:
                raise DomainError("NOT_ELIGIBLE", "Student is not in the approved roster", 403)
            try:
                connection.execute(
                    """
                    INSERT INTO credential_authorizations
                      (election_id, student_id, credential_digest, issued_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (election_id, student_id, credential_digest, utc_now()),
                )
            except sqlite3.IntegrityError as error:
                raise DomainError(
                    "CREDENTIAL_ALREADY_ISSUED",
                    "This student already has one synthetic authorization for the election",
                    409,
                ) from error
            self._audit(connection, election_id, "CREDENTIAL_PROVISIONED", actor, {"student_id": student_id})

        self.database.write(operation)

    def freeze(self, actor: Actor, election_id: str) -> ElectionView:
        self._require_role(actor, ADMIN_ROLES)

        def operation(connection: sqlite3.Connection) -> ElectionView:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.ROSTER_APPROVED, "freeze the election")
            candidates = connection.execute(
                "SELECT candidate_id, name FROM candidates WHERE election_id = ? ORDER BY candidate_id",
                (election_id,),
            ).fetchall()
            if not candidates:
                raise DomainError("CANDIDATES_REQUIRED", "At least one candidate is required", 422)
            roster = connection.execute(
                "SELECT student_id FROM roster_members WHERE election_id = ? ORDER BY student_id",
                (election_id,),
            ).fetchall()
            roster_digest = sha256_text("\n".join(row["student_id"] for row in roster))
            manifest = {
                "schema": "himvote.integrity-manifest.v1",
                "election_id": election_id,
                "title": election["title"],
                "candidate_ids": [row["candidate_id"] for row in candidates],
                "roster_count": len(roster),
                "roster_digest": roster_digest,
                "ballot_policy": "one accepted synthetic authorization",
                "engine_profile": "INTEGRITY_ONLY_NO_VETTED_ENGINE",
            }
            manifest_json = canonical_json(manifest)
            manifest_digest = sha256_text(manifest_json)
            connection.execute(
                """
                UPDATE elections
                SET state = ?, manifest_digest = ?, manifest_json = ?
                WHERE election_id = ?
                """,
                (ElectionState.FROZEN.value, manifest_digest, manifest_json, election_id),
            )
            self._audit(
                connection,
                election_id,
                "MANIFEST_FROZEN",
                actor,
                {"manifest_digest": manifest_digest, "roster_count": len(roster)},
            )
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def open_election(self, actor: Actor, election_id: str) -> ElectionView:
        self._require_role(actor, ADMIN_ROLES)

        def operation(connection: sqlite3.Connection) -> ElectionView:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.FROZEN, "open the election")
            connection.execute(
                "UPDATE elections SET state = ? WHERE election_id = ?",
                (ElectionState.OPEN.value, election_id),
            )
            self._audit(connection, election_id, "ELECTION_OPENED", actor, {})
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def close_election(self, actor: Actor, election_id: str) -> ElectionView:
        self._require_role(actor, ADMIN_ROLES)

        def operation(connection: sqlite3.Connection) -> ElectionView:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.OPEN, "close the election")
            closed_at = utc_now()
            final_tree_size = int(election["next_leaf_index"])
            connection.execute(
                """
                UPDATE elections
                SET state = ?, closed_at = ?, final_tree_size = ?
                WHERE election_id = ?
                """,
                (ElectionState.CLOSED.value, closed_at, final_tree_size, election_id),
            )
            self._audit(
                connection,
                election_id,
                "ELECTION_CLOSED",
                actor,
                {"final_tree_size": final_tree_size},
            )
            return self._view_from_connection(connection, election_id)

        return self.database.write(operation)

    def cast_ballot(self, actor: Actor, election_id: str, submission: BallotSubmission) -> dict[str, Any]:
        if actor.role != Role.STUDENT:
            raise DomainError("FORBIDDEN_SCOPE", "Only a synthetic student can cast a ballot", 403)
        credential_digest = sha256_text(submission.credential_token)

        def operation(connection: sqlite3.Connection) -> dict[str, Any]:
            election = self._election_or_error(connection, election_id)
            self._require_state(election, ElectionState.OPEN, "cast a ballot")
            authorization = connection.execute(
                """
                SELECT 1 FROM credential_authorizations
                WHERE election_id = ? AND credential_digest = ?
                """,
                (election_id, credential_digest),
            ).fetchone()
            if authorization is None:
                raise DomainError(
                    "CREDENTIAL_NOT_AUTHORIZED",
                    "The opaque synthetic authorization is not valid for this election",
                    403,
                )
            prior = connection.execute(
                """
                SELECT ballot_id FROM ballot_records
                WHERE election_id = ? AND credential_digest = ?
                """,
                (election_id, credential_digest),
            ).fetchone()
            if prior is not None:
                raise DomainError(
                    "BALLOT_ALREADY_ACCEPTED",
                    "This authorization already has one accepted ballot",
                    409,
                )

            ballot_id = str(uuid.uuid4())
            leaf_index = int(election["next_leaf_index"])
            evidence = {
                "schema": "himvote.ballot-evidence.v1",
                "election_id": election_id,
                "manifest_digest": election["manifest_digest"],
                "ballot_id": ballot_id,
                "leaf_index": leaf_index,
                "credential_digest": credential_digest,
                "encrypted_ballot_artifact": submission.encrypted_ballot,
                "proof_artifact": submission.proof_artifact,
                "engine_profile": "INTEGRITY_ONLY_NO_VETTED_ENGINE",
            }
            canonical_leaf = canonical_json(evidence)
            record_digest = sha256_text(canonical_leaf)
            accepted_at = utc_now()
            try:
                connection.execute(
                    """
                    INSERT INTO ballot_records
                      (election_id, ballot_id, leaf_index, manifest_digest,
                       credential_digest, encrypted_ballot, proof_artifact,
                       canonical_leaf, record_digest, accepted_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        election_id,
                        ballot_id,
                        leaf_index,
                        election["manifest_digest"],
                        credential_digest,
                        submission.encrypted_ballot,
                        submission.proof_artifact,
                        canonical_leaf,
                        record_digest,
                        accepted_at,
                    ),
                )
                connection.execute(
                    "UPDATE elections SET next_leaf_index = ? WHERE election_id = ?",
                    (leaf_index + 1, election_id),
                )
                connection.execute(
                    """
                    INSERT INTO outbox_events
                      (event_id, election_id, leaf_index, event_type, record_digest,
                       payload_json, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        election_id,
                        leaf_index,
                        "BALLOT_ACCEPTED",
                        record_digest,
                        canonical_leaf,
                        "PENDING",
                        accepted_at,
                    ),
                )
            except sqlite3.IntegrityError as error:
                raise DomainError(
                    "BALLOT_ALREADY_ACCEPTED",
                    "This authorization already has one accepted ballot",
                    409,
                ) from error

            return {
                "receipt_id": ballot_id,
                "status": "ACCEPTED_PENDING_WITNESS",
                "leaf_index": leaf_index,
                "evidence_digest": record_digest,
                "message": "Accepted by the casting database; independent witnessing is still pending.",
            }

        return self.database.write(operation)

    def get_receipt(self, receipt_id: str) -> dict[str, Any]:
        def operation(connection: sqlite3.Connection) -> dict[str, Any]:
            row = connection.execute(
                """
                SELECT ballot_id, election_id, leaf_index, record_digest
                FROM ballot_records WHERE ballot_id = ?
                """,
                (receipt_id,),
            ).fetchone()
            if row is None:
                raise DomainError("RECEIPT_NOT_FOUND", "Receipt was not found", 404)
            return {
                "receipt_id": row["ballot_id"],
                "election_id": row["election_id"],
                "status": "ACCEPTED_PENDING_WITNESS",
                "leaf_index": row["leaf_index"],
                "evidence_digest": row["record_digest"],
                "message": "Accepted by the casting database; independent witnessing is still pending.",
            }

        return self.database.read(operation)

    def get_election(self, election_id: str) -> ElectionView:
        return self.database.read(lambda connection: self._view_from_connection(connection, election_id))

    def health(self) -> dict[str, Any]:
        def operation(connection: sqlite3.Connection) -> dict[str, Any]:
            pending = connection.execute(
                "SELECT COUNT(*) FROM outbox_events WHERE status = 'PENDING'"
            ).fetchone()[0]
            connection.execute("SELECT 1").fetchone()
            return {
                "status": "ok",
                "service": "himvote-api",
                "storage": "sqlite",
                "pending_outbox_events": pending,
            }

        return self.database.read(operation)

    def ballot_count(self, election_id: str) -> int:
        return self.database.read(
            lambda connection: connection.execute(
                "SELECT COUNT(*) FROM ballot_records WHERE election_id = ?", (election_id,)
            ).fetchone()[0]
        )

    def outbox_count(self, election_id: str) -> int:
        return self.database.read(
            lambda connection: connection.execute(
                "SELECT COUNT(*) FROM outbox_events WHERE election_id = ?", (election_id,)
            ).fetchone()[0]
        )

    def ballot_record_columns(self) -> list[str]:
        return self.database.read(
            lambda connection: [
                row["name"] for row in connection.execute("PRAGMA table_info(ballot_records)")
            ]
        )

    def ballot_record_rows(self, election_id: str) -> list[dict[str, Any]]:
        return self.database.read(
            lambda connection: [
                dict(row)
                for row in connection.execute(
                    "SELECT * FROM ballot_records WHERE election_id = ? ORDER BY leaf_index",
                    (election_id,),
                ).fetchall()
            ]
        )

    def _view_from_connection(self, connection: sqlite3.Connection, election_id: str) -> ElectionView:
        election = self._election_or_error(connection, election_id)
        candidates = [
            CandidateView(candidate_id=row["candidate_id"], name=row["name"])
            for row in connection.execute(
                "SELECT candidate_id, name FROM candidates WHERE election_id = ? ORDER BY candidate_id",
                (election_id,),
            ).fetchall()
        ]
        roster_count = connection.execute(
            "SELECT COUNT(*) FROM roster_members WHERE election_id = ?", (election_id,)
        ).fetchone()[0]
        return ElectionView(
            election_id=election_id,
            title=election["title"],
            state=ElectionState(election["state"]),
            candidates=candidates,
            roster_count=roster_count,
            manifest_digest=election["manifest_digest"],
            closed_at=election["closed_at"],
        )
