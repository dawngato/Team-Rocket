"""
Blind credential issuance router implementing RFC 9474 RSA Blind Signatures.
Enforces one slot per election per student, atomic reservation, and strict replay handling.
"""

import hashlib
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import ISSUER_KEY_ID
from ..models import (
    User,
    ElectionRosterSnapshot,
    RosterMember,
    CredentialIssuanceRecord,
    IssuanceEvent,
)
from ..schemas import (
    BlindedIssuanceRequest,
    BlindedIssuanceResponse,
    IssuanceStatusResponse,
)
from ..crypto.rfc9474 import get_default_issuer
from .deps import get_current_user

logger = logging.getLogger("identity_issuer.credentials")
router = APIRouter(prefix="/v1/credentials", tags=["credentials"])


@router.post("/issue", response_model=BlindedIssuanceResponse, status_code=status.HTTP_200_OK)
def issue_credential(
    req: BlindedIssuanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Issue a blind signature for voting credential per RFC 9474.
    Algorithm:
    1. Check session, MFA where required, membership in frozen roster snapshot, and open window.
    2. Atomic transaction inserting slot as RESERVED with exact blinded request.
    3. Mark SIGNING, sign using RFC 9474 blind signature, store response, mark SIGNED.
    4. Mark DELIVERED and return response.
    5. Duplicate request with identical blinded request returns stored response; different request rejected.
    """
    student_id = current_user.external_id

    # 1. Check frozen roster snapshot
    snapshot = (
        db.query(ElectionRosterSnapshot)
        .filter(
            ElectionRosterSnapshot.election_id == req.election_id,
            ElectionRosterSnapshot.status == "FROZEN",
        )
        .order_by(ElectionRosterSnapshot.roster_version.desc())
        .first()
    )
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Election roster snapshot is not frozen or election does not exist",
        )

    # Check issuance window
    now = datetime.now(timezone.utc)
    if snapshot.issuance_start_utc:
        start_utc = snapshot.issuance_start_utc
        if start_utc.tzinfo is None:
            start_utc = start_utc.replace(tzinfo=timezone.utc)
        if now < start_utc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Issuance window has not opened yet",
            )

    if snapshot.issuance_cutoff_utc:
        cutoff_utc = snapshot.issuance_cutoff_utc
        if cutoff_utc.tzinfo is None:
            cutoff_utc = cutoff_utc.replace(tzinfo=timezone.utc)
        if now > cutoff_utc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Issuance window has closed",
            )

    # Check student membership and verification in frozen roster
    member = (
        db.query(RosterMember)
        .filter(
            RosterMember.election_id == req.election_id,
            RosterMember.roster_version == snapshot.roster_version,
            RosterMember.student_id == student_id,
            RosterMember.verified == True,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student is not eligible in the verified election roster",
        )

    # 2. Check existing issuance record (replay check)
    existing = (
        db.query(CredentialIssuanceRecord)
        .filter(
            CredentialIssuanceRecord.election_id == req.election_id,
            CredentialIssuanceRecord.student_id == student_id,
        )
        .first()
    )

    if existing:
        # Replay with identical blinded request returns stored response
        if existing.blinded_request == req.blinded_request:
            if existing.blind_signature_response:
                if existing.status != "DELIVERED":
                    existing.status = "DELIVERED"
                    db.commit()
                return BlindedIssuanceResponse(
                    blind_signature_response=existing.blind_signature_response,
                    status="DELIVERED",
                )
            # Crash recovery path: persisted request exists but was not finalized
            issuer = get_default_issuer()
            try:
                sig_resp = issuer.blind_sign_base64url(existing.blinded_request)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Blind signing failure: {exc}",
                )
            existing.blind_signature_response = sig_resp
            existing.status = "SIGNED"
            db.commit()
            existing.status = "DELIVERED"
            db.commit()
            return BlindedIssuanceResponse(
                blind_signature_response=sig_resp,
                status="DELIVERED",
            )

        # Different blinded request for same slot is strictly rejected
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Credential already issued for this election. Conflicting blinded request rejected.",
        )

    # Atomic reservation
    request_digest = hashlib.sha256(req.blinded_request.encode("utf-8")).hexdigest()
    record = CredentialIssuanceRecord(
        election_id=req.election_id,
        student_id=student_id,
        blinded_request=req.blinded_request,
        request_digest=request_digest,
        status="RESERVED",
        issuer_key_id=ISSUER_KEY_ID,
        roster_version=snapshot.roster_version,
    )
    db.add(record)
    db.flush()

    db.add(
        IssuanceEvent(
            election_id=req.election_id,
            student_id=student_id,
            event_type="credential_reserved",
        )
    )
    db.commit()

    # 3. Mark SIGNING
    record.status = "SIGNING"
    db.commit()

    # Sign using RFC 9474 blind signature
    issuer = get_default_issuer()
    try:
        blind_signature_response = issuer.blind_sign_base64url(req.blinded_request)
    except Exception as exc:
        logger.error("Blind signing execution failure: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Blind signature execution failure: {exc}",
        )

    # Store response and mark SIGNED
    record.blind_signature_response = blind_signature_response
    record.status = "SIGNED"
    db.add(
        IssuanceEvent(
            election_id=req.election_id,
            student_id=student_id,
            event_type="credential_signed",
        )
    )
    db.commit()

    # 4. Mark DELIVERED and return response
    record.status = "DELIVERED"
    db.add(
        IssuanceEvent(
            election_id=req.election_id,
            student_id=student_id,
            event_type="credential_delivered",
        )
    )
    db.commit()

    # Log only identifiers and state transitions, never cryptographic secrets
    logger.info(
        "Credential issued successfully. election_id=%s, student_id=%s, status=DELIVERED",
        req.election_id,
        student_id,
    )

    return BlindedIssuanceResponse(
        blind_signature_response=blind_signature_response,
        status="DELIVERED",
    )


@router.get("/issuance-status", response_model=IssuanceStatusResponse, status_code=status.HTTP_200_OK)
def get_issuance_status(
    election_id: str = Query(..., description="Election identifier"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve issuance state without leaking secrets or serials.
    Returns status: RESERVED, SIGNING, SIGNED, DELIVERED, or none.
    """
    record = (
        db.query(CredentialIssuanceRecord)
        .filter(
            CredentialIssuanceRecord.election_id == election_id,
            CredentialIssuanceRecord.student_id == current_user.external_id,
        )
        .first()
    )

    if not record:
        return IssuanceStatusResponse(
            election_id=election_id,
            status="none",
            delivered=False,
        )

    return IssuanceStatusResponse(
        election_id=election_id,
        status=record.status,
        delivered=record.status == "DELIVERED",
    )
