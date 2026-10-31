from unittest.mock import Mock

import pytest
from fastapi import HTTPException, Request

from src import auth
from src.auth import ActorContext
from src.config import settings


def make_request():
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/v1/elections",
        "headers": [(b"authorization", b"Bearer test-session")],
        "query_string": b"",
        "server": ("test", 443),
        "client": ("127.0.0.1", 12345),
        "scheme": "https",
    })


def test_identity_actor_rejects_authenticated_student(monkeypatch):
    original_dev_mode = settings.allow_dev_actor_headers
    settings.allow_dev_actor_headers = False
    monkeypatch.setattr(
        auth.httpx,
        "get",
        lambda *args, **kwargs: Mock(
            status_code=200,
            json=lambda: {
                "user_id": "student-1",
                "roles": ["student"],
                "scopes": [],
                "mfa_authenticated": True,
            },
        ),
    )
    try:
        with pytest.raises(HTTPException) as error:
            auth.get_authenticated_actor(make_request())
        assert error.value.status_code == 403
    finally:
        settings.allow_dev_actor_headers = original_dev_mode


def test_identity_actor_accepts_mfa_authenticated_election_admin(monkeypatch):
    original_dev_mode = settings.allow_dev_actor_headers
    settings.allow_dev_actor_headers = False
    monkeypatch.setattr(
        auth.httpx,
        "get",
        lambda *args, **kwargs: Mock(
            status_code=200,
            json=lambda: {
                "user_id": "officer-1",
                "roles": ["election_officer"],
                "scopes": [],
                "mfa_authenticated": True,
            },
        ),
    )
    try:
        assert auth.get_authenticated_actor(make_request()) == "officer-1"
    finally:
        settings.allow_dev_actor_headers = original_dev_mode


def test_election_scope_requires_exact_assignment_or_institution_wide_grant():
    assigned = ActorContext(
        user_id="officer-1",
        roles=["election_officer"],
        scopes=[{"scope_type": "election", "scope_id": "elec_A"}],
    )
    assert auth.actor_has_election_scope(assigned, "elec_A")
    assert not auth.actor_has_election_scope(assigned, "elec_B")
    with pytest.raises(HTTPException) as error:
        auth.require_election_scope(assigned, "elec_B")
    assert error.value.status_code == 403

    super_admin = ActorContext(user_id="root-1", roles=["super_admin"], scopes=[])
    assert auth.actor_has_election_scope(super_admin, "elec_B")
