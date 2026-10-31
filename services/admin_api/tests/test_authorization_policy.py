"""Focused operation policy tests for role and election scope enforcement."""

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from src.auth import ActorContext, ScopeGrant, require_operation


def request_with_context(context: ActorContext) -> Request:
    request = Request({
        "type": "http",
        "method": "POST",
        "path": "/v1/elections/elec_1",
        "headers": [],
        "client": ("127.0.0.1", 5000),
        "server": ("testserver", 80),
        "scheme": "http",
    })
    request.state.admin_actor_context = context
    return request


def test_election_officer_can_manage_assigned_election():
    context = ActorContext(
        actor_id="officer-1",
        roles=frozenset({"election_officer"}),
        scopes=(ScopeGrant("election_officer", "election", "elec_1"),),
        mfa_authenticated=True,
    )
    request = request_with_context(context)
    assert require_operation(request, "candidate.manage", election_id="elec_1") == context


def test_election_officer_cannot_manage_another_election():
    context = ActorContext(
        actor_id="officer-1",
        roles=frozenset({"election_officer"}),
        scopes=(ScopeGrant("election_officer", "election", "elec_1"),),
        mfa_authenticated=True,
    )
    with pytest.raises(HTTPException) as error:
        require_operation(request_with_context(context), "candidate.manage", election_id="elec_2")
    assert error.value.status_code == 403


def test_authenticated_teacher_cannot_publish_results():
    context = ActorContext(
        actor_id="teacher-1",
        roles=frozenset({"teacher"}),
        scopes=(ScopeGrant("teacher", "institution", "campus-a"),),
        mfa_authenticated=True,
    )
    with pytest.raises(HTTPException) as error:
        require_operation(request_with_context(context), "result.publish", institution_id="campus-a")
    assert error.value.status_code == 403
