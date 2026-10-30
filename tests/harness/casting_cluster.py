"""
Casting cluster simulation matching Section 5.2 and Section 6.3 of prompt.md.
Implements anonymous cast origin, nullifier uniqueness, monotonic leaf index allocation,
immutable ballot store, outbox queue, and race condition handling.
"""

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .crypto import (
    canonical_json_bytes,
    sha256_digest,
    verify_engine_ballot,
    BlindCredentialIssuer
)
from .models import BallotEvidence


class CastReceipt:
    """Receipt tracking casting outcome and witness state."""

    def __init__(self, handle: str, leaf_index: int, election_id: str):
        self.handle = handle
        self.leaf_index = leaf_index
        self.election_id = election_id
        self.status = "COMMITTED_PENDING_WITNESS"
        self.witnessed_at: Optional[str] = None


class CastingCluster:
    """
    Simulates casting cluster origin.
    Strictly isolated from identity data. Contains no student IDs or user sessions.
    """

    def __init__(
        self,
        election_id: str,
        manifest_digest: str,
        issuer: BlindCredentialIssuer,
        opens_at_utc: Optional[datetime] = None,
        closes_at_utc: Optional[datetime] = None,
        max_backlog: int = 1000
    ):
        self.election_id = election_id
        self.manifest_digest = manifest_digest
        self.issuer = issuer
        self.opens_at_utc = opens_at_utc
        self.closes_at_utc = closes_at_utc
        self.max_backlog = max_backlog
        self.state = "OPEN"

        self.next_leaf_index = 0
        self.ballots_by_index: Dict[int, BallotEvidence] = {}
        self.nullifiers_to_leaf: Dict[str, int] = {}
        self.request_digests_to_outcome: Dict[str, Dict[str, Any]] = {}
        self.outbox: List[Dict[str, Any]] = []
        self.receipts: Dict[str, CastReceipt] = {}

        self.lock = threading.Lock()
        self.direct_write_allowed = False
        self.network_drop_simulation = False
        self.outbox_crash_simulation = False

    def cast_ballot(
        self,
        headers: Dict[str, str],
        ballot_evidence: BallotEvidence,
        secret_serial: str,
        current_time_utc: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Execute anonymous ballot casting matching Section 6.3 rules.
        """
        # Rule 1: Strip and reject identity cookies or authorization header
        for h in headers:
            normalized = h.lower()
            if "cookie" in normalized or "authorization" in normalized:
                if "identity" in headers[h].lower() or "bearer" in headers[h].lower():
                    raise PermissionError("Identity tokens forbidden on casting origin")

        now = current_time_utc or datetime.now(timezone.utc)

        # Rule 2: Timing and state checks
        with self.lock:
            if self.state != "OPEN":
                raise RuntimeError(f"Election is {self.state}, casting not allowed")
            if self.opens_at_utc and now < self.opens_at_utc:
                raise RuntimeError("Election voting window has not opened yet")
            if self.closes_at_utc and now > self.closes_at_utc:
                raise RuntimeError("Election voting window is closed")

            # Validate backlog
            unwitnessed_count = len(self.outbox)
            if unwitnessed_count > self.max_backlog:
                raise RuntimeError("Unwitnessed backlog limit reached, pausing cast ingestion")

            # Rule 3: Election and manifest validation
            if ballot_evidence.election_id != self.election_id:
                raise ValueError("Election ID mismatch on ballot evidence")
            if ballot_evidence.manifest_digest != self.manifest_digest:
                raise ValueError("Manifest digest mismatch on ballot evidence")

            # Rule 4: Verify engine ballot and zero knowledge proofs
            valid_engine = verify_engine_ballot(
                ballot_evidence.engine_ballot_b64url,
                ballot_evidence.engine_proofs_b64url,
                self.election_id
            )
            if not valid_engine:
                raise ValueError("Engine ballot ciphertext or zero knowledge proof invalid")

            # Rule 5: Verify anonymous credential proof
            valid_cred = self.issuer.verify_credential(
                self.election_id,
                secret_serial,
                ballot_evidence.credential_proof_b64url
            )
            if not valid_cred:
                raise PermissionError("Credential proof invalid or unauthorized for this election")

            # Rule 6: Request digest and nullifier uniqueness check
            evidence_bytes = canonical_json_bytes(ballot_evidence.model_dump(by_alias=True))
            req_digest = sha256_digest(evidence_bytes)

            nullifier = ballot_evidence.credential_nullifier
            if nullifier in self.nullifiers_to_leaf:
                # Nullifier already spent
                if req_digest in self.request_digests_to_outcome:
                    # Safe idempotent retry: return existing outcome
                    return self.request_digests_to_outcome[req_digest]
                else:
                    # Differing ballot with existing nullifier: reject
                    raise ValueError("Duplicate credential nullifier with different ballot payload")

            # Allocate monotonic leaf index
            assigned_leaf_index = self.next_leaf_index
            self.next_leaf_index += 1

            # Update ballot leaf index to assigned position
            committed_evidence = ballot_evidence.model_copy(update={"leaf_index": assigned_leaf_index})

            # Store ballot and nullifier mapping
            self.ballots_by_index[assigned_leaf_index] = committed_evidence
            self.nullifiers_to_leaf[nullifier] = assigned_leaf_index

            # Enqueue to checkpoint outbox
            outbox_entry = {
                "leaf_index": assigned_leaf_index,
                "ballot_bytes": canonical_json_bytes(committed_evidence.model_dump(by_alias=True)),
                "acknowledged": False
            }
            self.outbox.append(outbox_entry)

            handle = f"handle_{sha256_digest(evidence_bytes)[7:23]}"
            receipt = CastReceipt(handle, assigned_leaf_index, self.election_id)
            self.receipts[handle] = receipt

            outcome = {
                "status": "COMMITTED_PENDING_WITNESS",
                "receipt_handle": handle,
                "leaf_index": assigned_leaf_index,
                "election_id": self.election_id
            }
            self.request_digests_to_outcome[req_digest] = outcome

            if self.network_drop_simulation:
                # Network drops after commit; server committed but response dropped
                pass

            return outcome

    def direct_database_insert(self, leaf_index: int, ballot_evidence: BallotEvidence) -> None:
        """
        Simulate unauthorized direct database write bypassing the cast function.
        Must be rejected by immutable table triggers.
        """
        with self.lock:
            if not self.direct_write_allowed:
                raise PermissionError("Direct database writes denied by table triggers")
            self.ballots_by_index[leaf_index] = ballot_evidence

    def get_receipt_status(self, handle: str) -> Dict[str, Any]:
        """Query receipt state by unguessable handle."""
        receipt = self.receipts.get(handle)
        if not receipt:
            raise KeyError("Unknown receipt handle")
        return {
            "status": receipt.status,
            "leaf_index": receipt.leaf_index,
            "witnessed_at": receipt.witnessed_at
        }

    def acknowledge_witnessed_up_to(self, leaf_index: int, witnessed_at: str) -> None:
        """Update outbox and receipts when witness signs checkpoint."""
        with self.lock:
            for item in self.outbox:
                if item["leaf_index"] <= leaf_index:
                    item["acknowledged"] = True
            for receipt in self.receipts.values():
                if receipt.leaf_index <= leaf_index:
                    receipt.status = "WITNESSED"
                    receipt.witnessed_at = witnessed_at
