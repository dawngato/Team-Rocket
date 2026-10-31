"""
Unit tests for notification delivery integration and flow verification.
"""

from fastapi.testclient import TestClient
from ..main import app
from ..database import get_db, Base
from ..models import User, Department, Campus, Tenant, RoleDefinition, RoleAssignment
from .. import notification_service as notification_module
from ..crypto.hashing import hash_password
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest

client = TestClient(app)

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_test_db(monkeypatch):
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Seed initial tenant, campus, dept, superadmin
    tenant = Tenant(id="tenant_test", name="HPTU", domain="hptu.ac.in")
    db.add(tenant)
    campus = Campus(id="campus_test", tenant_id="tenant_test", name="Main Campus")
    db.add(campus)
    dept = Department(id="dept_cs", campus_id="campus_test", name="Computer Science", code="CSE")
    db.add(dept)

    pwd_hash, pwd_params = hash_password("SuperSecretPassword123!")
    superadmin = User(
        id="user_superadmin",
        external_id="ADMIN_BOOTSTRAP_01",
        email="superadmin@hptu.ac.in",
        password_hash=pwd_hash,
        password_algorithm=pwd_params["algorithm"],
        password_params=pwd_params,
        status="ACTIVE",
        mfa_enrolled=True,
    )
    db.add(superadmin)

    role_super = RoleDefinition(id="role_super", name="super_admin", description="Super Admin")
    db.add(role_super)
    db.flush()

    assign = RoleAssignment(
        user_id="user_superadmin",
        role_id="role_super",
        scope_type="global",
        scope_id="*",
    )
    db.add(assign)
    db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


class _AcceptedResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


def _configure_webhook(monkeypatch):
    monkeypatch.setattr(notification_module, "NOTIFICATION_PROVIDER", "webhook")
    monkeypatch.setattr(notification_module, "NOTIFICATION_FROM_EMAIL", "notifications@hptu.ac.in")
    monkeypatch.setattr(notification_module, "NOTIFICATION_PUBLIC_URL", "https://vote.hptu.ac.in")
    monkeypatch.setattr(notification_module, "NOTIFICATION_WEBHOOK_URL", "https://mailer.hptu.ac.in/messages")
    monkeypatch.setattr(notification_module.urllib.request, "urlopen", lambda *_args, **_kwargs: _AcceptedResponse())


def test_notification_delivery_service_requires_real_transport(monkeypatch):
    monkeypatch.setattr(notification_module, "NOTIFICATION_PROVIDER", "none")
    with pytest.raises(notification_module.NotificationDeliveryError):
        notification_module.notification_service.dispatch(
            recipient="test@hptu.ac.in",
            subject="Test Notice",
            body="Secret token is not logged",
            category="recovery",
            token="one-time-token",
        )


def test_notification_delivery_service_dispatch(monkeypatch):
    _configure_webhook(monkeypatch)
    receipt = notification_module.notification_service.dispatch(
        recipient="test@hptu.ac.in",
        subject="Test Notice",
        body="Secret token 12345",
        category="recovery",
        token="one-time-token",
    )
    assert receipt["status"] == "delivered"


def test_recovery_flow_with_configured_delivery(monkeypatch):
    _configure_webhook(monkeypatch)
    monkeypatch.setattr("services.identity_issuer.routers.auth.APP_ENV", "production")
    monkeypatch.setattr("services.identity_issuer.routers.auth.RECOVERY_DELIVERY_MODE", "configured")

    resp = client.post("/v1/auth/recover", json={"email": "superadmin@hptu.ac.in"})
    assert resp.status_code == 202
    assert resp.json()["status"] == "recovery_initiated"
    # Never leak development token in production
    assert "development_token" not in resp.json()

