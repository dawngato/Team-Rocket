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
from ..config import APP_ENV, INVITATION_DELIVERY_MODE, INVITATION_EXPIRE_DAYS
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
    AdminInvitationRecord,
    TeacherDirectoryRecord,
    CreateTeacherRequest,
)
from ..crypto.hashing import hash_password
from .deps import (
    get_current_user,
    get_user_roles,
    require_roles,
    record_audit_event,
    GRANTABLE_ROLES,
    INVITABLE_ROLES,
    user_has_scope,
)

router = APIRouter(prefix="/v1", tags=["admin"])


@router.get("/admin/invitations", response_model=list[AdminInvitationRecord], status_code=status.HTTP_200_OK)
def list_admin_invitations(
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """Return invitation metadata only. Invitation secrets are never recoverable."""
    rows = db.query(Invitation).order_by(Invitation.created_at.desc()).limit(500).all()
    return [
        AdminInvitationRecord(
            id=row.id,
            email=row.email,
            role=row.role,
            scope=row.scope,
            status=row.status,
            expires_at=row.expires_at,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/admin/approvals", status_code=status.HTTP_200_OK)
def list_admin_approvals(
    status_filter: str = Query("pending", alias="status"),
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """Return the durable approval queue used by the super-admin UI."""
    query = db.query(ApprovalRequest).order_by(ApprovalRequest.created_at.desc()).limit(500)
    if status_filter.lower() == "pending":
        query = query.filter(ApprovalRequest.decision.is_(None))
    elif status_filter.lower() in {"approved", "rejected"}:
        query = query.filter(ApprovalRequest.decision == status_filter.lower())
    rows = query.all()
    users = {
        user.id: user
        for user in db.query(User).filter(
            User.id.in_({value for row in rows for value in (row.requester_id, row.target_user_id) if value})
        ).all()
    }
    return [
        {
            "id": row.id,
            "request_type": row.request_type,
            "requester_id": row.requester_id,
            "requester_email": users.get(row.requester_id).email if users.get(row.requester_id) else "",
            "target_user_id": row.target_user_id,
            "target_email": users.get(row.target_user_id).email if row.target_user_id and users.get(row.target_user_id) else "",
            "requested_role": row.requested_role,
            "requested_scope": row.requested_scope,
            "justification": row.reason,
            "status": row.decision or "pending",
            "requested_at": row.created_at,
            "decided_at": row.decided_at,
        }
        for row in rows
    ]


@router.get("/admin/teachers", response_model=list[TeacherDirectoryRecord], status_code=status.HTTP_200_OK)
def list_teachers(
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """Return persisted teacher identities and their delegated scopes."""
    rows = (
        db.query(User, RoleAssignment, RoleDefinition)
        .join(RoleAssignment, RoleAssignment.user_id == User.id)
        .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
        .filter(RoleDefinition.name == "teacher")
        .order_by(User.created_at.desc())
        .all()
    )
    output = []
    for user, assignment, role_definition in rows:
        invitation = db.query(Invitation).filter(
            Invitation.email == user.email,
            Invitation.role == "teacher",
        ).order_by(Invitation.created_at.desc()).first()
        output.append(
            TeacherDirectoryRecord(
                user_id=user.id,
                email=user.email,
                external_id=user.external_id,
                status=user.status,
                role=role_definition.name,
                scope=assignment.scope_id,
                invitation_id=invitation.id if invitation else None,
            )
        )
    return output


@router.post("/admin/teachers", response_model=TeacherDirectoryRecord, status_code=status.HTTP_201_CREATED)
def provision_teacher(
    req: CreateTeacherRequest,
    current_user: User = Depends(require_roles(["super_admin", "administrator"])),
    db: Session = Depends(get_db),
):
    """
    Provision a persistent teacher identity and assign the teacher role within the specified department scope.
    """
    existing = db.query(User).filter(User.email == str(req.email).lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists",
        )

    if not req.initial_password or len(req.initial_password) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A strong initial password of at least 12 characters must be explicitly supplied for teacher provisioning.",
        )
    pwd_hash, _ = hash_password(req.initial_password)
    teacher_user = User(
        email=str(req.email).lower(),
        password_hash=pwd_hash,
        external_id=req.faculty_id.strip(),
        status="ACTIVE",
    )
    db.add(teacher_user)
    db.flush()

    teacher_role = db.query(RoleDefinition).filter(RoleDefinition.name == "teacher").first()
    if not teacher_role:
        teacher_role = RoleDefinition(name="teacher", description="Department Teacher and Verification Officer")
        db.add(teacher_role)
        db.flush()

    assignment = RoleAssignment(
        user_id=teacher_user.id,
        role_id=teacher_role.id,
        scope_type="department",
        scope_id=req.department.strip(),
    )
    db.add(assignment)

    record_audit_event(
        db=db,
        action="admin.teacher.provisioned",
        result="success",
        actor_id=current_user.id,
        details={
            "faculty_id": req.faculty_id.strip(),
            "email": str(req.email).lower(),
            "department": req.department.strip(),
        },
    )
    db.commit()

    return TeacherDirectoryRecord(
        user_id=teacher_user.id,
        email=teacher_user.email,
        external_id=teacher_user.external_id,
        status=teacher_user.status,
        role="teacher",
        scope=req.department.strip(),
    )


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
    roles = get_user_roles(current_user, db)
    requested_role = req.role.strip().lower()
    requested_scope = req.scope.strip()
    if requested_role not in INVITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requested role must be provisioned through an approved delegation process",
        )
    if not requested_scope:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invitation scope is required",
        )
    if requested_role == "administrator" and "super_admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Super Administrator may invite an Administrator",
        )
    if "super_admin" not in roles and not user_has_scope(
        current_user,
        db,
        ["administrator"],
        requested_scope,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invitation scope exceeds the caller's delegated scope",
        )
    if APP_ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Invitation delivery requires an independently configured notification adapter",
        )
    if db.query(Invitation).filter(
        Invitation.email == str(req.email).lower(),
        Invitation.role == requested_role,
        Invitation.scope == requested_scope,
        Invitation.status == "PENDING",
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending invitation already exists for this email",
        )

    token = str(uuid.uuid4())
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRE_DAYS)

    invitation = Invitation(
        email=str(req.email).lower(),
        role=requested_role,
        scope=requested_scope,
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
        details={"invited_email": str(req.email).lower(), "role": requested_role, "scope": requested_scope},
    )
    db.commit()

    response = {
        "status": "invitation_created",
        "invitation_id": invitation.id,
    }
    if APP_ENV != "production" and INVITATION_DELIVERY_MODE == "development":
        response["token"] = token
    return response


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

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self elevation is forbidden",
        )
    requested_role = req.role.strip().lower()
    requested_scope = req.scope.strip()
    if requested_role not in GRANTABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requested role cannot be granted through this workflow",
        )

    if not requested_scope:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role grant scope is required",
        )

    current_roles = get_user_roles(current_user, db)
    if requested_role == "administrator" and "super_admin" not in current_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Super Administrator may request an Administrator grant",
        )
    if "super_admin" not in current_roles and not user_has_scope(
        current_user,
        db,
        ["administrator"],
        requested_scope,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requested scope exceeds the requester's delegated scope",
        )

    approval = ApprovalRequest(
        request_type="role_grant",
        requester_id=current_user.id,
        target_user_id=target_user.id,
        requested_role=requested_role,
        requested_scope=requested_scope,
        reason=req.justification,
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

    if approval.decision is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Approval request has already been decided",
        )

    if req.decision == "approved":
        if (
            approval.request_type != "role_grant"
            or not approval.target_user_id
            or not approval.requested_role
            or not approval.requested_scope
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Approval request has invalid grant data",
            )
        approver_roles = get_user_roles(current_user, db)
        if approval.requested_role == "administrator" and "super_admin" not in approver_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only a Super Administrator may approve an Administrator grant",
            )
        if "super_admin" not in approver_roles and not user_has_scope(
            current_user,
            db,
            ["administrator"],
            approval.requested_scope,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Approval scope exceeds the approver's delegated authority",
            )
        role_definition = db.query(RoleDefinition).filter(RoleDefinition.name == approval.requested_role).first()
        if not role_definition:
            role_definition = RoleDefinition(
                name=approval.requested_role,
                description=f"{approval.requested_role} delegated role",
            )
            db.add(role_definition)
            db.flush()

        existing_assignment = db.query(RoleAssignment).filter(
            RoleAssignment.user_id == approval.target_user_id,
            RoleAssignment.role_id == role_definition.id,
            RoleAssignment.scope_type == "delegated",
            RoleAssignment.scope_id == approval.requested_scope,
        ).first()
        if not existing_assignment:
            db.add(
                RoleAssignment(
                    user_id=approval.target_user_id,
                    role_id=role_definition.id,
                    scope_type="delegated",
                    scope_id=approval.requested_scope,
                    granted_by=current_user.id,
                )
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
