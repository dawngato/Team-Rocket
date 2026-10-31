"""
Administrative audit events API router.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
import json

from src.db import get_db
from src.services.audit_service import AuditService
from src.models.schemas import AuditEventList, AuditEvent
from src.models.database import ElectionModel
from src.auth import ActorContext, get_authenticated_context, require_operation

router = APIRouter(prefix="/v1/admin/audit-events", tags=["audit"])


@router.get("", response_model=AuditEventList)
def list_audit_events(
    limit: int = Query(100, ge=1, le=1000),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Retrieve only the audit events visible to the caller's trust scope."""
    context = require_operation(request, "audit.read")
    events = AuditService.list_events(db=db, limit=min(limit * 5, 5000))
    items = []
    for e in events:
        details = None
        if e.details_json:
            try:
                details = json.loads(e.details_json)
            except Exception:
                details = {"raw": e.details_json}
        if not _event_is_in_scope(db, context, e.actor_id, details or {}):
            continue
        details = _safe_details(details or {})
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
        if len(items) >= limit:
            break
    return AuditEventList(events=items, total=len(items))


def _event_is_in_scope(db: Session, context: ActorContext, actor_id: str | None, details: dict) -> bool:
    if context.development or context.has_scope():
        return True
    election_id = details.get("election_id")
    institution_id = details.get("institution_id")
    if election_id:
        election = db.query(ElectionModel).filter(ElectionModel.id == election_id).first()
        if election and context.has_scope(election_id=election.id, institution_id=election.institution_id):
            return True
    if isinstance(institution_id, str) and context.has_scope(institution_id=institution_id):
        return True
    # Events without a resource scope are visible only to their actor. This
    # avoids turning the audit endpoint into a cross-institution directory.
    return actor_id == context.actor_id


def _safe_details(details: dict) -> dict:
    """Remove personal or secret fields before returning audit metadata."""
    allowed = {
        "election_id",
        "institution_id",
        "action_context",
        "count",
        "state",
        "manifest_digest",
        "roster_version",
        "final_tree_size",
    }
    return {key: value for key, value in details.items() if key in allowed}
