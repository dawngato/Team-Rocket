"""
Election lifecycle and management API router.
Implements Section 4 and Section 6.2 endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import uuid

from src.db import get_db
from src.models.database import (
    ElectionModel,
    ElectionStateModel,
    CandidateModel,
    ElectionRosterSnapshotModel,
    PublishedResultModel,
    utcnow_str
)
from src.models.schemas import (
    ElectionList,
    ElectionSummary,
    Election,
    Candidate,
    CreateElectionRequest,
    UpdateElectionRequest,
    RosterSubmitRequest,
    RosterApproveRequest,
    FreezeElectionRequest,
    PublicationRequest,
    PublishedResults,
    EvidencePackage,
    CancelElectionRequest,
    PauseElectionRequest
)
from src.state_machine.lifecycle import (
    ElectionLifecycleManager,
    StateMachineError,
    InvalidStateTransitionError,
    StatePreconditionError
)
from src.services.manifest_service import ManifestService
from src.services.roster_service import RosterService
from src.services.publication_service import PublicationService
from src.services.evidence_service import EvidenceService
from src.services.audit_service import AuditService
from src.crypto.canonical import canonical_json_str
from src.auth import get_authenticated_actor

router = APIRouter(prefix="/v1/elections", tags=["elections"])


def get_current_actor_id(request: Request) -> str:
    """Extract a development actor only when explicitly enabled.

    Production must receive a validated identity assertion from the identity
    gateway. Accepting a caller supplied actor header in production would allow
    audit records and lifecycle actions to be impersonated.
    """
    return get_authenticated_actor(request)


@router.get("", response_model=ElectionList)
def list_elections(
    state: Optional[str] = Query(None),
    include_internal: bool = Query(False, alias="include_internal"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Lists public elections, or scoped internal elections for operators."""
    query = db.query(ElectionModel).join(ElectionStateModel)
    if state:
        query = query.filter(ElectionStateModel.state == state)
    elif include_internal:
        # Internal lifecycle views must use the same authenticated actor
        # boundary as mutations. Public callers never receive draft metadata.
        get_current_actor_id(request)
    else:
        query = query.filter(
            ElectionStateModel.state.notin_(["DRAFT", "REVIEW", "APPROVED", "DISPUTED", "AUDIT_FAILED"])
        )

    elections = query.all()
    summaries = [
        ElectionSummary(
            id=e.id,
            title=e.title,
            state=e.state_record.state if e.state_record else "UNKNOWN",
            opens_at_utc=e.opens_at_utc,
            closes_at_utc=e.closes_at_utc
        )
        for e in elections
    ]
    return ElectionList(elections=summaries)


@router.post("", response_model=Election, status_code=201)
def create_election(
    req: CreateElectionRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Creates a new election in DRAFT state."""
    ManifestService.validate_utc_timestamps(
        req.opens_at_utc,
        req.closes_at_utc,
        req.issuance_cutoff_utc
    )

    election_id = f"elec_{uuid.uuid4().hex[:12]}"
    election = ElectionModel(
        id=election_id,
        title=req.title,
        contest=req.contest,
        selection_rule=req.selection_rule,
        opens_at_utc=req.opens_at_utc,
        closes_at_utc=req.closes_at_utc,
        issuance_cutoff_utc=req.issuance_cutoff_utc,
        min_anonymous_turnout=req.min_anonymous_turnout or 10
    )
    db.add(election)

    state_record = ElectionStateModel(
        election_id=election_id,
        state="DRAFT",
        manifest_digest="",
        opens_at_utc=req.opens_at_utc,
        closes_at_utc=req.closes_at_utc,
        issuance_cutoff_utc=req.issuance_cutoff_utc,
        state_version=1,
        next_leaf_index=0,
        last_witnessed_tree_size=0
    )
    db.add(state_record)

    AuditService.record_event(
        db=db,
        actor_id=actor_id,
        action="CREATE_ELECTION",
        result="SUCCESS",
        details={"election_id": election_id, "title": req.title}
    )

    db.commit()
    db.refresh(election)

    return Election(
        id=election.id,
        title=election.title,
        state="DRAFT",
        manifest_digest="",
        opens_at_utc=election.opens_at_utc,
        closes_at_utc=election.closes_at_utc,
        issuance_cutoff_utc=election.issuance_cutoff_utc,
        eligible_count=0,
        candidates=[]
    )


@router.get("/{id}", response_model=Election)
def get_election(
    id: str,
    include_internal: bool = Query(False, alias="include_internal"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Retrieves detailed election information."""
    election = db.query(ElectionModel).filter(ElectionModel.id == id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    state = election.state_record.state if election.state_record else "UNKNOWN"
    if state in {"DRAFT", "REVIEW", "APPROVED", "DISPUTED", "AUDIT_FAILED"}:
        if not include_internal:
            raise HTTPException(status_code=404, detail="Election not found")
        get_current_actor_id(request)

    candidates = [
        Candidate(id=c.id, name=c.name, contest=c.contest, statement=c.statement)
        for c in election.candidates
    ]

    roster_snap = (
        db.query(ElectionRosterSnapshotModel)
        .filter(ElectionRosterSnapshotModel.election_id == id)
        .order_by(ElectionRosterSnapshotModel.id.desc())
        .first()
    )
    eligible_count = roster_snap.eligible_count if roster_snap else 0

    return Election(
        id=election.id,
        title=election.title,
        state=election.state_record.state if election.state_record else "UNKNOWN",
        manifest_digest=election.state_record.manifest_digest if election.state_record else "",
        opens_at_utc=election.opens_at_utc,
        closes_at_utc=election.closes_at_utc,
        issuance_cutoff_utc=election.issuance_cutoff_utc,
        contest=election.contest,
        selection_rule=election.selection_rule,
        eligible_count=eligible_count,
        candidates=candidates
    )


@router.put("/{id}", response_model=Election)
def update_election(
    id: str,
    req: UpdateElectionRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Updates election metadata while in DRAFT state."""
    election = db.query(ElectionModel).filter(ElectionModel.id == id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    state = election.state_record.state if election.state_record else "UNKNOWN"
    try:
        ElectionLifecycleManager.assert_mutable(state)
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)

    if req.opens_at_utc or req.closes_at_utc or req.issuance_cutoff_utc:
        opens = req.opens_at_utc or election.opens_at_utc
        closes = req.closes_at_utc or election.closes_at_utc
        cutoff = req.issuance_cutoff_utc or election.issuance_cutoff_utc
        ManifestService.validate_utc_timestamps(opens, closes, cutoff)
        election.opens_at_utc = opens
        election.closes_at_utc = closes
        election.issuance_cutoff_utc = cutoff
        if election.state_record:
            election.state_record.opens_at_utc = opens
            election.state_record.closes_at_utc = closes
            election.state_record.issuance_cutoff_utc = cutoff

    if req.title is not None:
        election.title = req.title
    if req.contest is not None:
        election.contest = req.contest
    if req.selection_rule is not None:
        election.selection_rule = req.selection_rule
    if req.min_anonymous_turnout is not None:
        election.min_anonymous_turnout = req.min_anonymous_turnout

    AuditService.record_event(
        db=db,
        actor_id=actor_id,
        action="UPDATE_ELECTION",
        result="SUCCESS",
        details={"election_id": id}
    )

    db.commit()
    db.refresh(election)
    return get_election(id, db)


@router.delete("/{id}", status_code=204)
def delete_election(
    id: str,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Deletes election while in DRAFT state only."""
    election = db.query(ElectionModel).filter(ElectionModel.id == id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    state = election.state_record.state if election.state_record else "UNKNOWN"
    if state != "DRAFT":
        raise HTTPException(status_code=409, detail=f"Cannot delete election in state {state}")

    AuditService.record_event(
        db=db,
        actor_id=actor_id,
        action="DELETE_ELECTION",
        result="SUCCESS",
        details={"election_id": id}
    )

    db.delete(election)
    db.commit()
    return Response(status_code=204)


@router.get("/{id}/candidates", response_model=List[Candidate])
def list_candidates(
    id: str,
    db: Session = Depends(get_db)
):
    """Lists candidates registered for an election."""
    election = db.query(ElectionModel).filter(ElectionModel.id == id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    return [
        Candidate(id=c.id, name=c.name, contest=c.contest, statement=c.statement)
        for c in election.candidates
    ]


@router.post("/{id}/candidates", status_code=200)
def add_candidates(
    id: str,
    candidates: List[Candidate],
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Replace the authoritative candidate set while the election is mutable."""
    election = db.query(ElectionModel).filter(ElectionModel.id == id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    state = election.state_record.state if election.state_record else "UNKNOWN"
    try:
        ElectionLifecycleManager.assert_mutable(state)
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)

    submitted_ids = {candidate.id for candidate in candidates}
    for existing in list(election.candidates):
        if existing.id not in submitted_ids:
            db.delete(existing)

    for c in candidates:
        cand_model = CandidateModel(
            id=c.id,
            election_id=id,
            name=c.name,
            contest=c.contest,
            statement=c.statement,
        )
        db.merge(cand_model)

    AuditService.record_event(
        db=db,
        actor_id=actor_id,
        action="REPLACE_CANDIDATES",
        result="SUCCESS",
        details={"election_id": id, "count": len(candidates)}
    )

    db.commit()
    return {"status": "candidates_replaced", "count": len(candidates)}


@router.post("/{id}/roster", status_code=202)
def submit_roster(
    id: str,
    req: RosterSubmitRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Submits roster snapshot for approval."""
    try:
        res = RosterService.submit_roster(
            db=db,
            election_id=id,
            actor_id=actor_id,
            roster_version=req.roster_version,
            records=req.records
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="SUBMIT_ROSTER",
            result="SUCCESS",
            details={"election_id": id, "roster_version": req.roster_version}
        )
        return res
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.post("/{id}/roster/approve", status_code=200)
def approve_roster(
    id: str,
    req: RosterApproveRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Independent Roster Approver signs the roster."""
    try:
        res = RosterService.approve_roster(
            db=db,
            election_id=id,
            actor_id=actor_id,
            approval_request=req
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="APPROVE_ROSTER",
            result="SUCCESS",
            details={"election_id": id, "roster_version": req.roster_version}
        )
        return res
    except StateMachineError as e:
        if e.error_code == "ROSTER_APPROVER_NOT_INDEPENDENT":
            raise HTTPException(status_code=403, detail=e.message)
        raise HTTPException(status_code=409, detail=e.message)


@router.post("/{id}/freeze", status_code=200)
def freeze_election(
    id: str,
    freeze_params: FreezeElectionRequest = FreezeElectionRequest(),
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Freezes manifest deterministically and enforces immutability."""
    try:
        res = ManifestService.freeze_election(
            db=db,
            election_id=id,
            actor_id=actor_id,
            freeze_params=freeze_params
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="FREEZE_MANIFEST",
            result="SUCCESS",
            details={"election_id": id, "manifest_digest": res["manifest_digest"]}
        )
        return res
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.post("/{id}/open", status_code=200)
def open_election(
    id: str,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Opens election for casting after issuance cutoff."""
    state_record = (
        db.query(ElectionStateModel)
        .filter(ElectionStateModel.election_id == id)
        .first()
    )
    if not state_record:
        raise HTTPException(status_code=404, detail="Election not found")

    try:
        if state_record.state == "FROZEN":
            ElectionLifecycleManager.transition(db, id, "SCHEDULED", actor_id)
        if state_record.state == "SCHEDULED":
            ElectionLifecycleManager.transition(db, id, "ISSUING", actor_id)
        if state_record.state == "ISSUING":
            ElectionLifecycleManager.transition(db, id, "ISSUANCE_CLOSED", actor_id)
        
        ElectionLifecycleManager.transition(db, id, "OPEN", actor_id)
        
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="OPEN_ELECTION",
            result="SUCCESS",
            details={"election_id": id}
        )
        return {"status": "opened", "election_id": id, "state": "OPEN"}
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.post("/{id}/close", status_code=200)
def close_election(
    id: str,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Closes election and locks final tree size."""
    try:
        state_record = ElectionLifecycleManager.transition(
            db=db,
            election_id=id,
            target_state="CLOSING",
            actor_id=actor_id
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="CLOSE_ELECTION",
            result="SUCCESS",
            details={"election_id": id, "final_tree_size": state_record.final_tree_size}
        )
        return {
            "status": "closed",
            "election_id": id,
            "state": "CLOSING",
            "final_tree_size": state_record.final_tree_size
        }
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.post("/{id}/publication-request", status_code=202)
def publication_request(
    id: str,
    req: PublicationRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Auditor signature verification gate for publication."""
    try:
        res = PublicationService.process_publication_request(
            db=db,
            election_id=id,
            actor_id=actor_id,
            req=req
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="PUBLISH_ELECTION",
            result="SUCCESS",
            details={"election_id": id, "manifest_digest": res["manifest_digest"]}
        )
        return res
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.get("/{id}/results", response_model=PublishedResults)
def get_results(
    id: str,
    db: Session = Depends(get_db)
):
    """Retrieves published results (only accessible once PUBLISHED)."""
    state_record = (
        db.query(ElectionStateModel)
        .filter(ElectionStateModel.election_id == id)
        .first()
    )
    if not state_record:
        raise HTTPException(status_code=404, detail="Election not found")

    if state_record.state != "PUBLISHED":
        raise HTTPException(
            status_code=404,
            detail=f"Results are not available. Election is in state {state_record.state}"
        )

    published = (
        db.query(PublishedResultModel)
        .filter(PublishedResultModel.election_id == id)
        .first()
    )
    if not published:
        raise HTTPException(status_code=404, detail="Published results record not found")

    import json
    tally = json.loads(published.tally_json)

    return PublishedResults(
        election_id=published.election_id,
        manifest_digest=published.manifest_digest,
        tally=tally,
        total_ballots=published.total_ballots,
        published_at_utc=published.published_at_utc,
        privacy_limited=published.privacy_limited
    )


@router.get("/{id}/evidence")
def get_evidence(
    id: str,
    download: Optional[bool] = Query(False),
    accept: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Returns evidence metadata or streaming ZIP archive."""
    if download or (accept and "application/zip" in accept):
        # Do not manufacture an archive from mutable or incomplete election
        # state. A downloadable package exists only after publication has
        # created the signed evidence metadata record.
        EvidenceService.get_evidence_metadata(db, id)
        zip_bytes = EvidenceService.generate_evidence_zip_bytes(db, id)
        return StreamingResponse(
            io.BytesIO(zip_bytes),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=evidence_{id}.zip"}
        )

    metadata = EvidenceService.get_evidence_metadata(db, id)
    return metadata


@router.post("/{id}/cancel", status_code=200)
def cancel_election(
    id: str,
    req: CancelElectionRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Cancels an election with signed reason while keeping all evidence."""
    try:
        ElectionLifecycleManager.transition(
            db=db,
            election_id=id,
            target_state="CANCELLED",
            actor_id=actor_id,
            cancellation_reason=req.reason,
            cancellation_signature=req.signature
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="CANCEL_ELECTION",
            result="SUCCESS",
            details={"election_id": id, "reason": req.reason}
        )
        return {"status": "cancelled", "election_id": id}
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.post("/{id}/pause", status_code=200)
def pause_election(
    id: str,
    req: PauseElectionRequest,
    actor_id: str = Depends(get_current_actor_id),
    db: Session = Depends(get_db)
):
    """Pauses election activity."""
    try:
        ElectionLifecycleManager.transition(
            db=db,
            election_id=id,
            target_state="PAUSED",
            actor_id=actor_id,
            details={"reason": req.reason}
        )
        AuditService.record_event(
            db=db,
            actor_id=actor_id,
            action="PAUSE_ELECTION",
            result="SUCCESS",
            details={"election_id": id, "reason": req.reason}
        )
        return {"status": "paused", "election_id": id}
    except StateMachineError as e:
        raise HTTPException(status_code=409, detail=e.message)
