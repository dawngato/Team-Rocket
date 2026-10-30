from __future__ import annotations

import os
from pathlib import Path
from typing import Callable

from fastapi import Depends, FastAPI, Header
from fastapi.responses import JSONResponse

from .db import Database
from .models import (
    BallotSubmission,
    CandidateCreate,
    CastResponse,
    CredentialProvisionRequest,
    CredentialProvisionResponse,
    ElectionCreate,
    ElectionView,
    HealthResponse,
    ReceiptView,
    Role,
    RosterUpdate,
)
from .service import Actor, DomainError, SecureVoteService


def create_app(db_path: str | Path | None = None) -> FastAPI:
    configured_path = db_path or os.environ.get("SECUREVOTE_DB_PATH", "securevote.sqlite3")
    service = SecureVoteService(Database(configured_path))
    app = FastAPI(
        title="SecureVote Integrity Prototype API",
        version="0.1.0",
        description=(
            "Educational integrity/evidence slice. It does not implement a vetted encrypted "
            "election engine, tally proofs, or an independent witness."
        ),
    )
    app.state.service = service

    @app.exception_handler(DomainError)
    async def domain_error_handler(_, error: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": error.code, "message": error.message}},
        )

    def get_actor(
        x_actor_role: str = Header(..., alias="X-Actor-Role"),
        x_actor_id: str = Header(..., alias="X-Actor-ID"),
    ) -> Actor:
        try:
            role = Role(x_actor_role.strip().lower())
        except ValueError as error:
            raise DomainError("INVALID_ROLE", "Unknown synthetic role", 403) from error
        if not x_actor_id.strip():
            raise DomainError("INVALID_ACTOR", "Actor ID is required", 403)
        return Actor(role=role, actor_id=x_actor_id.strip())

    def require_roles(*roles: Role) -> Callable:
        def dependency(actor: Actor = Depends(get_actor)) -> Actor:
            if actor.role not in set(roles):
                raise DomainError("FORBIDDEN_SCOPE", "This role cannot perform the requested action", 403)
            return actor

        return dependency

    @app.get("/healthz", response_model=HealthResponse)
    def health() -> dict:
        return service.health()

    @app.post("/v1/elections", response_model=ElectionView, status_code=201)
    def create_election(
        payload: ElectionCreate,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        return service.create_election(actor, payload.title)

    @app.get("/v1/elections/{election_id}", response_model=ElectionView)
    def get_election(election_id: str):
        return service.get_election(election_id)

    @app.post("/v1/elections/{election_id}/candidates", response_model=ElectionView)
    def add_candidate(
        election_id: str,
        payload: CandidateCreate,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        return service.add_candidate(actor, election_id, payload.candidate_id, payload.name)

    @app.put("/v1/elections/{election_id}/roster", response_model=ElectionView)
    def set_roster(
        election_id: str,
        payload: RosterUpdate,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        return service.set_roster(actor, election_id, payload.student_ids)

    @app.post("/v1/elections/{election_id}/roster/approve", response_model=ElectionView)
    def approve_roster(
        election_id: str,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.TEACHER)),
    ):
        return service.approve_roster(actor, election_id)

    @app.post(
        "/v1/elections/{election_id}/credentials",
        response_model=CredentialProvisionResponse,
    )
    def provision_credential(
        election_id: str,
        payload: CredentialProvisionRequest,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        service.provision_credential(actor, election_id, payload.student_id, payload.credential_token)
        return {
            "election_id": election_id,
            "student_id": payload.student_id,
            "status": "PROVISIONED",
        }

    @app.post("/v1/elections/{election_id}/freeze", response_model=ElectionView)
    def freeze(
        election_id: str,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        return service.freeze(actor, election_id)

    @app.post("/v1/elections/{election_id}/open", response_model=ElectionView)
    def open_election(
        election_id: str,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        return service.open_election(actor, election_id)

    @app.post("/v1/elections/{election_id}/close", response_model=ElectionView)
    def close_election(
        election_id: str,
        actor: Actor = Depends(require_roles(Role.ADMIN, Role.ELECTION_OFFICER)),
    ):
        return service.close_election(actor, election_id)

    @app.post("/v1/elections/{election_id}/ballots", response_model=CastResponse, status_code=202)
    def cast_ballot(
        election_id: str,
        payload: BallotSubmission,
        actor: Actor = Depends(require_roles(Role.STUDENT)),
    ):
        return service.cast_ballot(actor, election_id, payload)

    @app.get("/v1/elections/{election_id}/receipts/{receipt_id}", response_model=ReceiptView)
    def get_receipt(election_id: str, receipt_id: str):
        receipt = service.get_receipt(receipt_id)
        if receipt["election_id"] != election_id:
            raise DomainError("RECEIPT_NOT_FOUND", "Receipt was not found", 404)
        return receipt

    return app


app = create_app()
