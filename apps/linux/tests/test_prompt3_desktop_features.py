"""Unit and GUI tests for PROMPT3 3D interactive elements, pipeline visualizer, and results comparison (DESKTOP-05)."""

import math
import os
from pathlib import Path
import sys
import tkinter as tk
from unittest.mock import MagicMock, patch
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    BallotBox3DCanvas,
    CandidateTally,
    HimVoteLinuxApp,
    IsometricEvidencePipelineCanvas,
    ResultsComparisonModal,
    ElectionArchive,
)


def _safe_create_tk() -> tk.Tk:
    import time
    last_err = None
    for _ in range(5):
        try:
            r = tk.Tk()
            return r
        except Exception as e:
            last_err = e
            time.sleep(0.12)
    raise last_err


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_ballotbox_3d_canvas_rendering_and_reduced_motion() -> None:
    """Test 3D ballot box isometric rendering, interactive drag rotation, and reduced motion toggle."""
    root = _safe_create_tk()
    root.withdraw()

    canvas = BallotBox3DCanvas(root, width=320, height=200, reduced_motion=False)
    canvas.pack()
    root.update_idletasks()

    # Verify polygon faces and embellishments rendered
    assert len(canvas.find_withtag("box_face")) == 6
    assert len(canvas.find_withtag("slot")) >= 1
    assert len(canvas.find_withtag("ballot")) >= 1

    # Test mouse drag updates yaw and pitch
    initial_yaw = canvas.yaw
    initial_pitch = canvas.pitch

    event_down = MagicMock()
    event_down.x = 100
    event_down.y = 100
    canvas._on_mouse_down(event_down)
    assert canvas._is_dragging is True

    event_drag = MagicMock()
    event_drag.x = 120
    event_drag.y = 110
    canvas._on_mouse_drag(event_drag)
    assert canvas.yaw != initial_yaw
    assert canvas.pitch != initial_pitch

    event_up = MagicMock()
    canvas._on_mouse_up(event_up)
    assert canvas._is_dragging is False

    # Test reduced motion toggle
    assert canvas.toggle_reduced_motion() is True
    assert canvas.reduced_motion is True
    assert canvas._anim_id is None

    # Re-enable motion
    assert canvas.toggle_reduced_motion() is False
    assert canvas.reduced_motion is False

    canvas.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_isometric_evidence_pipeline_canvas() -> None:
    """Test 6-stage cryptographic evidence pipeline canvas rendering and stage selection."""
    root = _safe_create_tk()
    root.withdraw()

    selected_records = []
    def on_select(idx: int, stage_info: tuple) -> None:
        selected_records.append((idx, stage_info[0]))

    pipeline = IsometricEvidencePipelineCanvas(root, width=760, height=120, on_stage_select=on_select)
    pipeline.pack()
    root.update_idletasks()

    # Verify 6 stage boundaries
    assert len(pipeline.stage_bounds) == 6

    # Select stage 0 (Identity Roster)
    pipeline.select_stage(0)
    assert pipeline.selected_stage == 0
    assert len(selected_records) == 1
    assert selected_records[0] == (0, "Identity Roster")

    # Select stage 5 (Offline Verifier)
    pipeline.select_stage(5)
    assert pipeline.selected_stage == 5
    assert selected_records[-1] == (5, "Offline Verifier")

    # Click within stage 2 boundary
    stage_2_rect = pipeline.stage_bounds[2]
    click_x = (stage_2_rect[0] + stage_2_rect[2]) / 2.0
    click_y = (stage_2_rect[1] + stage_2_rect[3]) / 2.0
    click_event = MagicMock()
    click_event.x = click_x
    click_event.y = click_y
    pipeline._on_click(click_event)
    assert pipeline.selected_stage == 2

    pipeline.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_results_comparison_modal_exact_match() -> None:
    """Test PROMPT3 DESKTOP-05 split comparison modal with exact tally match."""
    root = _safe_create_tk()
    root.withdraw()

    announced = {"cand_01": 55, "cand_02": 45}
    recomputed = [
        CandidateTally(candidate_id="cand_01", name="Alice Chen", vote_count=55, percentage=55.0, rank=1, is_winner=True),
        CandidateTally(candidate_id="cand_02", name="Bob Smith", vote_count=45, percentage=45.0, rank=2, is_winner=False),
    ]

    modal = ResultsComparisonModal(
        root,
        election_title="Spring General Election",
        election_id="elec_spring_2026",
        manifest_digest="sha256:manifest123456",
        merkle_root="sha256:rootabcdef",
        announced_tallies=announced,
        recomputed_tallies=recomputed,
    )
    root.update_idletasks()

    assert modal.all_match is True
    assert len(modal.discrepancies) == 2
    assert modal.discrepancies[0]["diff"] == 0
    assert modal.discrepancies[0]["is_match"] is True

    md = modal.generate_report_markdown()
    assert "EXACT_MATCH" in md
    assert "Alice Chen" in md
    assert "Bob Smith" in md

    modal.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_results_comparison_modal_discrepancy_detection(tmp_path: Path) -> None:
    """Test PROMPT3 DESKTOP-05 split comparison modal detects discrepancies and exports report."""
    root = _safe_create_tk()
    root.withdraw()

    announced = {"cand_01": 60, "cand_02": 40}  # Announced has 60 vs 40
    recomputed = [
        CandidateTally(candidate_id="cand_01", name="Alice Chen", vote_count=52, percentage=52.0, rank=1, is_winner=True),  # Recomputed has 52 (-8)
        CandidateTally(candidate_id="cand_02", name="Bob Smith", vote_count=48, percentage=48.0, rank=2, is_winner=False),  # Recomputed has 48 (+8)
    ]

    modal = ResultsComparisonModal(
        root,
        election_title="Audit Discrepancy Test",
        election_id="elec_audit_diff",
        manifest_digest="sha256:manifest_hash",
        merkle_root="sha256:root_hash",
        announced_tallies=announced,
        recomputed_tallies=recomputed,
    )
    root.update_idletasks()

    assert modal.all_match is False
    assert modal.discrepancies[0]["diff"] == -8
    assert modal.discrepancies[0]["is_match"] is False
    assert modal.discrepancies[1]["diff"] == 8
    assert modal.discrepancies[1]["is_match"] is False

    # Test report export
    export_path = str(tmp_path / "discrepancies.md")
    with patch("tkinter.filedialog.asksaveasfilename", return_value=export_path):
        modal.export_report()
        assert "Exported to" in modal.status_label.cget("text")
        saved_text = Path(export_path).read_text(encoding="utf-8")
        assert "DISCREPANCY_DETECTED" in saved_text
        assert "-8" in saved_text
        assert "+8" in saved_text

    modal.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_desktop_audit_action_methods() -> None:
    """Test DESKTOP-01 through DESKTOP-06 action methods in HimVoteLinuxApp."""
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()
    app._show_audit()
    app.update_idletasks()

    # Load demo archive
    app._load_demo_archive()
    app.update_idletasks()
    assert app.current_archive is not None
    assert app.current_inspection is not None

    # Test DESKTOP-06 Copy CLI reproduction command
    app._copy_cli_reproduction()
    assert "CLI command copied to clipboard" in app.archive_path_label.cget("text")

    # Test DESKTOP-05 Open Results Comparison
    app._open_results_comparison()
    app.update_idletasks()

    # Test DESKTOP-02 Discard Archive
    app._discard_archive()
    assert app.current_archive is None
    assert app.current_inspection is None
    assert "No archive loaded" in app.archive_path_label.cget("text")

    app.destroy()
