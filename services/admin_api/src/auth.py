"""Admin API authentication bridge and operation policy enforcement.

The admin service does not mint or interpret identities itself. In production
it forwards the caller's bearer token or session cookie to the identity issuer
and uses the issuer's response as the authenticated actor context.
"""

from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException, Request, status

from src.config import settings


ROLE_ALIASES = {
    "admin": "administrator",
    "officer": "election_officer",
    "superadmin": "super_admin",
}


@dataclass(frozen=True)
class ScopeGrant:
    role: str
    scope_type: str
    scope_id: str


@dataclass(frozen=True)
class ActorContext:
    actor_id: str
    roles: frozenset[str]
    scopes: tuple[ScopeGrant, ...]
    mfa_authenticated: bool
    development: bool = False

    def has_role(self, *roles: str) -> bool:
        allowed = {ROLE_ALIASES.get(role, role) for role in roles}
        return bool(self.roles.intersection(allowed))

    def has_scope(self, *, election_id: str | None = None, institution_id: str | None = None) -> bool:
        """Return whether this actor has an explicit election or institution grant.

        A wildcard is only meaningful when it was provisioned by the identity
        service.  It is never accepted from a caller supplied role header in
        production.
        """
        for grant in self.scopes:
            scope_type = grant.scope_type.lower()
            scope_id = grant.scope_id
            if scope_type == "global" or scope_id == "*":
                return True
            if election_id and scope_id == election_id and scope_type in {"election", "election_id", "delegated"}:
                return True
            if institution_id and scope_id == institution_id and scope_type in {
                "institution",
                "tenant",
                "campus",
                "delegated",
            }:
                return True
        return False


OPERATION_ROLES: dict[str, tuple[str, ...]] = {
    "election.create": ("super_admin", "administrator", "election_officer"),
    "election.update": ("super_admin", "administrator", "election_officer"),
    "election.delete": ("super_admin", "administrator", "election_officer"),
    "candidate.manage": ("super_admin", "administrator", "election_officer"),
    "roster.submit": ("super_admin", "administrator", "election_officer"),
    "roster.approve": ("super_admin", "roster_approver"),
    "election.freeze": ("super_admin", "administrator", "election_officer"),
    "election.open": ("super_admin", "administrator", "election_officer"),
    "election.close": ("super_admin", "administrator", "election_officer"),
    "result.publish": ("super_admin", "administrator", "election_officer"),
    "election.read_internal": (
        "super_admin",
        "administrator",
        "election_officer",
        "auditor",
        "roster_approver",
    ),
    "audit.read": ("super_admin", "administrator", "auditor"),
}


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
    roles = profile.get("roles")
    if not isinstance(roles, list) or not any(isinstance(role, str) for role in roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No administrative role is assigned")
    scopes = profile.get("scopes")
    if not isinstance(scopes, list) or any(
        not isinstance(scope, dict)
        or not all(isinstance(scope.get(key), str) and scope.get(key) for key in ("role", "scope_type", "scope_id"))
        for scope in scopes
    ):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Identity response did not include valid scopes")
    if not profile.get("mfa_authenticated"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA is required for administrative actions")
    return profile


def _context_from_profile(profile: dict[str, Any], *, development: bool = False) -> ActorContext:
    roles = frozenset(
        ROLE_ALIASES.get(role.strip().lower(), role.strip().lower())
        for role in profile.get("roles", [])
        if isinstance(role, str) and role.strip()
    )
    grants = tuple(
        ScopeGrant(
            role=ROLE_ALIASES.get(scope["role"].strip().lower(), scope["role"].strip().lower()),
            scope_type=scope["scope_type"].strip().lower(),
            scope_id=scope["scope_id"].strip(),
        )
        for scope in profile.get("scopes", [])
    )
    return ActorContext(
        actor_id=profile["user_id"],
        roles=roles,
        scopes=grants,
        mfa_authenticated=bool(profile.get("mfa_authenticated")),
        development=development,
    )


def get_authenticated_context(request: Request) -> ActorContext:
    """Resolve the identity once and cache the trusted context on the request."""
    existing = getattr(request.state, "admin_actor_context", None)
    if isinstance(existing, ActorContext):
        return existing

    if settings.allow_dev_actor_headers:
        client_host = request.client.host if request.client else ""
        if client_host not in {"127.0.0.1", "::1", "localhost", "testclient", "testserver"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Development actor headers are restricted to a loopback test boundary",
            )
        actor_id = next(
            (
                request.headers.get(header_name)
                for header_name in ["X-Actor-ID", "x-actor-id", "X_Actor_ID", "x_actor_id", "actor_id"]
                if request.headers.get(header_name)
            ),
            "election_officer_default",
        )
        context = ActorContext(
            actor_id=actor_id,
            roles=frozenset({
                "super_admin",
                "administrator",
                "election_officer",
                "roster_approver",
                "auditor",
            }),
            scopes=(ScopeGrant(role="super_admin", scope_type="global", scope_id="*"),),
            mfa_authenticated=True,
            development=True,
        )
    else:
        context = _context_from_profile(_identity_profile(request))

    request.state.admin_actor_context = context
    return context


def get_authenticated_actor(request: Request) -> str:
    """Return the trusted actor ID while retaining the full policy context."""
    return get_authenticated_context(request).actor_id


def require_operation(
    request: Request,
    operation: str,
    *,
    election_id: str | None = None,
    institution_id: str | None = None,
) -> ActorContext:
    """Enforce role, MFA, and resource scope for an administrative operation."""
    context = get_authenticated_context(request)
    required_roles = OPERATION_ROLES.get(operation)
    if not required_roles:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unknown administrative operation")
    if not context.has_role(*required_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role is not authorized for {operation}")
    if not context.mfa_authenticated:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA is required for this operation")
    if context.development:
        return context
    if (election_id or institution_id) and not context.has_scope(
        election_id=election_id,
        institution_id=institution_id,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Actor is outside the requested institution or election scope")
    return context
