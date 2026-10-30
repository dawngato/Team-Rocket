"""
Security tests for casting origin separation and identity header rejection.
Adheres to Section 5.2 and Section 6.3 of HimVote specification.
"""

import pytest
from src.config import settings


@pytest.mark.anyio
async def test_reject_authorization_header(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Verify requests presenting an Authorization header are rejected with 403.
    Casting origin must remain separate from identity authentication.
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_auth_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_auth_01"
    }
    headers = {
        "Authorization": "Bearer identity_bearer_token_secret"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload,
        headers=headers
    )

    assert response.status_code == 403
    data = response.json()
    assert data["error"] == "FORBIDDEN_AUTHORIZATION_HEADER"


@pytest.mark.anyio
async def test_reject_identity_cookie(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Verify requests presenting identity cookies are rejected with 403.
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_cookie_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_cookie_01"
    }
    headers = {
        "Cookie": "session_id=session_token_identity_origin; himvote_token=abc"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload,
        headers=headers
    )

    assert response.status_code == 403
    data = response.json()
    assert data["error"] == "FORBIDDEN_IDENTITY_COOKIE"


@pytest.mark.anyio
async def test_strip_identity_custom_headers(
    client,
    open_election,
    sample_election_id,
    make_proof,
    valid_ballot_b64url,
    valid_proofs_b64url
):
    """
    Verify that custom identity tracking headers are safely stripped and ignored.
    """
    payload = {
        "election_id": sample_election_id,
        "credential_proof_b64url": make_proof("null_strip_01"),
        "engine_ballot_b64url": valid_ballot_b64url,
        "engine_proofs_b64url": valid_proofs_b64url,
        "idempotency_key": "idemp_strip_01"
    }
    # Headers that could link identity to the vote
    headers = {
        "X-Student-Id": "STU123456",
        "X-Identity-Token": "ident_secret",
        "X-User-Id": "usr_999"
    }

    response = await client.post(
        f"/v1/cast/{sample_election_id}/ballots",
        json=payload,
        headers=headers
    )

    # Request without cookies and auth succeeds while headers get stripped
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "COMMITTED_PENDING_WITNESS"


@pytest.mark.anyio
async def test_security_response_headers(client):
    """
    Verify essential defense in depth headers are attached to responses.
    """
    response = await client.get("/v1/health")
    assert response.status_code == 200
    assert response.headers.get("Cache-Control") == "no-store, no-cache, must-revalidate"
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "default-src 'none'" in response.headers.get("Content-Security-Policy", "")


@pytest.mark.anyio
async def test_production_lifecycle_routes_require_internal_control_token(
    client,
    open_election,
    sample_election_id,
):
    """Internal open and close operations must not be publicly callable."""
    original_env = settings.APP_ENV
    original_token = settings.INTERNAL_CONTROL_TOKEN
    settings.APP_ENV = "production"
    settings.INTERNAL_CONTROL_TOKEN = "control_secret_for_test"
    try:
        rejected = await client.post(f"/v1/admin/elections/{sample_election_id}/open")
        accepted = await client.post(
            f"/v1/admin/elections/{sample_election_id}/open",
            headers={"X-Internal-Control-Token": "control_secret_for_test"},
        )
    finally:
        settings.APP_ENV = original_env
        settings.INTERNAL_CONTROL_TOKEN = original_token

    assert rejected.status_code == 403
    assert accepted.status_code == 200


@pytest.mark.anyio
async def test_casting_cors_rejects_untrusted_origin(client):
    """Anonymous casting still uses an explicit browser origin allowlist."""
    original_origins = settings.ALLOWED_ORIGINS
    settings.ALLOWED_ORIGINS = ["http://localhost:3000"]
    try:
        response = await client.options(
            "/v1/health",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "POST",
            },
        )
    finally:
        settings.ALLOWED_ORIGINS = original_origins

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
