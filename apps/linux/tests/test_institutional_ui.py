"""Unit and GUI tests for HimVote Linux institutional UI enhancements, modals, and report generator."""

import json
import os
from pathlib import Path
import sys
from unittest.mock import MagicMock, patch
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    ArchiveInspectionResult,
    AuditReportExportModal,
    Candidate,
    CandidateDetailModal,
    CandidateTally,
    Election,
    HimVoteLinuxApp,
    VerificationReport,
    demo_elections,
    demo_receipts,
)


@pytest.fixture
def mock_inspection_result() -> ArchiveInspectionResult:
    tallies = [
        CandidateTally("cand_1", "Sarah Jenkins", 65, 65.0, 1, True),
        CandidateTally("cand_2", "Marcus Rodriguez", 35, 35.0, 2, False),
    ]
    return ArchiveInspectionResult(
        archive_path="/tmp/mock_archive",
        election_id="elec_union_2026",
        title="Student Union Council 2026",
        protocol_version="himvote 2.0.0",
        voting_engine="electionguard 1.0.0",
        eligible_count=1200,
        total_leaves=100,
        candidate_count=2,
        manifest_digest="sha256:abc123manifest",
        manifest_digest_valid=True,
        leaf_sequence_valid=True,
        nullifiers_unique=True,
        merkle_root_hex="sha256:root999",
        witness_root_hex="sha256:root999",
        merkle_root_matches_witness=True,
        last_leaf_digest="sha256:leaf99",
        last_leaf_matches_witness=True,
        tally_recomputed_matches_announced=True,
        candidate_tallies=tallies,
        recomputed_tallies={"cand_1": 65, "cand_2": 35},
        announced_tallies={"cand_1": 65, "cand_2": 35},
        warnings=[],
        errors=[],
    )


@pytest.fixture(scope="module")
def shared_app():
    if not os.environ.get("DISPLAY"):
        pytest.skip("A display server is required for Tk window testing")
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()
    yield app
    try:
        app.destroy()
    except Exception:
        pass


def test_candidate_and_election_rich_models() -> None:
    cand = Candidate(
        candidate_id="c1",
        name="Elena Rostova",
        slate="Fiscal Integrity",
        statement="Ensuring transparency.",
        department="Economics",
    )
    assert cand.slate == "Fiscal Integrity"
    assert cand.department == "Economics"

    elec = Election(
        election_id="e1",
        title="Faculty Board",
        state="OPEN",
        closes_at="15 Nov 2026",
        candidate_count=1,
        description="Board elections.",
        candidates=[cand],
        eligibility="Faculty students",
        started_at="01 Nov 2026",
    )
    assert elec.description == "Board elections."
    assert len(elec.candidates) == 1
    assert elec.candidates[0].name == "Elena Rostova"


def test_verification_report_markdown_and_json(mock_inspection_result: ArchiveInspectionResult) -> None:
    md = VerificationReport.generate_markdown(mock_inspection_result)
    assert "# HimVote Cryptographic Election Audit Report" in md
    assert "Student Union Council 2026" in md
    assert "PASS (ALL CHECKS VERIFIED)" in md
    assert "Sarah Jenkins" in md
    assert "sha256:root999" in md

    raw_json = VerificationReport.generate_json(mock_inspection_result)
    data = json.loads(raw_json)
    assert data["report_type"] == "himvote_cryptographic_audit"
    assert data["verdict"] == "PASS"
    assert data["summary"]["total_leaves"] == 100
    assert len(data["tallies"]["candidates"]) == 2
    assert data["cryptographic_checks"]["merkle_root_matches_witness"] is True


def test_candidate_detail_modal_dialog(shared_app: HimVoteLinuxApp) -> None:
    elections = demo_elections()
    cand = elections[0].candidates[0]

    modal = CandidateDetailModal(shared_app, cand, elections[0].title)
    modal.update_idletasks()
    assert cand.name in modal.title()
    modal.destroy()


def test_audit_report_export_modal_dialog(shared_app: HimVoteLinuxApp, mock_inspection_result: ArchiveInspectionResult) -> None:
    modal = AuditReportExportModal(shared_app, mock_inspection_result)
    modal.update_idletasks()
    assert "Export Cryptographic Audit Report" in modal.title()

    with patch("tkinter.messagebox.showinfo") as mock_info:
        modal._copy_clipboard()
        assert mock_info.called is True

    modal.destroy()


def test_all_five_navigation_views_switch(shared_app: HimVoteLinuxApp) -> None:
    # 1. Elections view
    shared_app._show_elections()
    shared_app.update_idletasks()
    assert shared_app.current_view_name == "elections"

    # 2. Receipt status view
    shared_app._show_receipt()
    shared_app.update_idletasks()
    assert shared_app.current_view_name == "receipt"

    # 3. Offline audit view
    shared_app._show_audit()
    shared_app.update_idletasks()
    assert shared_app.current_view_name == "audit"

    # 4. How verification works view
    shared_app._show_how_it_works()
    shared_app.update_idletasks()
    assert shared_app.current_view_name == "how_it_works"

    # 5. Security limits view
    shared_app._show_security_limits()
    shared_app.update_idletasks()
    assert shared_app.current_view_name == "security_limits"

    # Refresh current view
    shared_app._refresh_current_view()
    shared_app.update_idletasks()
    assert shared_app.current_view_name == "security_limits"


def test_election_search_and_filter(shared_app: HimVoteLinuxApp) -> None:
    shared_app._show_elections()
    shared_app.update_idletasks()

    # Filter by Upcoming
    shared_app.election_filter = "UPCOMING"
    shared_app._render_filtered_elections()
    shared_app.update_idletasks()
    cards = [c for c in shared_app.election_list.winfo_children()]
    assert len(cards) >= 1

    # Search filter
    shared_app.election_filter = "ALL"
    shared_app.election_search_query = "design"
    shared_app._render_filtered_elections()
    shared_app.update_idletasks()

    # Reset search
    shared_app.election_search_query = "nonexistent_query_xyz"
    shared_app._render_filtered_elections()
    shared_app.update_idletasks()
