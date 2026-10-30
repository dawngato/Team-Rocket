"""
Pydantic v2 schemas for HimVote casting service request and response payloads.
Conforms strictly to packages openapi himvote.openapi.yaml specification.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class BallotStatus(str, Enum):
    """
    Status values for ballot processing lifecycle.
    """
    COMMITTED_PENDING_WITNESS = "COMMITTED_PENDING_WITNESS"
    WITNESSED = "WITNESSED"
    ANCHORED = "ANCHORED"
    REJECTED = "REJECTED"


class CastBallotRequest(BaseModel):
    """
    Client request model to cast an encrypted ballot anonymously.
    Carries zero user identity or tracker tokens.
    """
    model_config = ConfigDict(extra="forbid")

    election_id: str = Field(
        ...,
        description="Target election identifier",
        min_length=1,
        max_length=64
    )
    credential_proof_b64url: str = Field(
        ...,
        description="Anonymous credential proof encoded in base64url",
        min_length=1,
        max_length=262144
    )
    engine_ballot_b64url: str = Field(
        ...,
        description="Encrypted ballot payload from voting engine encoded in base64url",
        min_length=1,
        max_length=262144
    )
    engine_proofs_b64url: str = Field(
        ...,
        description="Zero knowledge proof payload from voting engine encoded in base64url",
        min_length=1,
        max_length=262144
    )
    idempotency_key: str = Field(
        ...,
        description="Client generated idempotency token for safe network retries",
        min_length=1,
        max_length=128
    )


class CastBallotResponse(BaseModel):
    """
    Response returned when a ballot is accepted and committed into the leaf log.
    """
    model_config = ConfigDict(extra="ignore")

    status: BallotStatus = Field(
        default=BallotStatus.COMMITTED_PENDING_WITNESS,
        description="Initial state of committed ballot prior to witness aggregation"
    )
    handle: str = Field(
        ...,
        description="Unguessable opaque handle for receipt tracking"
    )
    leaf_index: int = Field(
        ...,
        description="Strictly monotonic zero indexed leaf position in the Merkle log",
        ge=0
    )
    nullifier_commitment: str = Field(
        ...,
        description="Public commitment to the credential nullifier"
    )


class ReceiptStatusResponse(BaseModel):
    """
    Public receipt status lookup model by opaque handle.
    Reveals no identity and no ballot choices.
    """
    model_config = ConfigDict(extra="ignore")

    status: BallotStatus = Field(
        ...,
        description="Current verification status of the ballot receipt"
    )
    handle: str = Field(
        ...,
        description="Opaque receipt handle"
    )
    leaf_index: int = Field(
        ...,
        description="Committed leaf position in the Merkle tree",
        ge=0
    )
    witnessed_at_utc: Optional[datetime] = Field(
        default=None,
        description="Timestamp when witness acknowledgement was recorded"
    )


class ErrorDetail(BaseModel):
    """
    Standard error response format.
    """
    error_code: str
    message: str
