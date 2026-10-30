"""Admin API authentication bridge.

The admin service does not mint or interpret identities itself. In production
it forwards the caller's bearer token or session cookie to the identity issuer
and uses the issuer's response as the authenticated actor context.
"""

from typing import Any

import httpx
from fastapi import HTTPException, Request, status

from src.config import settings


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
    if not profile.get("mfa_authenticated"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MFA is required for administrative actions")
    return profile


def get_authenticated_actor(request: Request) -> str:
    """Resolve an actor from the identity issuer, with an explicit dev-only test escape hatch."""
    if settings.allow_dev_actor_headers:
        for header_name in ["X-Actor-ID", "x-actor-id", "X_Actor_ID", "x_actor_id", "actor_id"]:
            value = request.headers.get(header_name)
            if value:
                return value
        # Existing unit tests and local fixture deployments use this only in
        # development. Production never reaches this branch.
        return "election_officer_default"
    return _identity_profile(request)["user_id"]
