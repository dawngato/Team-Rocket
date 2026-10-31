"""
Bootstrap endpoint for initial Super Administrator setup.
One time execution only, permanently disabled in database after claim.
"""

import hmac

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import APP_ENV, BOOTSTRAP_ALLOWED, BOOTSTRAP_INVITATION_TOKEN, BOOTSTRAP_ADMIN_EMAIL
from ..models import User, RoleDefinition, RoleAssignment, MfaCredential, SystemSetting
from ..schemas import BootstrapClaimRequest, BootstrapClaimResponse
from ..crypto.hashing import hash_password
from ..crypto.totp import generate_totp_secret, get_totp_uri
from .deps import record_audit_event

router = APIRouter(prefix="/v1/bootstrap", tags=["bootstrap"])


@router.post("/claim", response_model=BootstrapClaimResponse, status_code=status.HTTP_200_OK)
def bootstrap_claim(
    req: BootstrapClaimRequest,
    db: Session = Depends(get_db),
):
    """
    One time bootstrap claim for Super Administrator.
    Permanently disabled in the database after initial use.
    """
    # Verify environment setting
    if not BOOTSTRAP_ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bootstrap not permitted by configuration.",
        )

    if APP_ENV == "production":
        # This service has no independently controlled MFA provisioning
        # channel.  Creating an account while withholding the seed would make
        # the first privileged account unusable, while returning it would
        # expose a production secret in an HTTP response.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bootstrap MFA provisioning is not configured.",
        )

    if not BOOTSTRAP_INVITATION_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bootstrap invitation token is not configured.",
        )

    # Check database permanent flag
    claimed_setting = db.query(SystemSetting).filter(SystemSetting.key == "bootstrap_claimed").first()
    if claimed_setting and claimed_setting.value == "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bootstrap has already been claimed and is permanently disabled.",
        )

    # Verify invitation token
    if not hmac.compare_digest(req.invitation_token, BOOTSTRAP_INVITATION_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid bootstrap invitation token.",
        )

    # Check if a super admin already exists
    existing_super_admin = (
        db.query(RoleAssignment)
        .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
        .filter(RoleDefinition.name == "super_admin")
        .first()
    )
    if existing_super_admin:
        # Mark disabled and reject
        if not claimed_setting:
            db.add(SystemSetting(key="bootstrap_claimed", value="true"))
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super administrator account has already been established.",
        )

    # Hash password with Argon2id and recorded parameters
    pwd_hash, pwd_params = hash_password(req.password)

    # Generate TOTP MFA secret for required Super Admin MFA
    totp_secret = generate_totp_secret()
    admin_email = BOOTSTRAP_ADMIN_EMAIL
    totp_uri = get_totp_uri(totp_secret, admin_email)

    # Create Super Admin user
    super_admin_user = User(
        external_id="super_admin_bootstrap",
        email=admin_email,
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
        mfa_enrolled=True,
    )
    db.add(super_admin_user)
    db.flush()

    # Store MFA credential
    mfa_cred = MfaCredential(
        user_id=super_admin_user.id,
        type="totp",
        secret_hash=totp_secret,
        details={"provisioning_uri": totp_uri},
    )
    db.add(mfa_cred)

    # Ensure super_admin role exists
    super_admin_role = db.query(RoleDefinition).filter(RoleDefinition.name == "super_admin").first()
    if not super_admin_role:
        super_admin_role = RoleDefinition(
            name="super_admin",
            description="Super Administrator with institution setup privileges",
        )
        db.add(super_admin_role)
        db.flush()

    # Assign super admin role
    role_assignment = RoleAssignment(
        user_id=super_admin_user.id,
        role_id=super_admin_role.id,
        scope_type="tenant",
        scope_id="*",
        granted_by=super_admin_user.id,
    )
    db.add(role_assignment)

    # Permanently record bootstrap completion in database
    if claimed_setting:
        claimed_setting.value = "true"
    else:
        db.add(SystemSetting(key="bootstrap_claimed", value="true"))

    # Record append only audit event
    record_audit_event(
        db=db,
        action="bootstrap.claim",
        result="success",
        actor_id=super_admin_user.id,
        details={"email": admin_email, "role": "super_admin"},
    )

    db.commit()

    return BootstrapClaimResponse(
        status="bootstrap_completed",
        user_id=super_admin_user.id,
        totp_secret=totp_secret,
        totp_uri=totp_uri,
    )
