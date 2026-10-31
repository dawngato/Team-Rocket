from __future__ import annotations

from fastapi.testclient import TestClient

from himvote_api.app import create_app


def headers(role: str, actor_id: str = "actor-1") -> dict[str, str]:
    return {"X-Actor-Role": role, "X-Actor-ID": actor_id}


def test_unauthorized_role_cannot_create_election(tmp_path):
    client = TestClient(create_app(tmp_path / "api.sqlite3"))

    response = client.post(
        "/v1/elections",
        headers=headers("student", "student-001"),
        json={"title": "Should be denied"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN_SCOPE"


def test_api_cast_response_and_health_are_privacy_safe(tmp_path):
    client = TestClient(create_app(tmp_path / "api.sqlite3"))
    admin = headers("election_officer", "officer-1")
    teacher = headers("teacher", "teacher-1")

    election = client.post("/v1/elections", headers=admin, json={"title": "API Election"})
    assert election.status_code == 201
    election_id = election.json()["election_id"]
    assert client.post(
        f"/v1/elections/{election_id}/candidates",
        headers=admin,
        json={"candidate_id": "a", "name": "A"},
    ).status_code == 200
    assert client.put(
        f"/v1/elections/{election_id}/roster",
        headers=admin,
        json={"student_ids": ["student-001"]},
    ).status_code == 200
    assert client.post(
        f"/v1/elections/{election_id}/roster/approve", headers=teacher
    ).status_code == 200
    assert client.post(
        f"/v1/elections/{election_id}/credentials",
        headers=admin,
        json={"student_id": "student-001", "credential_token": "synthetic-api-credential"},
    ).status_code == 200
    assert client.post(f"/v1/elections/{election_id}/freeze", headers=admin).status_code == 200
    assert client.post(f"/v1/elections/{election_id}/open", headers=admin).status_code == 200

    cast = client.post(
        f"/v1/elections/{election_id}/ballots",
        headers=headers("student", "student-001"),
        json={
            "credential_token": "synthetic-api-credential",
            "encrypted_ballot": "opaque-artifact",
            "proof_artifact": "opaque-proof",
        },
    )
    assert cast.status_code == 202
    assert set(cast.json()) == {"receipt_id", "status", "leaf_index", "evidence_digest", "message"}
    assert "student-001" not in cast.text
    assert "candidate" not in cast.text.lower()

    receipt = client.get(f"/v1/elections/{election_id}/receipts/{cast.json()['receipt_id']}")
    assert receipt.status_code == 200
    assert "student_id" not in receipt.json()
    assert receipt.json()["status"] == "ACCEPTED_PENDING_WITNESS"

    health = client.get("/healthz")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["pending_outbox_events"] == 1
