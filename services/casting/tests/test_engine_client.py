"""Tests for the casting to election-engine validation boundary."""

import httpx
import pytest

from src.config import settings
from src.engine_client import EngineValidationUnavailable, validate_ballot_with_engine


@pytest.mark.anyio
async def test_syntax_only_validation_is_forbidden_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENGINE_VALIDATION_MODE", "syntax_only")
    monkeypatch.setattr(settings, "APP_ENV", "production")

    valid, reason = await validate_ballot_with_engine(
        election_id="election-1",
        manifest_digest="manifest-1",
        engine_ballot_b64url="eyJjaG9pY2UiOiJjYW5kaWRhdGUifQ",
        engine_proofs_b64url="eyJwcm9vZiI6InRlc3QifQ",
    )

    assert valid is False
    assert reason.startswith("CRYPTO_ENGINE_NOT_VALIDATED")


@pytest.mark.anyio
async def test_remote_validation_without_engine_url_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, "ENGINE_VALIDATION_MODE", "remote")
    monkeypatch.setattr(settings, "ELECTION_ENGINE_BASE", "")

    valid, reason = await validate_ballot_with_engine(
        election_id="election-1",
        manifest_digest="manifest-1",
        engine_ballot_b64url="eyJjaG9pY2UiOiJjYW5kaWRhdGUifQ",
        engine_proofs_b64url="eyJwcm9vZiI6InRlc3QifQ",
    )

    assert valid is False
    assert reason == "CRYPTO_ENGINE_NOT_VALIDATED: engine service URL is not configured"


@pytest.mark.anyio
async def test_unknown_validation_mode_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, "ENGINE_VALIDATION_MODE", "untrusted_mode")

    valid, reason = await validate_ballot_with_engine(
        election_id="election-1",
        manifest_digest="manifest-1",
        engine_ballot_b64url="eyJjaG9pY2UiOiJjYW5kaWRhdGUifQ",
        engine_proofs_b64url="eyJwcm9vZiI6InRlc3QifQ",
    )

    assert valid is False
    assert reason.startswith("CRYPTO_ENGINE_NOT_VALIDATED")


@pytest.mark.anyio
async def test_malformed_remote_engine_response_fails_closed(monkeypatch):
    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, json):
            return httpx.Response(200, json={"accepted": True})

    monkeypatch.setattr("src.engine_client.httpx.AsyncClient", lambda **_: FakeClient())
    monkeypatch.setattr(settings, "ENGINE_VALIDATION_MODE", "remote")
    monkeypatch.setattr(settings, "ELECTION_ENGINE_BASE", "http://engine.test")

    with pytest.raises(EngineValidationUnavailable, match="CRYPTO_ENGINE_INVALID_RESPONSE"):
        await validate_ballot_with_engine(
            election_id="election-1",
            manifest_digest="manifest-1",
            engine_ballot_b64url="ballot",
            engine_proofs_b64url="proofs",
        )
