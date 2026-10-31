"""HimVote development election-engine adapter service.

This service is a custom protocol test harness. It is never advertised as an
established or independently vetted voting engine.
"""

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

try:
    from .adapter import (
        BallotValidationError,
        CredentialValidationError,
        DuplicateNullifierError,
        InclusionVerificationError,
        TallyVerificationError,
        VotingEngineAdapter,
    )
    from .constants import G, PROTOCOL_VERSION
except (ImportError, ValueError):
    from adapter import (
        BallotValidationError,
        CredentialValidationError,
        DuplicateNullifierError,
        InclusionVerificationError,
        TallyVerificationError,
        VotingEngineAdapter,
    )
    from constants import G, PROTOCOL_VERSION

logging.basicConfig(level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO))
logger = logging.getLogger("election_engine")

ENGINE_PROVIDER = os.getenv("VOTING_ENGINE_PROVIDER", PROTOCOL_VERSION)
ENGINE_VERSION = os.getenv("VOTING_ENGINE_VERSION", "1.0.0")
ENGINE_JOINT_PUBLIC_KEY = os.getenv("ENGINE_JOINT_PUBLIC_KEY", hex(G))
# This service currently implements only the custom development protocol.
# Environment labels cannot promote it to an established engine.
if ENGINE_PROVIDER not in {PROTOCOL_VERSION, "custom_development_unverified", "local_vetted"}:
    raise RuntimeError(f"Unsupported voting engine provider: {ENGINE_PROVIDER}")
ENGINE_ESTABLISHED = False
if os.getenv("APP_ENV", "development").lower() == "production":
    raise RuntimeError("The custom development engine is not approved for production elections")

adapter_instance = VotingEngineAdapter()

# Schema definitions

class ValidateBallotRequest(BaseModel):
    election_id: str
    manifest_digest: str
    ballot_b64url: str
    proofs_b64url: str


class ValidateBallotResponse(BaseModel):
    valid: bool
    reason: Optional[str] = None


class VerifyCredentialRequest(BaseModel):
    election_id: str
    manifest_digest: str
    credential_proof_b64url: str
    issuer_public_key: Dict[str, Any]


class VerifyCredentialResponse(BaseModel):
    valid: bool
    nullifier: Optional[str] = None


class ExportBallotsRequest(BaseModel):
    election_id: str
    manifest_digest: str


class ExportBallotsResponse(BaseModel):
    schema_name: str
    election_id: str
    manifest_digest: str
    ballot_count: int
    merkle_root: str
    ballots: List[Dict[str, Any]]


class VerifyTallyRequest(BaseModel):
    manifest: Dict[str, Any]
    exported_ballots: Dict[str, Any]
    tally_result: Dict[str, Any]
    trustee_proofs: Dict[str, Any]


class VerifyTallyResponse(BaseModel):
    valid: bool


class VerifyInclusionRequest(BaseModel):
    manifest: Dict[str, Any]
    leaf_hash: str
    leaf_index: int
    proof: List[Dict[str, str]]
    merkle_root: str


class VerifyInclusionResponse(BaseModel):
    valid: bool


class EncryptBallotRequest(BaseModel):
    election_id: str
    manifest_digest: str
    candidates: List[str]
    selected_candidate_id: str
    joint_public_key: Optional[str] = None


class EncryptBallotResponse(BaseModel):
    ballot_b64url: str
    proofs_b64url: str
    tracking_code: str
    ballot_data: Dict[str, Any]
    proofs_data: Dict[str, Any]


class ProtocolVersionResponse(BaseModel):
    provider: str
    version: str
    supports_revoting_prevention: bool
    supports_web_booth: bool
    established_protocol: bool


class PublicParametersResponse(BaseModel):
    provider: str
    version: str
    protocol: str
    joint_public_key: str
    established_protocol: bool


# Application routing

app = FastAPI(title="HimVote Election Engine Adapter", version="2.0.0")


@app.on_event("startup")
def startup() -> None:
    logger.info("Election engine adapter active with provider %s", ENGINE_PROVIDER)


@app.get("/health", tags=["admin"])
def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "election_engine", "provider": ENGINE_PROVIDER}


@app.post("/v1/engine/encrypt_ballot", response_model=EncryptBallotResponse, tags=["booth"])
def encrypt_ballot_endpoint(req: EncryptBallotRequest) -> EncryptBallotResponse:
    """Create an encrypted exponential ElGamal ballot with zero knowledge proofs."""
    try:
        try:
            from .booth import create_encrypted_ballot
            from .crypto import base64url_encode, canonical_json
            from .constants import DEFAULT_JOINT_PUBLIC_KEY
        except (ImportError, ValueError):
            from booth import create_encrypted_ballot
            from crypto import base64url_encode, canonical_json
            from constants import DEFAULT_JOINT_PUBLIC_KEY

        pubkey_int = int(req.joint_public_key, 16) if req.joint_public_key else DEFAULT_JOINT_PUBLIC_KEY
        ballot_data, proofs_data, tracking_code = create_encrypted_ballot(
            election_id=req.election_id,
            manifest_digest=req.manifest_digest,
            candidates=req.candidates,
            selected_candidate_id=req.selected_candidate_id,
            joint_public_key=pubkey_int,
        )
        ballot_b64url = base64url_encode(canonical_json(ballot_data))
        proofs_b64url = base64url_encode(canonical_json(proofs_data))
        return EncryptBallotResponse(
            ballot_b64url=ballot_b64url,
            proofs_b64url=proofs_b64url,
            tracking_code=tracking_code,
            ballot_data=ballot_data,
            proofs_data=proofs_data,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/v1/engine/validate_ballot", response_model=ValidateBallotResponse, tags=["engine"])
def validate_ballot_endpoint(req: ValidateBallotRequest) -> ValidateBallotResponse:
    """Validate an encrypted ballot and its zero knowledge proofs."""
    try:
        raw_ballot = base64.urlsafe_b64decode(req.ballot_b64url + "==").decode("utf_8")
        raw_proofs = base64.urlsafe_b64decode(req.proofs_b64url + "==").decode("utf_8")
        ballot_data = json.loads(raw_ballot)
        proofs_data = json.loads(raw_proofs)
        if proofs_data.get("public_key") != ENGINE_JOINT_PUBLIC_KEY:
            return ValidateBallotResponse(valid=False, reason="Ballot public key does not match the configured election engine key")
        adapter_instance.validate_ballot(
            election_id=req.election_id,
            manifest_digest=req.manifest_digest,
            ballot_data=ballot_data,
            proofs_data=proofs_data,
        )
        return ValidateBallotResponse(valid=True, reason=None)
    except BallotValidationError as exc:
        return ValidateBallotResponse(valid=False, reason=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/v1/engine/verify_credential", response_model=VerifyCredentialResponse, tags=["engine"])
def verify_credential_endpoint(req: VerifyCredentialRequest) -> VerifyCredentialResponse:
    """Verify an anonymous credential proof and derive nullifier."""
    try:
        raw_cred = base64.urlsafe_b64decode(req.credential_proof_b64url + "==").decode("utf_8")
        cred_data = json.loads(raw_cred)
        valid, nullifier = adapter_instance.verify_credential(
            election_id=req.election_id,
            manifest_digest=req.manifest_digest,
            credential_proof_data=cred_data,
            issuer_public_key=req.issuer_public_key,
        )
        return VerifyCredentialResponse(valid=valid, nullifier=nullifier)
    except (CredentialValidationError, DuplicateNullifierError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/v1/engine/export_ballots", response_model=ExportBallotsResponse, tags=["engine"])
def export_ballots_endpoint(req: ExportBallotsRequest) -> ExportBallotsResponse:
    """Export all native proof artifacts and canonical records."""
    exported = adapter_instance.export_ballots(
        election_id=req.election_id,
        manifest_digest=req.manifest_digest,
    )
    return ExportBallotsResponse(
        schema_name=exported["schema"],
        election_id=exported["election_id"],
        manifest_digest=exported["manifest_digest"],
        ballot_count=exported["ballot_count"],
        merkle_root=exported["merkle_root"],
        ballots=exported["ballots"],
    )


@app.post("/v1/engine/verify_tally", response_model=VerifyTallyResponse, tags=["engine"])
def verify_tally_endpoint(req: VerifyTallyRequest) -> VerifyTallyResponse:
    """Run independent homomorphic tally verification."""
    try:
        valid = adapter_instance.verify_tally(
            manifest=req.manifest,
            exported_ballots=req.exported_ballots,
            tally_result=req.tally_result,
            trustee_proofs=req.trustee_proofs,
        )
        return VerifyTallyResponse(valid=valid)
    except TallyVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/v1/engine/verify_inclusion", response_model=VerifyInclusionResponse, tags=["engine"])
def verify_inclusion_endpoint(req: VerifyInclusionRequest) -> VerifyInclusionResponse:
    """Verify RFC 9162 Merkle log inclusion proof."""
    try:
        valid = adapter_instance.verify_inclusion(
            manifest=req.manifest,
            leaf_hash=req.leaf_hash,
            leaf_index=req.leaf_index,
            merkle_proof=req.proof,
            merkle_root=req.merkle_root,
        )
        return VerifyInclusionResponse(valid=valid)
    except InclusionVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.get("/v1/engine/protocol_version", response_model=ProtocolVersionResponse, tags=["engine"])
def get_protocol_version_endpoint() -> ProtocolVersionResponse:
    """Get the engine protocol version and capabilities."""
    return ProtocolVersionResponse(
        provider=ENGINE_PROVIDER,
        version=ENGINE_VERSION,
        supports_revoting_prevention=True,
        supports_web_booth=True,
        established_protocol=ENGINE_ESTABLISHED,
    )


@app.get("/v1/engine/public_parameters", response_model=PublicParametersResponse, tags=["engine"])
def get_public_parameters_endpoint() -> PublicParametersResponse:
    """Return the public election parameters required by the browser booth."""
    return PublicParametersResponse(
        provider=ENGINE_PROVIDER,
        version=ENGINE_VERSION,
        protocol=PROTOCOL_VERSION,
        joint_public_key=ENGINE_JOINT_PUBLIC_KEY,
        established_protocol=ENGINE_ESTABLISHED,
    )
