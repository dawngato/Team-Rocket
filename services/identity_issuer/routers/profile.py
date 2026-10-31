"""Authenticated self-service profile operations."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..rate_limiter import rate_limiter
from ..schemas import ProfileResponse, ProfileUpdateRequest
from .deps import get_current_user, record_audit_event

logger = logging.getLogger("identity_issuer.profile")
router = APIRouter(prefix="/v1/profile", tags=["profile"])


def _profile_response(user: User) -> ProfileResponse:
    return ProfileResponse(
        id=user.id,
        display_name=user.display_name,
        phone_number=user.phone_number,
        updated_at=user.updated_at,
    )


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)) -> ProfileResponse:
    """Return editable profile attributes for the authenticated account."""
    return _profile_response(current_user)


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Update only allowlisted attributes on the authenticated account."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="At least one editable profile field is required",
        )

    rate_limiter.enforce(
        rate_limiter.key("profile_update", current_user.id),
        limit=20,
        window_seconds=300,
        detail="Too many profile updates have been attempted. Please try again later.",
    )

    for field, value in changes.items():
        # Ownership comes exclusively from the authenticated session. The
        # strict request schema prevents arbitrary model fields being assigned.
        setattr(current_user, field, value)
    current_user.updated_at = datetime.now(timezone.utc)

    try:
        record_audit_event(
            db=db,
            action="profile.self_update",
            result="success",
            actor_id=current_user.id,
            details={"fields": sorted(changes)},
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.warning("Profile update persistence failed for authenticated account")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profile update could not be saved",
        ) from exc

    return _profile_response(current_user)
