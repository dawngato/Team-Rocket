"""Admin API authentication bridge.

The admin service does not mint or interpret identities itself. In production
it forwards the caller's bearer token or session cookie to the identity issuer
and uses the issuer's response as the authenticated actor context.
"""

from dataclasses import dataclass, field
from typing import Any, List, Set, Optional

import httpx
from fastapi import HTTPException, Request, status

from src.config import settings


@dataclass
class ActorContext:
    user_id: str
    roles: List[str] = field(default_factory=list)
    scopes: List[dict[str, Any]] = field(default_factory=list)
    email: str = ""
    mfa_authenticated: bool = True


OPERATION_ROLES: dict[str, set[str]] = {
    "election.create": {"administrator", "super_admin", "election_officer"},
    "election.update": {"administrator", "super_admin", "election_officer"},
    "election.delete": {"administrator", "super_admin"},
    "candidate.manage": {"administrator", "super_admin", "election_officer"},
    "roster.submit": {"administrator", "super_admin", "election_officer"},
    "roster.approve": {"roster_approver", "super_admin"},
    "election.freeze": {"administrator", "super_admin", "election_officer"},
    "election.open": {"administrator", "super_admin", "election_officer"},
    "election.close": {"administrator", "super_admin", "election_officer"},
    "election.cancel": {"administrator", "super_admin", "election_officer"},
    "election.pause": {"administrator", "super_admin", "election_officer"},
    "result.publish": {"administrator", "super_admin", "election_officer", "auditor"},
    "election.view_internal": {"administrator", "super_admin", "election_officer", "auditor", "roster_approver"},
    "audit.read": {"administrator", "super_admin", "auditor"},
}
ELECTION_ADMIN_ROLES = {"administrator", "super_admin", "election_officer"}


def _identity_profile(request: Request) -> dict[str, Any]:
    authorization = request.headers.get("authorization")
    cookie = request.headers.get("cookie")
    if not authorization and not cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated identity is required")
    headers = {"Accept": "application/json"}
    if authorization:
        headers["Authorization"] = authorization
    if cookie:
        headers["Cookie"] = cookie
    try:
        response = httpx.get(
            f"{settings.identity_service_url}/v1/auth/me",
            headers=headers,
            timeout=settings.identity_request_timeout_seconds,
            follow_redirects=False,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Identity service is unavailable; administrative action was not attempted",
        ) from exc
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identity session is invalid")
    try:
        profile = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Identity response was invalid") from exc
    if not isinstance(profile, dict) or not isinstance(profile.get("user_id"), str):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Identity response was invalid")
    if not profile.get("mfa_authenticated"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA is required for administrative actions")
    return profile


def get_authenticated_actor_context(request: Request) -> ActorContext:
    """Resolve the authenticated ActorContext, honoring loopback test headers only in development."""
    if settings.allow_dev_actor_headers:
        client_host = request.client.host if request.client else ""
        if client_host not in {"127.0.0.1", "::1", "localhost", "testclient", "testserver"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Development actor headers are restricted to a loopback test boundary",
            )
        actor_id = None
        for header_name in ["X-Actor-ID", "x-actor-id", "X_Actor_ID", "x_actor_id", "actor_id"]:
            value = request.headers.get(header_name)
            if value:
                actor_id = value
                break
        if not actor_id:
            actor_id = "election_officer_default"

        # Test-only actor IDs provide fixed role fixtures. Never accept a
        # caller-supplied role header, even in the loopback development mode.
        lower_id = actor_id.lower()
        if "approver" in lower_id:
            roles = ["roster_approver"]
        elif "auditor" in lower_id:
            roles = ["auditor"]
        elif "student" in lower_id:
            roles = ["student"]
        elif "teacher" in lower_id:
            roles = ["teacher"]
        elif "importer" in lower_id:
            roles = ["election_officer", "administrator"]
        else:
            roles = ["election_officer", "administrator"]

        return ActorContext(
            user_id=actor_id,
            roles=roles,
            scopes=[{"type": "global", "id": "*"}],
            email=f"{actor_id}@dev.local",
            mfa_authenticated=True,
        )

    profile = _identity_profile(request)
    return ActorContext(
        user_id=profile["user_id"],
        roles=profile.get("roles", []),
        scopes=profile.get("scopes", []),
        email=profile.get("email", ""),
        mfa_authenticated=bool(profile.get("mfa_authenticated", False)),
    )


def get_authenticated_actor(request: Request) -> str:
    """Resolve actor user_id from the authenticated identity."""
    actor = get_authenticated_actor_context(request)
    if not any(role.strip().lower() in ELECTION_ADMIN_ROLES for role in actor.roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An election administration role is required")
    return actor.user_id


def actor_has_election_scope(actor: ActorContext, election_id: str) -> bool:
    """Return whether the verified actor is authorized for this election.

    Election records are not yet linked to tenant/department identifiers, so
    only an explicit election grant, an institution-wide grant, or a
    super-admin grant can be safely evaluated here.
    """
    roles = {role.strip().lower() for role in actor.roles if isinstance(role, str)}
    if "super_admin" in roles:
        return True
    for scope in actor.scopes:
        if not isinstance(scope, dict):
            continue
        scope_type = str(scope.get("scope_type", scope.get("type", ""))).strip().lower()
        scope_id = str(scope.get("scope_id", scope.get("id", ""))).strip()
        if scope_type in {"global", "institution", "tenant"} and scope_id == "*":
            return True
        if scope_type == "election" and scope_id == election_id:
            return True
    return False


def require_election_scope(actor: ActorContext, election_id: str) -> None:
    if not actor_has_election_scope(actor, election_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The authenticated actor is not assigned to this election",
        )


def require_permission(operation: str):
    """Enforce operation-level authorization policies."""
    def dependency(request: Request) -> ActorContext:
        actor = get_authenticated_actor_context(request)
        allowed_roles = OPERATION_ROLES.get(operation, set())
        if not any(role in allowed_roles for role in actor.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Actor lacks required role for operation '{operation}'",
            )
        return actor
    return dependency
