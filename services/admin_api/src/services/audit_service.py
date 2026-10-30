"""
Append only admin audit event logger and query service.
"""

from typing import List, Optional, Dict, Any
import json
from sqlalchemy.orm import Session
from src.models.database import AdminAuditEventModel, utcnow_str
from src.crypto.hashing import sha256_digest


class AuditService:
    """Service managing append only administrative audit events."""

    @classmethod
    def record_event(
        cls,
        db: Session,
        actor_id: str,
        action: str,
        result: str,
        details: Optional[Dict[str, Any]] = None
    ) -> AdminAuditEventModel:
        """
        Appends an immutable audit event to the audit log.
        """
        timestamp = utcnow_str()
        event_id = sha256_digest(f"{actor_id}:{action}:{timestamp}:{result}")

        event = AdminAuditEventModel(
            id=event_id,
            timestamp=timestamp,
            actor_id=actor_id,
            action=action,
            result=result,
            details_json=json.dumps(details or {}, sort_keys=True, separators=(",", ":"))
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def list_events(
        cls,
        db: Session,
        limit: int = 100
    ) -> List[AdminAuditEventModel]:
        """
        Retrieves recent audit events in chronological order.
        """
        return (
            db.query(AdminAuditEventModel)
            .order_by(AdminAuditEventModel.timestamp.desc())
            .limit(limit)
            .all()
        )
