"""Security and persistence tests for authenticated self-service profiles."""

import hashlib
import importlib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from services.identity_issuer.database import Base, get_db
from services.identity_issuer.main import app
from services.identity_issuer.models import AdminAuditEvent, Session as UserSession, User


def _account(db_session, *, email: str, external_id: str, token: str) -> User:
    user = User(
        email=email,
        external_id=external_id,
        password_hash="test-hash-not-used-for-session-auth",
        password_params={},
        status="ACTIVE",
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(
        UserSession(
            user_id=user.id,
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            is_mfa_authenticated=False,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    )
    db_session.commit()
    return user


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_profile_get_and_update_only_allowlisted_fields(client, db_session):
    user = _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")

    response = client.patch(
        "/v1/profile/me",
        headers=_auth("token-a"),
        json={"display_name": "  Ada   Student ", "phone_number": "+14155552671"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user.id
    assert body["display_name"] == "Ada Student"
    assert body["phone_number"] == "+14155552671"
    assert body["updated_at"]
    assert "email" not in body and "external_id" not in body
    audit = db_session.query(AdminAuditEvent).filter_by(action="profile.self_update").one()
    assert audit.actor_id == user.id
    assert audit.details == {"fields": ["display_name", "phone_number"]}

    loaded = client.get("/v1/profile/me", headers=_auth("token-a"))
    assert loaded.status_code == 200
    assert loaded.json()["display_name"] == "Ada Student"


def test_profile_update_requires_authentication(client, db_session):
    _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    response = client.patch("/v1/profile/me", json={"display_name": "Ada"})
    assert response.status_code == 401


def test_supplied_user_id_cannot_redirect_profile_update(client, db_session):
    first = _account(db_session, email="first@example.edu", external_id="S-100", token="token-a")
    second = _account(db_session, email="second@example.edu", external_id="S-200", token="token-b")

    response = client.patch(
        "/v1/profile/me",
        headers=_auth("token-a"),
        json={"id": second.id, "display_name": "Changed"},
    )

    assert response.status_code == 422
    db_session.refresh(first)
    db_session.refresh(second)
    assert first.display_name is None
    assert second.display_name is None


def test_protected_fields_are_rejected(client, db_session):
    user = _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    for field, value in (
        ("email", "attacker@example.edu"),
        ("external_id", "S-999"),
        ("role", "super_admin"),
        ("status", "ACTIVE"),
        ("department", "Computer Science"),
        ("eligible", True),
    ):
        response = client.patch(
            "/v1/profile/me", headers=_auth("token-a"), json={field: value}
        )
        assert response.status_code == 422, field

    db_session.refresh(user)
    assert user.email == "student@example.edu"
    assert user.external_id == "S-100"


def test_invalid_phone_number_is_rejected(client, db_session):
    _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    for phone in ("4155552671", "+01234567890", "+123", "+1 415 555 2671"):
        response = client.patch(
            "/v1/profile/me", headers=_auth("token-a"), json={"phone_number": phone}
        )
        assert response.status_code == 422


def test_invalid_display_name_is_rejected(client, db_session):
    _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    for name in ("", "   ", "x" * 81):
        response = client.patch(
            "/v1/profile/me", headers=_auth("token-a"), json={"display_name": name}
        )
        assert response.status_code == 422


def test_empty_request_is_rejected_and_null_clears_fields(client, db_session):
    user = _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    assert client.patch("/v1/profile/me", headers=_auth("token-a"), json={}).status_code == 422
    assert client.patch(
        "/v1/profile/me", headers=_auth("token-a"),
        json={"display_name": "Ada", "phone_number": "+14155552671"},
    ).status_code == 200
    cleared = client.patch(
        "/v1/profile/me", headers=_auth("token-a"),
        json={"display_name": None, "phone_number": ""},
    )
    assert cleared.status_code == 200
    assert cleared.json()["display_name"] is None
    assert cleared.json()["phone_number"] is None
    db_session.refresh(user)
    assert user.display_name is None and user.phone_number is None


def test_unexpected_fields_are_rejected(client, db_session):
    _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    response = client.patch(
        "/v1/profile/me", headers=_auth("token-a"),
        json={"display_name": "Ada", "is_admin": True},
    )
    assert response.status_code == 422


def test_database_failure_does_not_report_profile_update_success(client, db_session, monkeypatch):
    _account(db_session, email="student@example.edu", external_id="S-100", token="token-a")
    original_commit = db_session.commit
    commits = 0

    def fail_profile_commit():
        nonlocal commits
        commits += 1
        if commits == 2:  # auth dependency commits session access first
            raise OperationalError("profile update", {}, RuntimeError("database unavailable"))
        original_commit()

    monkeypatch.setattr(db_session, "commit", fail_profile_commit)
    response = client.patch(
        "/v1/profile/me", headers=_auth("token-a"), json={"display_name": "Ada"}
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Profile update could not be saved"


def test_profile_migration_is_reversible_and_preserves_existing_users():
    migration = importlib.import_module(
        "infrastructure.migrations.identity.versions.0005_profile_attributes"
    )
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id VARCHAR PRIMARY KEY, email VARCHAR NOT NULL)"))
        connection.execute(text("INSERT INTO users (id, email) VALUES ('u-1', 'existing@example.edu')"))
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration.upgrade()
        columns = {column["name"] for column in inspect(connection).get_columns("users")}
        assert {"display_name", "phone_number"}.issubset(columns)
        assert connection.execute(text("SELECT id, email FROM users")).one() == (
            "u-1", "existing@example.edu"
        )
        with Operations.context(context):
            migration.downgrade()
        columns = {column["name"] for column in inspect(connection).get_columns("users")}
        assert "display_name" not in columns and "phone_number" not in columns
    engine.dispose()


def test_concurrent_updates_to_separate_fields_do_not_overwrite_each_other(tmp_path):
    database_path = tmp_path / "profile-concurrency.sqlite"
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False, "timeout": 15},
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    setup = session_factory()
    _account(setup, email="student@example.edu", external_id="S-100", token="token-a")
    setup.close()

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as concurrent_client:
            def update(payload):
                return concurrent_client.patch(
                    "/v1/profile/me", headers=_auth("token-a"), json=payload
                )

            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(update, [
                    {"display_name": "Ada Student"},
                    {"phone_number": "+14155552671"},
                ]))

            assert [response.status_code for response in results] == [200, 200]
            profile = concurrent_client.get("/v1/profile/me", headers=_auth("token-a"))
            assert profile.status_code == 200
            assert profile.json()["display_name"] == "Ada Student"
            assert profile.json()["phone_number"] == "+14155552671"
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
