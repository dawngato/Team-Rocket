"""
Data models for anchor relayer service.
Includes outbox status and checkpoint representations.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class OutboxStatus(str, Enum):
    """
    Lifecycle status of checkpoint transaction in outbox.
    """
    ANCHOR_PENDING = "ANCHOR_PENDING"
    ANCHOR_PREPARED = "ANCHOR_PREPARED"
    ANCHOR_SUBMITTED = "ANCHOR_SUBMITTED"
    CONFIRMING = "CONFIRMING"
    ANCHOR_FINALIZED = "ANCHOR_FINALIZED"
    FAILED = "FAILED"


@dataclass
class WitnessedCheckpoint:
    """
    Checkpoint verified by witness needing on chain anchoring.
    """
    election_commitment: str
    sequence: int
    digest: str
    previous_digest: str
    is_final: bool
    witness_signature: Optional[str] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if not self.election_commitment.startswith("0x"):
            self.election_commitment = "0x" + self.election_commitment
        if not self.digest.startswith("0x"):
            self.digest = "0x" + self.digest
        if not self.previous_digest.startswith("0x"):
            self.previous_digest = "0x" + self.previous_digest
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)


@dataclass
class OutboxRecord:
    """
    Transactional outbox record tracking checkpoint submission lifecycle.
    """
    id: str
    election_commitment: str
    sequence: int
    digest: str
    previous_digest: str
    is_final: bool
    status: OutboxStatus
    tx_hash: Optional[str] = None
    tx_nonce: Optional[int] = None
    block_number: Optional[int] = None
    block_hash: Optional[str] = None
    confirmation_count: int = 0
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)
        if self.updated_at is None:
            self.updated_at = self.created_at
        if not self.election_commitment.startswith("0x"):
            self.election_commitment = "0x" + self.election_commitment
        if not self.digest.startswith("0x"):
            self.digest = "0x" + self.digest
        if not self.previous_digest.startswith("0x"):
            self.previous_digest = "0x" + self.previous_digest


@dataclass
class AnchorReceipt:
    """
    Receipt details recorded upon confirmation.
    """
    tx_hash: str
    block_number: int
    block_hash: str
    confirmation_count: int
    gas_used: int
    status: int
