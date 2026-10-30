"""
FastAPI dependencies and authorization helpers for HimVote Identity Issuer.
Enforces session validation, role checks, and append only audit logging.
"""

import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Session as UserSession, RoleAssignment, RoleDefinition, AdminAuditEvent

security = HTTPBearer(auto_error=False)

# These roles may be delegated through the ordinary invitation workflow.
# Super administrators, independent auditors, and roster approvers require a
# separately controlled process and must never be minted by this endpoint.
INVITABLE_ROLES = frozenset({"administrator", "teacher", "election_officer"})
# Roster approvers and auditors are independent trust roles and cannot be
# minted by ordinary administrative delegation.
GRANTABLE_ROLES = frozenset({"administrator", "teacher", "election_officer"})
MFA_REQUIRED_ROLES = frozenset(
    {"super_admin", "administrator", "election_officer", "teacher", "roster_approver"}
)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the active user from bearer token or session cookie."""
    token = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    else:
        session_cookie = request.cookies.get("session_id")
        if session_cookie:
            token = session_cookie

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user_session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()

    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or invalid",
        )

    now = datetime.now(timezone.utc)
    # Ensure timezone aware comparison
    expires_at = user_session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        db.delete(user_session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    user = db.query(User).filter(User.id == user_session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account status is {user.status}",
        )

    user_session.last_accessed_at = now
    request.state.authenticated_session_mfa = bool(user_session.is_mfa_authenticated)
    db.commit()
    return user


def get_user_roles(user: User, db: Session) -> List[str]:
    """Retrieve all assigned role names for the given user."""
    now = datetime.now(timezone.utc)
    assignments = (
        db.query(RoleDefinition.name)
        .join(RoleAssignment, RoleAssignment.role_id == RoleDefinition.id)
        .filter(
            RoleAssignment.user_id == user.id,
            (RoleAssignment.expires_at.is_(None) | (RoleAssignment.expires_at > now)),
        )
        .all()
    )
    return [r[0] for r in assignments]


def user_has_scope(
    user: User,
    db: Session,
    role_names: List[str],
    requested_scope: str,
) -> bool:
    """Return whether a user has one of the roles for the requested scope.

    A role name alone is not sufficient authorization for department or
    election-scoped operations.  The explicit global wildcard is reserved for
    intentionally broad assignments created by provisioning or test fixtures.
    """
    if not requested_scope:
        return False

    assignments = (
        db.query(RoleAssignment, RoleDefinition.name)
        .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
        .filter(
            RoleAssignment.user_id == user.id,
            RoleDefinition.name.in_(role_names),
        )
        .all()
    )
    return any(
        assignment.scope_id == "*"
        or assignment.scope_type == "global"
        or assignment.scope_id == requested_scope
        for assignment, _role_name in assignments
    )


def require_roles(allowed_roles: List[str]):
    """Factory creating dependency to enforce required roles."""
    def role_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        user_roles = get_user_roles(current_user, db)
        if not any(allowed in user_roles for allowed in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation",
            )

        # The identity service must not treat a password-only session as an
        # official administrative session.  The login dependency records the
        # MFA state on the request; bearer tokens cannot self-assert it.
        if set(user_roles).intersection(MFA_REQUIRED_ROLES) and not getattr(
            request.state, "authenticated_session_mfa", False
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA is required for this operation",
            )
        return current_user
    return role_checker


def record_audit_event(
    db: Session,
    action: str,
    result: str,
    actor_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AdminAuditEvent:
    """Insert an append only audit event record."""
    audit = AdminAuditEvent(
        actor_id=actor_id,
        action=action,
        result=result,
        details=details or {},
    )
    db.add(audit)
    db.commit()
    return audit
