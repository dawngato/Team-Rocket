"""Unit and GUI integration tests for Session, Settings, Admin, and Headless CLI."""

import json
import os
from pathlib import Path
import sys
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    AdminAuditEvent,
    AppSettings,
    AppSettingsStore,
    HimVoteLinuxApp,
    LinuxApiClient,
    UserSession,
    demo_admin_events,
    demo_sessions,
    main,
    parse_args,
    run_headless_audit,
)


def test_user_session_serialization() -> None:
    session = UserSession(
        user_id="STU-001",
        email="voter@uni.edu",
        full_name="Jane Voter",
        role="Student",
        bearer_token="token_xyz",
        is_authenticated=True,
        eligible_contests=["Election 2026"],
        credential_status="BLIND_TOKEN_ACTIVE",
    )
    data = session.to_dict()
    assert data["user_id"] == "STU-001"
    assert data["role"] == "Student"
    assert data["is_authenticated"] is True

    restored = UserSession.from_dict(data)
    assert restored.email == "voter@uni.edu"
    assert restored.full_name == "Jane Voter"
    assert restored.eligible_contests == ["Election 2026"]


def test_admin_audit_event_serialization() -> None:
    evt = AdminAuditEvent(
        event_id="EVT-100",
        timestamp="30 Oct 2026 12:00 UTC",
        action="MANIFEST_SEALED",
        actor_id="commission",
        election_id="elec_01",
        digest="sha256:abcd1234",
        details="Sealed manifest with 4 candidates",
    )
    d = evt.to_dict()
    assert d["event_id"] == "EVT-100"
    assert d["action"] == "MANIFEST_SEALED"

    restored = AdminAuditEvent.from_dict(d)
    assert restored.actor_id == "commission"
    assert restored.digest == "sha256:abcd1234"


def test_app_settings_persistence(tmp_path: Path) -> None:
    cfg = tmp_path / "settings.json"
    store = AppSettingsStore(cfg)

    # Defaults
    assert store.settings.identity_origin == "http://localhost:8080"
    assert store.settings.casting_origin == "http://localhost:8081"

    # Save customized settings
    custom = AppSettings(
        identity_origin="https://auth.uni.edu",
        casting_origin="https://cast.uni.edu",
        witness_origin="https://witness.uni.edu",
        high_contrast=True,
    )
    store.save(custom)

    # Re-read
    reloaded = AppSettingsStore(cfg)
    assert reloaded.settings.identity_origin == "https://auth.uni.edu"
    assert reloaded.settings.high_contrast is True


def test_demo_sessions_and_admin_events() -> None:
    sessions = demo_sessions()
    assert len(sessions) >= 3
    roles = {s.role for s in sessions}
    assert "Student" in roles
    assert "Auditor" in roles
    assert "Administrator" in roles

    events = demo_admin_events()
    assert len(events) >= 5
    actions = {e.action for e in events}
    assert "ROSTER_SNAPSHOT_FROZEN" in actions
    assert "MANIFEST_SEALED" in actions


def test_api_client_mock_login_and_origin_health() -> None:
    client = LinuxApiClient("http://127.0.0.1:9")  # Unreachable port
    session = client.login("alice.chen@university.edu", "password123")
    assert session.is_authenticated is True
    assert "Alice" in session.full_name
    assert session.role == "Student"

    # Origin health check
    ok, msg, ms = LinuxApiClient.check_origin_health("http://127.0.0.1:9", timeout=0.1)
    assert ok is False
    assert ms > 0


def test_headless_cli_audit_and_exports(tmp_path: Path) -> None:
    sim_dir = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not sim_dir.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    md_out = tmp_path / "cli_audit.md"
    json_out = tmp_path / "cli_audit.json"

    rc = run_headless_audit(
        archive_path=sim_dir,
        export_md=md_out,
        export_json=json_out,
        receipt_handle="0",
    )
    assert rc == 0
    assert md_out.exists()
    assert json_out.exists()

    with open(md_out, "r", encoding="utf-8") as f:
        md_text = f.read()
    assert "HimVote Cryptographic Election Audit Report" in md_text

    with open(json_out, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["election_id"] == "elec_hptu_sc_2026"
    assert data["verdict"] == "PASS"


def test_parse_args_options() -> None:
    args = parse_args(["--headless", "--archive", "some/path.zip", "--verify-receipt", "rcpt_42", "--view", "settings"])
    assert args.headless is True
    assert args.archive == "some/path.zip"
    assert args.verify_receipt == "rcpt_42"
    assert args.view == "settings"


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_all_eight_views_navigation_and_session_flow() -> None:
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()

    # 1. Elections
    app._show_elections()
    assert app.current_view_name == "elections"

    # 2. Receipt
    app._show_receipt()
    assert app.current_view_name == "receipt"

    # 3. Audit
    app._show_audit()
    assert app.current_view_name == "audit"

    # 4. How it works
    app._show_how_it_works()
    assert app.current_view_name == "how_it_works"

    # 5. Security limits
    app._show_security_limits()
    assert app.current_view_name == "security_limits"

    # 6. Session & Login
    app._show_login()
    assert app.current_view_name == "login"
    assert app.user_session is None

    # Apply demo session
    demo_u = demo_sessions()[0]
    app._apply_session(demo_u)
    assert app.user_session is not None
    assert app.user_session.email == demo_u.email

    # 7. Settings
    app._show_settings()
    assert app.current_view_name == "settings"
    assert hasattr(app, "_endpoint_entries")

    # 8. Admin Audit Trail
    app._show_admin()
    assert app.current_view_name == "admin"
    assert len(app.admin_events) >= 5

    app.destroy()
