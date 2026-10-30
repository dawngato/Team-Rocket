"""
Admin management endpoints for invitations, role approvals, and audit inspection.
Enforces separation of duties: creators can never approve their own requests.
"""

import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import INVITATION_EXPIRE_DAYS
from ..models import (
    User,
    Invitation,
    ApprovalRequest,
    ApprovalDecision,
    RoleAssignment,
    RoleDefinition,
    AdminAuditEvent,
)
from ..schemas import (
    AdminInvitationRequest,
    RoleGrantRequest,
    ApprovalDecisionRequest,
    AuditEventList,
    AuditEvent as AuditEventSchema,
)
from .deps import get_current_user, require_roles, record_audit_event

router = APIRouter(prefix="/v1", tags=["admin"])


@router.post("/admin/invitations", status_code=status.HTTP_201_CREATED)
def create_admin_invitation(
    req: AdminInvitationRequest,
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """
    Create an administrator invitation.
    Requires Super Administrator or Administrator role.
    """
    token = str(uuid.uuid4())
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRE_DAYS)

    invitation = Invitation(
        email=req.email,
        role=req.role,
        scope=req.scope,
        token_hash=token_hash,
        invited_by=current_user.id,
        status="PENDING",
        expires_at=expires_at,
    )
    db.add(invitation)

    record_audit_event(
        db=db,
        action="admin.invitation.created",
        result="success",
        actor_id=current_user.id,
        details={"invited_email": req.email, "role": req.role, "scope": req.scope},
    )
    db.commit()

    return {
        "status": "invitation_created",
        "invitation_id": invitation.id,
        "token": token,
    }


@router.post("/admin/role-grant-requests", status_code=status.HTTP_202_ACCEPTED)
def request_role_grant(
    req: RoleGrantRequest,
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """
    Submit a role grant request for approval.
    Creators can never approve their own request per Section 3.1.
    """
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found",
        )

    approval = ApprovalRequest(
        request_type="role_grant",
        requester_id=current_user.id,
        reason=f"Role: {req.role}, Scope: {req.scope}. Justification: {req.justification}",
    )
    db.add(approval)
    db.flush()

    record_audit_event(
        db=db,
        action="admin.role_grant.requested",
        result="pending_approval",
        actor_id=current_user.id,
        details={
            "approval_id": approval.id,
            "target_user_id": req.user_id,
            "role": req.role,
            "scope": req.scope,
        },
    )
    db.commit()

    return {
        "status": "request_submitted",
        "approval_id": approval.id,
    }


@router.post("/approvals/{approval_id}/decision", status_code=status.HTTP_200_OK)
def decide_approval(
    approval_id: str,
    req: ApprovalDecisionRequest,
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """
    Decide on an approval request.
    Strict enforcement: The approver MUST be a different person from the requester.
    """
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval request not found",
        )

    # Creators can never approve their own request
    if approval.requester_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self approval forbidden. Creator cannot approve their own request.",
        )

    now = datetime.now(timezone.utc)
    approval.decision = req.decision
    approval.reason = req.reason
    approval.approver_id = current_user.id
    approval.decided_at = now

    decision_record = ApprovalDecision(
        request_id=approval.id,
        approver_id=current_user.id,
        decision=req.decision,
        reason=req.reason,
        decided_at=now,
    )
    db.add(decision_record)

    record_audit_event(
        db=db,
        action="admin.approval.decided",
        result=req.decision,
        actor_id=current_user.id,
        details={"approval_id": approval_id, "reason": req.reason},
    )
    db.commit()

    return {"status": "decision_recorded", "decision": req.decision}


@router.get("/admin/audit-events", response_model=AuditEventList, status_code=status.HTTP_200_OK)
def get_admin_audit_events(
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """
    Retrieve admin audit events.
    Events are append only; updates and deletes are prevented at database and ORM layers.
    """
    query = db.query(AdminAuditEvent)
    if from_time:
        query = query.filter(AdminAuditEvent.created_at >= from_time)
    if to_time:
        query = query.filter(AdminAuditEvent.created_at <= to_time)

    total = query.count()
    events = query.order_by(AdminAuditEvent.created_at.desc()).limit(limit).all()

    items = [
        AuditEventSchema(
            id=e.id,
            timestamp=e.created_at,
            actor_id=e.actor_id,
            action=e.action,
            result=e.result,
            details=e.details or {},
        )
        for e in events
    ]

    return AuditEventList(events=items, total=total)
