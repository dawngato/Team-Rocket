"""Test suite for FastAPI endpoints in services/election_engine/main.py."""

from fastapi.testclient import TestClient

from ..main import app


def test_health_endpoint() -> None:
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "election_engine"


def test_protocol_version_endpoint() -> None:
    client = TestClient(app)
    resp = client.get("/v1/engine/protocol_version")
    assert resp.status_code == 200
    data = resp.json()
    assert data["supports_revoting_prevention"] is True
    assert data["supports_web_booth"] is True
    assert data["provider"] == "himvote_veem_v1"
