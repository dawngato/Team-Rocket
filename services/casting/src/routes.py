"""
FastAPI routing declarations for casting endpoints.
Implements POST /v1/cast/{election_id}/ballots and GET /v1/cast/{election_id}/receipts/{handle}.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas import (
    CastBallotRequest,
    CastBallotResponse,
    ReceiptStatusResponse,
)
from src.service import (
    cast_ballot_transaction,
    close_election_state,
    get_receipt_status,
    open_election_state,
)
from src.security import require_internal_control_token

router = APIRouter(prefix="/v1", tags=["casting"])


@router.post(
    "/cast/{election_id}/ballots",
    response_model=CastBallotResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Cast an encrypted ballot anonymously",
    description="Accepts an encrypted ballot and credential proof, committing it to the leaf log."
)
async def cast_ballot(
    election_id: str,
    request: CastBallotRequest,
    session: AsyncSession = Depends(get_db)
) -> CastBallotResponse:
    """
    Handle atomic ballot casting transaction.
    """
    return await cast_ballot_transaction(
        session=session,
        election_id=election_id,
        request=request
    )


@router.get(
    "/cast/{election_id}/receipts/{handle}",
    response_model=ReceiptStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve receipt status by opaque handle",
    description="Returns current witness status and leaf index for an opaque receipt handle."
)
async def get_receipt(
    election_id: str,
    handle: str,
    session: AsyncSession = Depends(get_db)
) -> ReceiptStatusResponse:
    """
    Lookup receipt status without disclosing identity.
    """
    return await get_receipt_status(
        session=session,
        election_id=election_id,
        handle=handle
    )


@router.post(
    "/admin/elections/{election_id}/open",
    status_code=status.HTTP_200_OK,
    summary="Open election for casting",
    description="Transitions election state to OPEN under atomic election row lock."
)
async def open_election(
    election_id: str,
    session: AsyncSession = Depends(get_db),
    _control: None = Depends(require_internal_control_token),
) -> dict:
    """
    Open election endpoint.
    """
    return await open_election_state(session=session, election_id=election_id)


@router.post(
    "/admin/elections/{election_id}/close",
    status_code=status.HTTP_200_OK,
    summary="Close election for casting",
    description="Closes election, records final_tree_size equal to next_leaf_index under row lock."
)
async def close_election(
    election_id: str,
    session: AsyncSession = Depends(get_db),
    _control: None = Depends(require_internal_control_token),
) -> dict:
    """
    Close election endpoint.
    """
    return await close_election_state(session=session, election_id=election_id)


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Service healthcheck",
    description="Liveness and readiness health probe."
)
async def health_check() -> dict:
    """
    Healthcheck endpoint returning operational status.
    """
    return {
        "status": "healthy",
        "service": "himvote_casting",
        "version": "2.0.0"
    }
