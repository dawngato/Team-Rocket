"""
Administrative audit events API router.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.orm import Session
import json

from src.db import get_db
from src.services.audit_service import AuditService
from src.models.schemas import AuditEventList, AuditEvent
from src.auth import _identity_profile


router = APIRouter(prefix="/v1/admin/audit-events", tags=["audit"])


@router.get("", response_model=AuditEventList)
def list_audit_events(
    limit: int = Query(100, ge=1, le=1000),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Retrieves append only audit events log with role enforcement."""
    # P0-06 Fix: Restrict audit log inspection to privileged administrators and auditors
    profile = _identity_profile(request)
    roles = profile.get("roles", [])
    if not any(r in {"administrator", "super_admin", "auditor", "independent_auditor"} for r in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to administrative audit logs requires an auditor or administrator role",
        )

    events = AuditService.list_events(db=db, limit=limit)
    items = []
    for e in events:
        details = None
        if e.details_json:
            try:
                details = json.loads(e.details_json)
            except Exception:
                details = {"raw": e.details_json}
        items.append(
            AuditEvent(
                id=e.id,
                timestamp=e.timestamp,
                actor_id=e.actor_id,
                action=e.action,
                result=e.result,
                details=details
            )
        )
    return AuditEventList(events=items, total=len(items))
