"""
Identity cluster simulation matching Section 5.1 and Section 6.1 of prompt.md.
Implements frozen roster verification, atomic credential slot reservation,
crash recovery hooks, and idempotent issuance replay.
"""

import threading
from datetime import datetime, timezone
from typing import Dict, Optional, Set
from .crypto import BlindCredentialIssuer, sha256_digest


class IssuanceSlot:
    """Represents a student issuance reservation in identity database."""

    def __init__(self, election_id: str, student_id: str, blinded_request: str):
        self.election_id = election_id
        self.student_id = student_id
        self.blinded_request = blinded_request
        self.request_digest = sha256_digest(blinded_request.encode("utf_8"))
        self.status = "RESERVED"
        self.blind_signature_response: Optional[str] = None
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.updated_at = self.created_at


class IdentityCluster:
    """
    Simulates identity origin service.
    Contains users and student rosters, strictly separated from casting database.
    """

    def __init__(self, election_id: str, cutoff_utc: Optional[datetime] = None):
        self.election_id = election_id
        self.cutoff_utc = cutoff_utc
        self.issuer = BlindCredentialIssuer(election_id)
        self.frozen_roster: Set[str] = set()
        self.slots: Dict[str, IssuanceSlot] = {}
        self.lock = threading.Lock()
        self.crash_trigger_before_sign = False
        self.crash_trigger_after_sign = False

    def add_approved_student(self, student_id: str) -> None:
        """Add verified student to frozen roster snapshot."""
        self.frozen_roster.add(student_id)

    def issue_credential(
        self,
        student_id: str,
        blinded_request: str,
        current_time_utc: Optional[datetime] = None
    ) -> Dict[str, str]:
        """
        Execute atomic credential issuance matching Section 6.1.
        Returns dict with status and signature payload.
        """
        now = current_time_utc or datetime.now(timezone.utc)
        if self.cutoff_utc and now > self.cutoff_utc:
            raise PermissionError("Issuance window closed past cutoff time")

        with self.lock:
            # Step 1: Verify eligibility in frozen roster snapshot
            if student_id not in self.frozen_roster:
                raise PermissionError("Student not in approved frozen roster snapshot")

            # Step 2: Check existing slot reservation
            slot = self.slots.get(student_id)
            if slot is not None:
                # Idempotent replay check
                incoming_digest = sha256_digest(blinded_request.encode("utf_8"))
                if incoming_digest == slot.request_digest:
                    if slot.status in ("SIGNED", "DELIVERED"):
                        slot.status = "DELIVERED"
                        return {
                            "status": "DELIVERED",
                            "blind_signature": str(slot.blind_signature_response),
                            "issuer_key_id": self.issuer.issuer_key_id
                        }
                    if slot.status == "RESERVED":
                        # Recovering in progress request
                        pass
                else:
                    raise ValueError("Different blinded request rejected for existing student slot")

            if slot is None:
                slot = IssuanceSlot(self.election_id, student_id, blinded_request)
                self.slots[student_id] = slot

            # Step 3: Handle crash before sign simulation
            if self.crash_trigger_before_sign:
                self.crash_trigger_before_sign = False
                raise RuntimeError("Simulated crash before sign")

            slot.status = "SIGNING"
            sig = self.issuer.sign_blinded_request(blinded_request)
            slot.blind_signature_response = sig
            slot.status = "SIGNED"

            # Step 4: Handle crash after sign simulation
            if self.crash_trigger_after_sign:
                self.crash_trigger_after_sign = False
                raise RuntimeError("Simulated crash after sign")

            slot.status = "DELIVERED"
            return {
                "status": "DELIVERED",
                "blind_signature": sig,
                "issuer_key_id": self.issuer.issuer_key_id
            }

    def recover_from_crash(self, student_id: str) -> None:
        """
        Audit and reprocess crashed slots during restart.
        Ensures never issuing a second signature for a different request.
        """
        with self.lock:
            slot = self.slots.get(student_id)
            if slot is None:
                return
            if slot.status == "RESERVED":
                # Persisted request can now proceed
                sig = self.issuer.sign_blinded_request(slot.blinded_request)
                slot.blind_signature_response = sig
                slot.status = "DELIVERED"
            elif slot.status == "SIGNED":
                slot.status = "DELIVERED"
