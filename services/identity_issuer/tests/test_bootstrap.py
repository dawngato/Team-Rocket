"""
Unit tests for one time bootstrap claim endpoint.
Verifies initial super admin creation, mandatory MFA enrollment, and permanent deactivation.
"""

from services.identity_issuer.config import BOOTSTRAP_INVITATION_TOKEN


def test_bootstrap_claim_success_and_permanent_disable(client):
    """Verify first bootstrap call succeeds and subsequent calls are permanently forbidden."""
    payload = {
        "invitation_token": BOOTSTRAP_INVITATION_TOKEN,
        "password": "SuperSecureAdminPassword2026!",
    }

    # Step 1: Initial claim must succeed
    resp = client.post("/v1/bootstrap/claim", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "bootstrap_completed"
    assert "user_id" in data
    assert "totp_secret" in data
    assert "totp_uri" in data

    # Step 2: Immediate retry must be rejected with 403 Forbidden
    retry_resp = client.post("/v1/bootstrap/claim", json=payload)
    assert retry_resp.status_code == 403
    assert "already been claimed" in retry_resp.json()["detail"]


def test_bootstrap_claim_invalid_invitation_token(client):
    """Verify bootstrap rejects invalid invitation token."""
    payload = {
        "invitation_token": "invalid_wrong_token_xyz",
        "password": "SuperSecureAdminPassword2026!",
    }
    resp = client.post("/v1/bootstrap/claim", json=payload)
    assert resp.status_code == 403
    assert "Invalid bootstrap invitation token" in resp.json()["detail"]
