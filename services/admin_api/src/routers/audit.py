"""
Administrative audit events API router.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import json

from src.db import get_db
from src.services.audit_service import AuditService
from src.models.schemas import AuditEventList, AuditEvent
from src.auth import get_authenticated_actor

router = APIRouter(prefix="/v1/admin/audit-events", tags=["audit"])


@router.get("", response_model=AuditEventList)
def list_audit_events(
    limit: int = Query(100, ge=1, le=1000),
    actor_id: str = Depends(get_authenticated_actor),
    db: Session = Depends(get_db)
):
    """Retrieves append only audit events log."""
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
