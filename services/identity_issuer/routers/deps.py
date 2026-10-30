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

    user_session.last_accessed_at = now
    db.commit()
    return user


def get_user_roles(user: User, db: Session) -> List[str]:
    """Retrieve all assigned role names for the given user."""
    assignments = (
        db.query(RoleDefinition.name)
        .join(RoleAssignment, RoleAssignment.role_id == RoleDefinition.id)
        .filter(RoleAssignment.user_id == user.id)
        .all()
    )
    return [r[0] for r in assignments]


def require_roles(allowed_roles: List[str]):
    """Factory creating dependency to enforce required roles."""
    def role_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        user_roles = get_user_roles(current_user, db)
        # Super admin always satisfies any admin check
        if "super_admin" in user_roles:
            return current_user
        for allowed in allowed_roles:
            if allowed in user_roles:
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this operation",
        )
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
