"""
Authentication router for HimVote Identity Issuer.
Handles Argon2id authentication, TOTP MFA validation, and session lifecycle.
"""

import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import (
    APP_ENV,
    RECOVERY_DELIVERY_MODE,
    SESSION_EXPIRE_HOURS,
    RECOVERY_EXPIRE_HOURS,
    MFA_ISSUER,
    INVITATION_DELIVERY_MODE,
    ACTIVATION_DELIVERY_MODE,
)
from ..models import (
    User,
    Session as UserSession,
    RecoveryRequest,
    AccountActivation,
    MfaCredential,
    RoleAssignment,
    RoleDefinition,
    Invitation,
)
from ..schemas import (
    LoginRequest,
    LoginResponse,
    InvitationRedeemRequest,
    InvitationRedeemResponse,
    RecoveryRequest as RecoveryReqSchema,
    RecoveryResetRequest,
    AccountActivationRequest,
    MfaSetupResponse,
    MfaVerifyRequest,
    SessionProfile,
    SessionScope,
)
from ..crypto.hashing import hash_password, verify_password, dummy_verify
from ..crypto.totp import generate_totp_secret, get_totp_uri, verify_totp
from ..notification_service import NotificationDeliveryError, notification_service
from .deps import get_current_user, get_user_roles, record_audit_event, INVITABLE_ROLES

router = APIRouter(prefix="/v1/auth", tags=["auth"])

from ..rate_limiter import rate_limiter

_LOGIN_WINDOW_SECONDS = 300
_LOGIN_MAX_FAILURES = 5


def _usable_delivery_statuses(mode: str) -> tuple[str, ...]:
    if APP_ENV == "production" or mode == "configured":
        return ("DELIVERED", "DEVELOPMENT")
    return ("DELIVERED", "DEVELOPMENT", "PENDING")


def _login_keys(request: Request, email: str) -> tuple[str, str]:
    remote = request.client.host if request.client else "unknown"
    return (
        rate_limiter.key("login_account", email),
        rate_limiter.key("login_source", f"{email.strip().lower()}:{remote}"),
    )


def _enforce_login_limit(request: Request, email: str) -> tuple[str, str]:
    keys = _login_keys(request, email)
    rate_limiter.enforce(
        keys[0],
        limit=10,
        window_seconds=_LOGIN_WINDOW_SECONDS,
        detail="Too many sign in attempts; try again later",
    )
    rate_limiter.enforce(
        keys[1],
        limit=_LOGIN_MAX_FAILURES,
        window_seconds=_LOGIN_WINDOW_SECONDS,
        detail="Too many sign in attempts; try again later",
    )
    return keys


def _record_login_failure(key: str) -> None:
    return None


def _clear_login_failure(keys: tuple[str, str]) -> None:
    for key in keys:
        rate_limiter.clear(key)


@router.post(
    "/invitations/redeem",
    response_model=InvitationRedeemResponse,
    status_code=status.HTTP_201_CREATED,
)
def redeem_invitation(
    req: InvitationRedeemRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Redeem a single-use staff invitation and provision its scoped role.

    The invitation token is only accepted while pending and before expiry. The
    account is activated with a freshly generated TOTP credential so a
    privileged invite cannot be redeemed into a password-only account.
    """
    rate_limiter.enforce(
        rate_limiter.key("redeem_invitation", req.invitation_token),
        limit=10,
        window_seconds=300,
        detail="Too many invitation redemption attempts; try again later",
    )
    token_hash = hashlib.sha256(req.invitation_token.encode("utf-8")).hexdigest()
    invitation = (
        db.query(Invitation)
        .filter(
            Invitation.token_hash == token_hash,
            Invitation.status == "PENDING",
            Invitation.delivery_status.in_(_usable_delivery_statuses(INVITATION_DELIVERY_MODE)),
        )
        .first()
    )
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation token is invalid or has already been redeemed",
        )

    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation token is expired",
        )

    if invitation.role not in INVITABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This role must be provisioned through an independent approval process",
        )

    email = invitation.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this invitation",
        )

    password_hash, password_params = hash_password(req.password)
    totp_secret = generate_totp_secret()
    totp_uri = get_totp_uri(totp_secret, email, issuer=MFA_ISSUER)
    user = User(
        external_id=f"invitation:{invitation.id}",
        email=email,
        password_hash=password_hash,
        password_algorithm=password_params["algorithm"],
        password_params=password_params,
        status="ACTIVE",
        mfa_enrolled=True,
    )
    db.add(user)
    db.flush()

    role = db.query(RoleDefinition).filter(RoleDefinition.name == invitation.role).first()
    if not role:
        role = RoleDefinition(name=invitation.role, description=f"{invitation.role} delegated role")
        db.add(role)
        db.flush()

    db.add(
        RoleAssignment(
            user_id=user.id,
            role_id=role.id,
            scope_type="delegated",
            scope_id=invitation.scope,
            granted_by=invitation.invited_by,
        )
    )
    db.add(
        MfaCredential(
            user_id=user.id,
            type="totp",
            secret_hash=totp_secret,
            details={"provisioning_uri": totp_uri},
        )
    )
    invitation.status = "REDEEMED"

    try:
        record_audit_event(
            db=db,
            action="auth.invitation.redeemed",
            result="success",
            actor_id=user.id,
            details={"invitation_id": invitation.id, "role": invitation.role, "scope": invitation.scope},
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation could not be redeemed because the account already exists",
        )

    response = InvitationRedeemResponse(
        status="invitation_redeemed",
        user_id=user.id,
        role=invitation.role,
        scope=invitation.scope,
    )
    if APP_ENV != "production" and INVITATION_DELIVERY_MODE == "development":
        response.totp_secret = totp_secret
        response.totp_uri = totp_uri
    return response


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(
    req: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate a user using Argon2id password and optional TOTP MFA."""
    login_key = _enforce_login_limit(request, req.email)
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        dummy_verify()
        _record_login_failure(login_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(user.password_hash, req.password):
        _record_login_failure(login_key)
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
            _record_login_failure(login_key)
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
    _clear_login_failure(login_key)
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
        # Local development and the browser smoke environment run on HTTP.
        # Production remains HTTPS-only through APP_ENV.
        secure=APP_ENV == "production",
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


@router.get("/me", response_model=SessionProfile, status_code=status.HTTP_200_OK)
def session_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the server-authoritative identity and scoped capabilities.

    The response is intentionally limited to membership and scope metadata. It
    does not expose election choices, credentials, receipts, or casting data.
    """
    assignments = (
        db.query(RoleAssignment, RoleDefinition.name)
        .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
        .filter(RoleAssignment.user_id == current_user.id)
        .all()
    )
    now = datetime.now(timezone.utc)
    active = [
        (assignment, role)
        for assignment, role in assignments
        if assignment.expires_at is None
        or (assignment.expires_at.replace(tzinfo=timezone.utc) if assignment.expires_at.tzinfo is None else assignment.expires_at) > now
    ]
    roles = sorted({role for _assignment, role in active})
    scopes = [
        SessionScope(role=role, scope_type=assignment.scope_type, scope_id=assignment.scope_id)
        for assignment, role in active
    ]
    return SessionProfile(
        user_id=current_user.id,
        email=current_user.email,
        roles=roles,
        scopes=scopes,
        mfa_authenticated=bool(getattr(request.state, "authenticated_session_mfa", False)),
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
    request: Request,
    db: Session = Depends(get_db),
):
    """Initiate account recovery via single use short lived token."""
    remote = request.client.host if request.client else "unknown"
    rate_limiter.enforce(
        rate_limiter.key("recover", f"{req.email.lower()}:{remote}"),
        limit=5,
        window_seconds=300,
        detail="Too many password recovery requests; try again later",
    )
    if APP_ENV == "production" and RECOVERY_DELIVERY_MODE != "configured":
        # A token must travel through an independently controlled notification
        # channel. This service does not silently fall back to returning it or
        # logging it when that production adapter is absent.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account recovery delivery is not configured",
        )

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Uniform response without leaking account existence
        return {"status": "recovery_initiated"}

    recovery_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(recovery_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RECOVERY_EXPIRE_HOURS)

    # Only the newest request remains redeemable. Older requests are never
    # deleted because the audit trail must retain the recovery history.
    db.query(RecoveryRequest).filter(
        RecoveryRequest.user_id == user.id,
        RecoveryRequest.status == "PENDING",
        RecoveryRequest.delivery_status.in_(_usable_delivery_statuses(RECOVERY_DELIVERY_MODE)),
    ).update({"status": "SUPERSEDED"}, synchronize_session=False)

    recovery = RecoveryRequest(
        user_id=user.id,
        token_hash=token_hash,
        status="PENDING",
        delivery_status="PENDING" if RECOVERY_DELIVERY_MODE == "configured" else "DEVELOPMENT",
        expires_at=expires_at,
    )
    db.add(recovery)

    delivery_result = None
    if RECOVERY_DELIVERY_MODE == "configured":
        try:
            delivery_result = notification_service.dispatch(
                recipient=user.email,
                subject="HimVote Password Recovery",
                body=f"Your single-use password recovery link expires in {RECOVERY_EXPIRE_HOURS} hour(s).",
                category="recovery",
                token=recovery_token,
                metadata={"recovery_id": recovery.id},
            )
            recovery.delivery_status = "DELIVERED"
        except NotificationDeliveryError as exc:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Account recovery notification could not be delivered") from exc

    record_audit_event(
        db=db,
        action="auth.recovery.requested",
        result="success",
        actor_id=user.id,
        details={"delivery": delivery_result["status"] if delivery_result else "development"},
    )
    db.commit()

    response = {"status": "recovery_initiated"}
    if APP_ENV == "development" and RECOVERY_DELIVERY_MODE == "development":
        response["development_token"] = recovery_token
    return response


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_password(
    req: RecoveryResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Redeem one short lived recovery token and revoke all user sessions."""
    rate_limiter.enforce(
        rate_limiter.key("reset", req.token[:16] if req.token else "token"),
        limit=5,
        window_seconds=300,
        detail="Too many password reset requests; try again later",
    )
    token_hash = hashlib.sha256(req.token.encode("utf-8")).hexdigest()
    recovery = db.query(RecoveryRequest).filter(
        RecoveryRequest.token_hash == token_hash,
        RecoveryRequest.status == "PENDING",
    ).first()
    if not recovery:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery token is invalid or has already been used",
        )

    now = datetime.now(timezone.utc)
    expires_at = recovery.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        recovery.status = "EXPIRED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery token is invalid or expired",
        )

    user = db.query(User).filter(User.id == recovery.user_id).first()
    if not user or user.status in {"DEACTIVATED", "ARCHIVED"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account cannot be recovered",
        )

    password_hash, password_params = hash_password(req.password)
    user.password_hash = password_hash
    user.password_algorithm = password_params["algorithm"]
    user.password_params = password_params
    user.updated_at = now
    recovery.status = "CONSUMED"
    recovery.consumed_at = now

    # Recovery never creates or resets a voting credential. It only revokes
    # active login sessions before allowing a later authenticated login.
    db.query(UserSession).filter(UserSession.user_id == user.id).delete(
        synchronize_session=False,
    )
    record_audit_event(
        db=db,
        action="auth.recovery.completed",
        result="success",
        actor_id=user.id,
    )
    db.commit()
    return {"status": "password_reset", "sessions_revoked": True}


@router.post("/activate", status_code=status.HTTP_200_OK)
def activate_account(
    req: AccountActivationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Set a pending account password with a single-use activation token."""
    rate_limiter.enforce(
        rate_limiter.key("activation", req.activation_token),
        limit=5,
        window_seconds=300,
        detail="Too many activation attempts; try again later",
    )
    token_hash = hashlib.sha256(req.activation_token.encode("utf-8")).hexdigest()
    activation = db.query(AccountActivation).filter(
        AccountActivation.token_hash == token_hash,
        AccountActivation.status == "PENDING",
        AccountActivation.delivery_status.in_(_usable_delivery_statuses(ACTIVATION_DELIVERY_MODE)),
    ).first()
    if not activation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activation token is invalid or has already been used")

    now = datetime.now(timezone.utc)
    expires_at = activation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        activation.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activation token is invalid or expired")

    user = db.query(User).filter(User.id == activation.user_id).first()
    if not user or user.status in {"DEACTIVATED", "ARCHIVED"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account cannot be activated")

    password_hash, password_params = hash_password(req.password)
    user.password_hash = password_hash
    user.password_algorithm = password_params["algorithm"]
    user.password_params = password_params
    user.updated_at = now
    activation.status = "CONSUMED"
    activation.consumed_at = now
    record_audit_event(
        db=db,
        action="auth.account_activation.completed",
        result="success",
        actor_id=user.id,
    )
    db.commit()
    return {"status": "password_set", "login_enabled": user.status == "ACTIVE"}


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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm TOTP token and activate MFA enrollment for user."""
    rate_limiter.enforce(
        rate_limiter.key("mfa_verify", current_user.id),
        limit=5,
        window_seconds=300,
        detail="Too many MFA attempts; try again later",
    )
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
