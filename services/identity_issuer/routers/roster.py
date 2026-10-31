"""
Roster management, student verification, snapshotting, and approval workflow.
Enforces that a Roster Approver must be an independent person from the importer.
"""

import uuid
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..database import get_db
from ..rate_limiter import rate_limiter
from ..config import ACTIVATION_DELIVERY_MODE, ACTIVATION_EXPIRE_HOURS, APP_ENV
from ..models import (
    User,
    StudentProfile,
    StudentVerification,
    EnrollmentSource,
    ElectionRosterSnapshot,
    RosterMember,
    CredentialIssuanceRecord,
    AccountActivation,
    Department,
    RoleAssignment,
    RoleDefinition,
    RosterCorrection,
)
from ..schemas import (
    StudentRegisterRequest,
    StudentImportRequest,
    StudentVerifyRequest,
    RosterMeResponse,
    RosterElection,
    RosterSnapshotCreateRequest,
    RosterSnapshotResponse,
    RosterCorrectionRequest,
    RosterCorrectionRecord,
)
from ..crypto.hashing import hash_password
from ..notification_service import NotificationDeliveryError, notification_service
from .deps import get_current_user, get_user_roles, require_roles, record_audit_event, user_has_scope

router = APIRouter(prefix="/v1", tags=["roster"])


def _teacher_has_department_scope(user: User, db: Session, department: Department, class_id: str | None = None) -> bool:
    """Match teacher grants against authoritative department identifiers."""
    if not department:
        return False
    assignments = (
        db.query(RoleAssignment, RoleDefinition.name)
        .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
        .filter(RoleAssignment.user_id == user.id, RoleDefinition.name == "teacher")
        .all()
    )
    department_values = {department.id, department.name.strip().lower(), department.code.strip().lower()}
    for assignment, _role_name in assignments:
        if assignment.scope_type == "global" or assignment.scope_id == "*":
            return True
        if assignment.scope_type in {"department", "dept"} and assignment.scope_id.strip().lower() in department_values:
            return True
        if class_id and assignment.scope_type == "class" and assignment.scope_id == class_id:
            return True
    return False


def _correction_record(row: RosterCorrection) -> RosterCorrectionRecord:
    return RosterCorrectionRecord(
        id=row.id,
        student_id=row.student_id,
        student_name=row.student_name,
        department=row.department,
        class_id=row.class_id,
        correction_type=row.correction_type,
        reason=row.reason,
        status=row.status,
        submitted_by=row.submitted_by,
        created_at=row.created_at,
        decided_by=row.decided_by,
        decided_at=row.decided_at,
    )


@router.get("/roster/corrections", response_model=list[RosterCorrectionRecord], status_code=status.HTTP_200_OK)
def list_roster_corrections(
    current_user: User = Depends(require_roles(["teacher", "administrator", "super_admin", "roster_approver"])),
    db: Session = Depends(get_db),
):
    user_roles = get_user_roles(current_user, db)
    is_broad_role = any(r in {"administrator", "super_admin", "roster_approver"} for r in user_roles)

    query = db.query(RosterCorrection)
    if not is_broad_role:
        teacher_assignments = (
            db.query(RoleAssignment)
            .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
            .filter(RoleAssignment.user_id == current_user.id, RoleDefinition.name == "teacher")
            .all()
        )
        allowed_scopes: set[str] = set()
        for assignment in teacher_assignments:
            if assignment.scope_type in {"department", "dept"}:
                department = db.query(Department).filter(
                    (Department.id == assignment.scope_id)
                    | (func.lower(Department.name) == assignment.scope_id.strip().lower())
                    | (func.lower(Department.code) == assignment.scope_id.strip().lower())
                ).first()
                if department:
                    allowed_scopes.update({department.id.lower(), department.name.strip().lower(), department.code.strip().lower()})
                else:
                    allowed_scopes.add(assignment.scope_id.strip().lower())
            else:
                allowed_scopes.add(assignment.scope_id.strip().lower())
        if any(assignment.scope_type == "global" or assignment.scope_id == "*" for assignment in teacher_assignments):
            pass
        elif not allowed_scopes:
            return []
        else:
            query = query.filter(func.lower(RosterCorrection.department).in_(allowed_scopes))

    rows = query.order_by(RosterCorrection.created_at.desc()).limit(500).all()
    return [
        _correction_record(row)
        for row in rows
    ]


@router.post("/roster/corrections", response_model=RosterCorrectionRecord, status_code=status.HTTP_201_CREATED)
def submit_roster_correction(
    req: RosterCorrectionRequest,
    current_user: User = Depends(require_roles(["teacher", "administrator", "super_admin"])),
    db: Session = Depends(get_db),
):
    user_roles = get_user_roles(current_user, db)
    is_admin = any(r in {"administrator", "super_admin"} for r in user_roles)
    target_dept = req.department.strip()

    requested_department = db.query(Department).filter(
        (Department.id == target_dept)
        | (func.lower(Department.name) == target_dept.lower())
        | (func.lower(Department.code) == target_dept.lower())
    ).first()
    if not is_admin and (
        not requested_department
        or not _teacher_has_department_scope(current_user, db, requested_department, req.class_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher is not authorized for the assigned department or class.",
        )

    student_id_clean = req.student_id.strip()
    profile = db.query(StudentProfile).filter(StudentProfile.student_id == student_id_clean).first()
    if not profile or not profile.department:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Authoritative student enrollment is required for Student Eligibility Verification.")
    if target_dept.lower() not in {
        profile.department.id.lower(),
        profile.department.name.strip().lower(),
        profile.department.code.strip().lower(),
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Correction department does not match the authoritative enrollment record.",
        )
    if not is_admin and not _teacher_has_department_scope(current_user, db, profile.department, req.class_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher is not authorized for the assigned department or class.")

    correction = RosterCorrection(
        student_id=student_id_clean,
        student_name=req.student_name.strip(),
        department=target_dept,
        class_id=req.class_id.strip() if req.class_id else None,
        correction_type=req.correction_type.strip(),
        reason=req.reason.strip(),
        status="PENDING",
        submitted_by=current_user.id,
    )
    db.add(correction)
    record_audit_event(
        db=db,
        action="roster.correction.submitted",
        result="pending_review",
        actor_id=current_user.id,
        details={"correction_id": correction.id, "student_id": correction.student_id, "department": target_dept, "class_id": correction.class_id},
    )
    db.commit()
    db.refresh(correction)
    return _correction_record(correction)


@router.post("/students/register", status_code=status.HTTP_202_ACCEPTED)
def register_student(
    req: StudentRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Student self registration.
    Initial state is PENDING_VERIFICATION until confirmed by teacher or admin.
    """
    if APP_ENV == "production" and ACTIVATION_DELIVERY_MODE != "configured":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student activation delivery is not configured",
        )
    rate_limiter.enforce(
        rate_limiter.key("student_registration", str(req.email)),
        limit=3,
        window_seconds=3600,
        detail="Too many student registration attempts have been detected. Please try again later.",
    )
    # Check for existing profile or user
    existing_profile = db.query(StudentProfile).filter(StudentProfile.student_id == req.student_id).first()
    existing_user = db.query(User).filter(User.external_id == req.student_id).first()
    existing_email = db.query(User).filter(User.email == str(req.email).lower()).first()
    if existing_profile or existing_user or existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student registration already exists",
        )

    pwd_hash, pwd_params = hash_password(str(uuid.uuid4()))

    user = User(
        external_id=req.student_id,
        email=req.email,
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="PENDING_VERIFICATION",
    )
    db.add(user)

    profile = StudentProfile(
        student_id=req.student_id,
        email=req.email,
        full_name=req.full_name,
    )
    db.add(profile)
    db.flush()
    activation_token = secrets.token_urlsafe(32)
    activation = AccountActivation(
        user_id=user.id,
        token_hash=hashlib.sha256(activation_token.encode("utf-8")).hexdigest(),
        status="PENDING",
        delivery_status="PENDING" if ACTIVATION_DELIVERY_MODE == "configured" else "DEVELOPMENT",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=ACTIVATION_EXPIRE_HOURS),
    )
    db.add(activation)
    db.flush()
    delivery_status = activation.delivery_status
    if ACTIVATION_DELIVERY_MODE == "configured":
        try:
            notification_service.dispatch(
                recipient=str(req.email).lower(),
                subject="HimVote student account activation",
                body=f"Your student account is pending institutional verification. The activation link expires in {ACTIVATION_EXPIRE_HOURS} hour(s).",
                category="activation",
                token=activation_token,
                metadata={"activation_id": activation.id},
            )
            activation.delivery_status = "DELIVERED"
            delivery_status = activation.delivery_status
        except NotificationDeliveryError as exc:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Student activation notification could not be delivered") from exc

    record_audit_event(
        db=db,
        action="roster.student.registration_submitted",
        result="pending_verification",
        actor_id=user.id,
        details={"student_id": req.student_id, "delivery": delivery_status},
    )
    db.commit()

    response = {
        "status": "registration_pending_verification",
        "student_id": req.student_id,
        "activation_delivery": "configured" if delivery_status == "DELIVERED" else "pending",
    }
    if APP_ENV != "production" and ACTIVATION_DELIVERY_MODE == "development":
        response["activation_delivery"] = "development"
        response["development_activation_token"] = activation_token
    return response


@router.post("/students/import", status_code=status.HTTP_202_ACCEPTED)
def import_students(
    req: StudentImportRequest,
    current_user: User = Depends(require_roles(["administrator", "super_admin", "teacher"])),
    db: Session = Depends(get_db),
):
    """
    Batch import student records from Student Information System (SIS) or CSV.
    Records enrollment source metadata and sets imported accounts to PENDING_VERIFICATION.
    """
    normalized_ids = [item.student_id.strip() for item in req.records]
    normalized_emails = [str(item.email).lower() for item in req.records]
    if len(set(normalized_ids)) != len(normalized_ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Duplicate student identifiers detected in the import roster.")
    if len(set(normalized_emails)) != len(normalized_emails):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Duplicate email addresses detected in the import roster.")
    existing_ids = {
        row[0]
        for row in db.query(StudentProfile.student_id).filter(StudentProfile.student_id.in_(normalized_ids)).all()
    }
    existing_emails = {
        row[0]
        for row in db.query(User.email).filter(User.email.in_(normalized_emails)).all()
    }
    if existing_ids or existing_emails:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Import contains an existing student ID or email address.")

    source = EnrollmentSource(
        name=f"import_{req.source}_{datetime.now(timezone.utc).isoformat()}",
        type=req.source,
        config={"importer_id": current_user.id, "count": len(req.records)},
        last_sync_at=datetime.now(timezone.utc),
    )
    db.add(source)

    imported_count = 0
    current_roles = get_user_roles(current_user, db)
    for item in req.records:
        if (
            "super_admin" not in current_roles
            and not any(role in current_roles for role in {"administrator"})
            and not user_has_scope(current_user, db, ["teacher"], item.department)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher scope does not include one or more imported departments",
            )
        pwd_hash, pwd_params = hash_password(str(uuid.uuid4()))
        user = User(
            external_id=item.student_id,
            email=str(item.email).lower(),
            password_hash=pwd_hash,
            password_algorithm=pwd_params["algorithm"],
            password_params=pwd_params,
            status="PENDING_VERIFICATION",
        )
        db.add(user)

        profile = StudentProfile(
            student_id=item.student_id,
            email=str(item.email).lower(),
            full_name=item.full_name,
        )
        db.add(profile)
        imported_count += 1

    record_audit_event(
        db=db,
        action="roster.students.imported",
        result="success",
        actor_id=current_user.id,
        details={"source": req.source, "count": imported_count},
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Import conflicts with an existing identity record")

    return {"status": "import_accepted", "imported_count": imported_count}


@router.get("/students", status_code=status.HTTP_200_OK)
def list_students(
    current_user: User = Depends(require_roles(["teacher", "administrator", "super_admin"])),
    db: Session = Depends(get_db),
):
    """Return the scoped student verification queue without credential data."""
    roles = get_user_roles(current_user, db)
    query = db.query(StudentProfile)
    if "teacher" in roles and not ({"administrator", "super_admin"} & set(roles)):
        department_scopes = [
            assignment.scope_id
            for assignment, role_name in db.query(RoleAssignment, RoleDefinition.name)
            .join(RoleDefinition, RoleAssignment.role_id == RoleDefinition.id)
            .filter(RoleAssignment.user_id == current_user.id, RoleDefinition.name == "teacher")
            .all()
            if assignment.scope_id != "*" and assignment.scope_type != "global"
        ]
        if department_scopes:
            query = query.filter(StudentProfile.department_id.in_(department_scopes))
        else:
            query = query.filter(StudentProfile.id == "__no_teacher_scope__")
    rows = query.order_by(StudentProfile.created_at.asc()).all()
    verified_ids = {
        row.student_id
        for row in db.query(StudentVerification.student_id).all()
    }
    return [
        {
            "id": profile.id,
            "student_id": profile.student_id,
            "full_name": profile.full_name,
            "email": profile.email,
            "department": profile.department.name if profile.department else "",
            "verified": profile.id in verified_ids,
            "status": "VERIFIED" if profile.id in verified_ids else "PENDING_VERIFICATION",
            "created_at_utc": profile.created_at.isoformat() if profile.created_at else "",
        }
        for profile in rows
    ]


@router.post("/students/{student_id}/verify", status_code=status.HTTP_200_OK)
def verify_student(
    student_id: str,
    req: StudentVerifyRequest,
    current_user: User = Depends(require_roles(["teacher", "administrator", "super_admin"])),
    db: Session = Depends(get_db),
):
    """
    Verify student identity against approved enrollment sources.
    Requires Teacher or Administrator role.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )

    user = db.query(User).filter(User.external_id == student_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student user account not found",
        )

    current_roles = get_user_roles(current_user, db)
    authoritative_department = profile.department
    if not authoritative_department:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Authoritative enrollment department is missing.",
        )
    if req.department.strip().lower() not in {
        authoritative_department.id.lower(),
        authoritative_department.name.strip().lower(),
        authoritative_department.code.strip().lower(),
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Submitted department does not match authoritative enrollment.")
    if "teacher" in current_roles and not ({"super_admin", "administrator"} & set(current_roles)):
        if not _teacher_has_department_scope(current_user, db, authoritative_department):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher scope does not include the student's authoritative department.")

    verified_by = req.verified_by or current_user.id
    if verified_by not in {current_user.id, current_user.email}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="verified_by must identify the authenticated verifier.",
        )

    if db.query(StudentVerification).filter(StudentVerification.student_id == profile.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student Eligibility Verification has already been completed for this student.")

    verification = StudentVerification(
        student_id=profile.id,
        verified_by=current_user.id,
        department_id=authoritative_department.id,
        verification_method="institutional_registry_match",
    )
    db.add(verification)

    # Activate student account
    user.status = "ACTIVE"

    record_audit_event(
        db=db,
        action="roster.student.verified",
        result="success",
        actor_id=current_user.id,
        details={"student_id": student_id, "verified_by": verified_by, "department_id": authoritative_department.id},
    )
    db.commit()

    return {"status": "student_verified", "student_id": student_id}


@router.post("/roster/snapshots", response_model=RosterSnapshotResponse, status_code=status.HTTP_201_CREATED)
def create_roster_snapshot(
    req: RosterSnapshotCreateRequest,
    current_user: User = Depends(require_roles(["administrator", "super_admin", "election_officer"])),
    db: Session = Depends(get_db),
):
    """
    Generate an immutable election roster snapshot from verified student records.
    Calculates deterministic roster digest over sorted member records.
    """
    # Determine next roster version for this election
    latest = (
        db.query(ElectionRosterSnapshot)
        .filter(ElectionRosterSnapshot.election_id == req.election_id)
        .order_by(ElectionRosterSnapshot.roster_version.desc())
        .first()
    )
    if latest and latest.status in {"APPROVED", "FROZEN"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A roster snapshot is already approved or frozen for this election",
        )
    next_version = (latest.roster_version + 1) if latest else 1

    # Fetch verified student profiles
    verified_students = (
        db.query(StudentProfile)
        .join(StudentVerification, StudentVerification.student_id == StudentProfile.id)
        .join(User, User.external_id == StudentProfile.student_id)
        .filter(User.status == "ACTIVE")
        .distinct()
        .all()
    )

    member_ids = sorted({s.student_id for s in verified_students})
    # Deterministic SHA256 digest of sorted roster
    digest = hashlib.sha256(json.dumps(member_ids).encode("utf-8")).hexdigest()

    snapshot = ElectionRosterSnapshot(
        election_id=req.election_id,
        roster_version=next_version,
        digest=digest,
        eligible_count=len(member_ids),
        created_by=current_user.id,
        status="DRAFT",
        issuance_start_utc=req.issuance_start_utc,
        issuance_cutoff_utc=req.issuance_cutoff_utc,
    )
    db.add(snapshot)

    for student_id in member_ids:
        member = RosterMember(
            election_id=req.election_id,
            roster_version=next_version,
            student_id=student_id,
            department="institutional",
            verified=True,
        )
        db.add(member)

    record_audit_event(
        db=db,
        action="roster.snapshot.created",
        result="success",
        actor_id=current_user.id,
        details={
            "election_id": req.election_id,
            "roster_version": next_version,
            "eligible_count": len(member_ids),
        },
    )
    db.commit()

    return RosterSnapshotResponse(
        id=snapshot.id,
        election_id=snapshot.election_id,
        roster_version=snapshot.roster_version,
        digest=snapshot.digest,
        eligible_count=snapshot.eligible_count,
        status=snapshot.status,
        signed_by=snapshot.signed_by,
        signed_at=snapshot.signed_at,
    )


@router.post("/roster/snapshots/{snapshot_id}/approve", status_code=status.HTTP_200_OK)
def approve_roster_snapshot(
    snapshot_id: str,
    current_user: User = Depends(require_roles(["administrator", "roster_approver"])),
    db: Session = Depends(get_db),
):
    """
    Roster Approver signs and approves the roster snapshot.
    Strict enforcement: The approver MUST be an independent person from the importer.
    """
    snapshot = db.query(ElectionRosterSnapshot).filter(ElectionRosterSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roster snapshot not found",
        )

    # Separation of duties: Roster Approver must be different from importer/creator
    if snapshot.created_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Roster approver must be an independent person from the importer",
        )

    now = datetime.now(timezone.utc)
    snapshot.signed_by = current_user.id
    snapshot.signed_at = now
    snapshot.status = "APPROVED"

    record_audit_event(
        db=db,
        action="roster.snapshot.approved",
        result="success",
        actor_id=current_user.id,
        details={"snapshot_id": snapshot_id, "digest": snapshot.digest},
    )
    db.commit()

    return {"status": "roster_approved", "snapshot_id": snapshot_id}


@router.post("/roster/snapshots/{snapshot_id}/freeze", status_code=status.HTTP_200_OK)
def freeze_roster_snapshot(
    snapshot_id: str,
    current_user: User = Depends(require_roles(["administrator", "super_admin", "election_officer"])),
    db: Session = Depends(get_db),
):
    """
    Freeze an approved roster snapshot.
    Once frozen, roster membership is permanently immutable.
    """
    snapshot = db.query(ElectionRosterSnapshot).filter(ElectionRosterSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roster snapshot not found",
        )

    if snapshot.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snapshot must be approved before freezing",
        )

    snapshot.status = "FROZEN"

    record_audit_event(
        db=db,
        action="roster.snapshot.frozen",
        result="success",
        actor_id=current_user.id,
        details={"snapshot_id": snapshot_id, "election_id": snapshot.election_id},
    )
    db.commit()

    return {"status": "roster_frozen", "snapshot_id": snapshot_id}


@router.get("/roster/me", response_model=RosterMeResponse, status_code=status.HTTP_200_OK)
def get_my_roster(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve current student eligibility and frozen election participation status.
    Only exposes own eligibility without leaking roster secrets.
    """
    snapshots = db.query(ElectionRosterSnapshot).filter(ElectionRosterSnapshot.status == "FROZEN").all()
    elections = []

    for snap in snapshots:
        member = (
            db.query(RosterMember)
            .filter(
                RosterMember.election_id == snap.election_id,
                RosterMember.roster_version == snap.roster_version,
                RosterMember.student_id == current_user.external_id,
            )
            .first()
        )

        issuance_rec = (
            db.query(CredentialIssuanceRecord)
            .filter(
                CredentialIssuanceRecord.election_id == snap.election_id,
                CredentialIssuanceRecord.student_id == current_user.external_id,
            )
            .first()
        )
        cred_status = issuance_rec.status if issuance_rec else "none"

        is_eligible = bool(member and member.verified)
        elections.append(
            RosterElection(
                election_id=snap.election_id,
                state=snap.status,
                eligible=is_eligible,
                credential_status=cred_status,
            )
        )

    total_eligible = any(e.eligible for e in elections)
    return RosterMeResponse(eligible=total_eligible, elections=elections)
