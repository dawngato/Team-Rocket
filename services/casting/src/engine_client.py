"""Client for the casting to election-engine validation boundary.

The casting service never treats base64 decoding as ballot validation. In the
normal mode it delegates proof validation to the configured engine service and
fails closed when that service is unavailable or returns an invalid response.
The local ``syntax_only`` mode exists only for isolated UI and transaction
tests; it is rejected when ``APP_ENV=production`` and must not be used for a
security or privacy claim.
"""

from typing import Any, Tuple

import httpx

from src.config import settings
from src.crypto import validate_engine_ballot


class EngineValidationUnavailable(RuntimeError):
    """The configured engine could not provide a validation decision."""


async def validate_ballot_with_engine(
    *,
    election_id: str,
    manifest_digest: str,
    engine_ballot_b64url: str,
    engine_proofs_b64url: str,
) -> Tuple[bool, str]:
    """Return the engine's validation result without forwarding identity data."""
    mode = settings.ENGINE_VALIDATION_MODE.strip().lower()
    if mode == "syntax_only":
        if settings.APP_ENV.strip().lower() == "production":
            return False, "CRYPTO_ENGINE_NOT_VALIDATED: syntax-only validation is forbidden in production"
        return validate_engine_ballot(engine_ballot_b64url, engine_proofs_b64url)

    if mode != "remote":
        return False, "CRYPTO_ENGINE_NOT_VALIDATED: unsupported engine validation mode"

    base_url = settings.ELECTION_ENGINE_BASE.rstrip("/")
    if not base_url:
        return False, "CRYPTO_ENGINE_NOT_VALIDATED: engine service URL is not configured"

    payload = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "ballot_b64url": engine_ballot_b64url,
        "proofs_b64url": engine_proofs_b64url,
    }
    try:
        async with httpx.AsyncClient(
            timeout=settings.ENGINE_VALIDATION_TIMEOUT_SECONDS,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            follow_redirects=False,
        ) as client:
            response = await client.post(f"{base_url}/v1/engine/validate_ballot", json=payload)
    except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPError) as exc:
        raise EngineValidationUnavailable("CRYPTO_ENGINE_UNAVAILABLE") from exc

    if response.status_code >= 500:
        raise EngineValidationUnavailable("CRYPTO_ENGINE_UNAVAILABLE")
    if response.status_code != 200:
        return False, f"CRYPTO_ENGINE_REJECTED: engine returned HTTP {response.status_code}"

    try:
        result: Any = response.json()
    except ValueError as exc:
        raise EngineValidationUnavailable("CRYPTO_ENGINE_INVALID_RESPONSE") from exc

    if not isinstance(result, dict) or not isinstance(result.get("valid"), bool):
        raise EngineValidationUnavailable("CRYPTO_ENGINE_INVALID_RESPONSE")
    reason = result.get("reason")
    if reason is not None and not isinstance(reason, str):
        raise EngineValidationUnavailable("CRYPTO_ENGINE_INVALID_RESPONSE")
    return result["valid"], reason or ""
