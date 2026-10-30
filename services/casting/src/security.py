"""
Security middleware enforcing origin separation and identity header stripping.
According to Section 5.2 and Section 6.3 of the specification.
"""

import logging
import hmac
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from src.config import settings

logger = logging.getLogger("casting.security")

# Forbidden header keys that identify or authenticate user identity
FORBIDDEN_IDENTITY_HEADERS = {
    "authorization",
    "cookie",
    "x_identity_token",
    "x_student_id",
    "x_user_id",
    "x_session_id",
    "x_auth_token",
    "x_identity_origin",
}


class CastingOriginSecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware verifying that requests reaching casting origin contain
    neither identity cookies nor identity Authorization tokens.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        headers_lower = {k.lower(): v for k, v in request.headers.items()}

        # 1. Reject requests containing Authorization header
        if "authorization" in headers_lower:
            logger.warning(
                "Rejected request containing Authorization header on casting origin: path=%s",
                request.url.path
            )
            return JSONResponse(
                status_code=403,
                content={
                    "error": "FORBIDDEN_AUTHORIZATION_HEADER",
                    "message": "Authorization header is strictly prohibited on casting origin"
                }
            )

        # 2. Reject requests containing Cookie header or cookies
        if "cookie" in headers_lower or len(request.cookies) > 0:
            logger.warning(
                "Rejected request containing cookies on casting origin: path=%s",
                request.url.path
            )
            return JSONResponse(
                status_code=403,
                content={
                    "error": "FORBIDDEN_IDENTITY_COOKIE",
                    "message": "Identity cookies are strictly prohibited on casting origin"
                }
            )

        # 3. Strip any residual tracking or identity custom headers from request scope
        sanitized_headers = []
        for raw_k, raw_v in request.scope.get("headers", []):
            decoded_key = raw_k.decode("latin1").lower()
            normalized_key = decoded_key.replace("-", "_")
            if normalized_key in FORBIDDEN_IDENTITY_HEADERS:
                logger.info(
                    "Stripping prohibited header key on casting origin: key=%s",
                    decoded_key
                )
                continue
            sanitized_headers.append((raw_k, raw_v))
        request.scope["headers"] = sanitized_headers

        # 4. Process request downstream
        response = await call_next(request)

        # 5. Attach defensive security headers to every response
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none';"
        response.headers["Referrer-Policy"] = "no-referrer"

        return response


async def require_internal_control_token(request: Request) -> None:
    """Protect lifecycle control routes in production.

    Casting remains anonymous for voters. Open and close are internal control
    operations and must use a secret injected by the service mesh or gateway.
    Local development keeps the route available to the isolated test harness.
    """
    if settings.APP_ENV != "production":
        return
    supplied = request.headers.get("X-Internal-Control-Token")
    expected = settings.INTERNAL_CONTROL_TOKEN
    if not expected or not supplied or not hmac.compare_digest(supplied, expected):
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail="Internal lifecycle control authentication failed",
        )
