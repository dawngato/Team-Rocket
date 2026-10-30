"""
Authentication router for HimVote Identity Issuer.
Handles Argon2id authentication, TOTP MFA validation, and session lifecycle.
"""

import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import SESSION_EXPIRE_HOURS, RECOVERY_EXPIRE_HOURS, MFA_ISSUER
from ..models import User, Session as UserSession, RecoveryRequest, MfaCredential, RoleAssignment, RoleDefinition
from ..schemas import (
    LoginRequest,
    LoginResponse,
    RecoveryRequest as RecoveryReqSchema,
    MfaSetupResponse,
    MfaVerifyRequest,
)
from ..crypto.hashing import verify_password, dummy_verify
from ..crypto.totp import generate_totp_secret, get_totp_uri, verify_totp
from .deps import get_current_user, get_user_roles, record_audit_event

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(
    req: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate a user using Argon2id password and optional TOTP MFA."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        dummy_verify()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(user.password_hash, req.password):
        record_audit_event(
            db=db,
            action="auth.login.failed",
            result="invalid_password",
            actor_id=user.id,
            details={"email": req.email},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account status is {user.status}",
        )

    # Determine user primary role
    roles = get_user_roles(user, db)
    primary_role = roles[0] if roles else "student"

    # Handle MFA check
    is_mfa_authenticated = False
    if user.mfa_enrolled:
        if not req.mfa_token:
            # Privileged roles require MFA before issuing active session
            return LoginResponse(
                session_token="",
                user_id=user.id,
                role=primary_role,
                mfa_required=True,
            )

        # Verify MFA token against enrolled credentials
        mfa_creds = db.query(MfaCredential).filter(
            MfaCredential.user_id == user.id,
            MfaCredential.type == "totp",
        ).all()

        mfa_valid = any(verify_totp(cred.secret_hash, req.mfa_token) for cred in mfa_creds)
        if not mfa_valid:
            record_audit_event(
                db=db,
                action="auth.mfa.failed",
                result="invalid_mfa_token",
                actor_id=user.id,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA verification code",
            )
        is_mfa_authenticated = True

    # Generate session token
    session_token = str(uuid.uuid4())
    token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=SESSION_EXPIRE_HOURS)

    user_session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        is_mfa_authenticated=is_mfa_authenticated,
        expires_at=expires_at,
    )
    db.add(user_session)
    db.commit()

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="session_id",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=SESSION_EXPIRE_HOURS * 3600,
    )

    record_audit_event(
        db=db,
        action="auth.login.success",
        result="success",
        actor_id=user.id,
        details={"role": primary_role, "mfa_enrolled": user.mfa_enrolled},
    )

    return LoginResponse(
        session_token=session_token,
        user_id=user.id,
        role=primary_role,
        mfa_required=False,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log out and terminate active session."""
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    else:
        token = request.cookies.get("session_id")

    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        db.query(UserSession).filter(UserSession.token_hash == token_hash).delete()
        db.commit()

    response.delete_cookie("session_id")

    record_audit_event(
        db=db,
        action="auth.logout",
        result="success",
        actor_id=current_user.id,
    )

    return {"status": "logged_out"}


@router.post("/recover", status_code=status.HTTP_202_ACCEPTED)
def recover_account(
    req: RecoveryReqSchema,
    db: Session = Depends(get_db),
):
    """Initiate account recovery via single use short lived token."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Uniform response without leaking account existence
        return {"status": "recovery_initiated"}

    recovery_token = str(uuid.uuid4())
    token_hash = hashlib.sha256(recovery_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RECOVERY_EXPIRE_HOURS)

    recovery = RecoveryRequest(
        user_id=user.id,
        token_hash=token_hash,
        status="PENDING",
        expires_at=expires_at,
    )
    db.add(recovery)

    record_audit_event(
        db=db,
        action="auth.recovery.requested",
        result="success",
        actor_id=user.id,
    )
    db.commit()

    return {"status": "recovery_initiated"}


@router.post("/mfa/setup", response_model=MfaSetupResponse, status_code=status.HTTP_200_OK)
def mfa_setup(
    current_user: User = Depends(get_current_user),
):
    """Generate new TOTP secret for multi factor authentication enrollment."""
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.email, issuer=MFA_ISSUER)
    return MfaSetupResponse(
        secret=secret,
        provisioning_uri=uri,
    )


@router.post("/mfa/verify", status_code=status.HTTP_200_OK)
def mfa_verify(
    req: MfaVerifyRequest,
    secret: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm TOTP token and activate MFA enrollment for user."""
    if not verify_totp(secret, req.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP verification code",
        )

    cred = MfaCredential(
        user_id=current_user.id,
        type="totp",
        secret_hash=secret,
        details={"verified": True},
    )
    db.add(cred)
    current_user.mfa_enrolled = True

    record_audit_event(
        db=db,
        action="auth.mfa.enrolled",
        result="success",
        actor_id=current_user.id,
    )
    db.commit()

    return {"status": "mfa_enrolled"}
