"""Unit and GUI tests for HimVote Linux GUI visualizers and accessibility features."""

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
    CHIP_DANGER_BG,
    CHIP_DANGER_FG,
    CHIP_INFO_BG,
    CHIP_INFO_FG,
    CHIP_NEUTRAL_BG,
    CHIP_NEUTRAL_FG,
    CHIP_SUCCESS_BG,
    CHIP_SUCCESS_FG,
    CHIP_WARNING_BG,
    CHIP_WARNING_FG,
    HC_ACCENT,
    HC_BG,
    HC_TEXT,
    MUTED,
    NAVY,
    SURFACE,
    TEXT,
    WHITE,
    HimVoteLinuxApp,
    KeyboardShortcutsModal,
    MerkleProofResult,
    MerkleTreeVisualizer,
    Receipt,
    ReceiptInspectionModal,
    StatusChip,
    calculate_contrast_ratio,
    chip_variant_from_state,
    demo_receipts,
    is_wcag_aa_compliant,
    is_wcag_aaa_compliant,
    relative_luminance,
)


def test_relative_luminance_and_contrast_compliance() -> None:
    """Test WCAG relative luminance and contrast ratio calculations."""
    lum_black = relative_luminance("#000000")
    lum_white = relative_luminance("#FFFFFF")
    assert lum_black == pytest.approx(0.0, abs=0.0001)
    assert lum_white == pytest.approx(1.0, abs=0.0001)

    contrast_bw = calculate_contrast_ratio("#000000", "#FFFFFF")
    assert contrast_bw == pytest.approx(21.0, abs=0.1)
    assert is_wcag_aa_compliant("#000000", "#FFFFFF") is True
    assert is_wcag_aaa_compliant("#000000", "#FFFFFF") is True

    # Test that core palette text colors achieve high contrast compliance on white
    assert is_wcag_aa_compliant(NAVY, WHITE) is True
    assert is_wcag_aa_compliant(TEXT, WHITE) is True
    assert is_wcag_aa_compliant(MUTED, WHITE) is True
    assert is_wcag_aa_compliant(NAVY, SURFACE) is True
    assert is_wcag_aa_compliant(TEXT, SURFACE) is True

    # Test status chip color pairs guarantee WCAG AAA contrast ratio >= 7.0 to 1
    assert calculate_contrast_ratio(CHIP_SUCCESS_FG, CHIP_SUCCESS_BG) >= 7.0
    assert calculate_contrast_ratio(CHIP_WARNING_FG, CHIP_WARNING_BG) >= 7.0
    assert calculate_contrast_ratio(CHIP_DANGER_FG, CHIP_DANGER_BG) >= 7.0
    assert calculate_contrast_ratio(CHIP_INFO_FG, CHIP_INFO_BG) >= 7.0
    assert calculate_contrast_ratio(CHIP_NEUTRAL_FG, CHIP_NEUTRAL_BG) >= 7.0

    # Test high contrast mode colors on pure black background
    assert calculate_contrast_ratio(HC_TEXT, HC_BG) >= 15.0
    assert calculate_contrast_ratio(HC_ACCENT, HC_BG) >= 15.0


def test_chip_variant_mapping() -> None:
    """Test mapping of election and verification states to chip variants."""
    assert chip_variant_from_state("ACTIVE") == "success"
    assert chip_variant_from_state("CONFIRMED") == "success"
    assert chip_variant_from_state("WITNESSED") == "success"
    assert chip_variant_from_state("PASS") == "success"
    assert chip_variant_from_state("LEADING") == "success"

    assert chip_variant_from_state("PENDING") == "warning"
    assert chip_variant_from_state("PENDING_WITNESS") == "warning"
    assert chip_variant_from_state("STANDALONE") == "warning"
    assert chip_variant_from_state("DRAFT") == "warning"

    assert chip_variant_from_state("DISPUTED") == "danger"
    assert chip_variant_from_state("FAIL") == "danger"
    assert chip_variant_from_state("MISMATCH") == "danger"
    assert chip_variant_from_state("REJECTED") == "danger"

    assert chip_variant_from_state("CONNECTED") == "info"
    assert chip_variant_from_state("PROCESSING") == "info"

    assert chip_variant_from_state("CLOSED") == "neutral"
    assert chip_variant_from_state("OTHER") == "neutral"


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_status_chip_widget_lifecycle() -> None:
    """Test status chip creation, updates, and compatibility configure calls."""
    root = tk.Tk()
    root.withdraw()

    chip = StatusChip(root, text="ACTIVE", variant="success")
    assert chip.get_status() == ("ACTIVE", "success")
    assert "ACTIVE" in chip.label.cget("text")
    assert chip.cget("text") == "ACTIVE"

    # Test updating status
    chip.set_status("PENDING REVIEW", "warning")
    assert chip.get_status() == ("PENDING REVIEW", "warning")
    assert "PENDING REVIEW" in chip.label.cget("text")

    # Test configure method with style for backward compatibility
    chip.configure(text="CRITICAL ERROR", style="BadgeRed.TLabel")
    assert chip.get_status() == ("CRITICAL ERROR", "danger")

    chip.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_merkle_tree_visualizer_canvas_rendering_and_highlights() -> None:
    """Test Merkle tree canvas visualizer drawing, step highlighting, and reset."""
    root = tk.Tk()
    root.withdraw()

    visualizer = MerkleTreeVisualizer(root)
    visualizer.pack()
    root.update_idletasks()

    # Create synthetic MerkleProofResult with 3 levels
    proof = MerkleProofResult(
        leaf_index=2,
        leaf_hash="sha256:00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
        leaf_id="ballot_002",
        nullifier="sha256:nullifier_val",
        path_length=3,
        siblings=[
            ("right", "sha256:aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"),
            ("left", "sha256:112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00"),
            ("right", "sha256:33445566778899aabbccddeeff00112233445566778899aabbccddeeff001122"),
        ],
        verified=True,
        root_hex="sha256:ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100",
    )

    # Render proof on canvas
    visualizer.draw_proof(proof)
    root.update_idletasks()

    assert "leaf" in visualizer.node_positions
    assert "sibling_1" in visualizer.node_positions
    assert "sibling_2" in visualizer.node_positions
    assert "sibling_3" in visualizer.node_positions
    assert "combined_1" in visualizer.node_positions
    assert "combined_2" in visualizer.node_positions
    assert "root" in visualizer.node_positions

    # Verify canvas created node cards and branch lines
    assert len(visualizer.canvas.find_withtag("node_card")) >= 7
    assert len(visualizer.canvas.find_withtag("branch_line")) >= 6

    # Test highlight step 0 (Leaf)
    visualizer.highlight_step(0)
    assert visualizer.animation_step == 0
    assert visualizer.step_status_chip.get_status()[0] == "LEAF HIGHLIGHTED"

    # Test highlight intermediate steps
    visualizer.highlight_step(1)
    assert visualizer.animation_step == 1
    assert "LEVEL 1 OF 3" in visualizer.step_status_chip.get_status()[0]

    visualizer.highlight_step(2)
    assert visualizer.animation_step == 2

    # Test final highlight (Root verified)
    visualizer.highlight_step(4)
    assert visualizer.animation_step == 4
    assert visualizer.step_status_chip.get_status()[0] == "ROOT VERIFIED"

    # Test step forward
    visualizer.animation_step = 0
    visualizer.step_forward()
    assert visualizer.animation_step == 1

    # Test reset highlights
    visualizer.reset_highlights()
    assert visualizer.animation_step == 0

    # Test animation start and cancel
    visualizer.animate_proof()
    assert visualizer.is_animating is True
    visualizer.cancel_animation()
    assert visualizer.is_animating is False
    assert visualizer.animation_job is None

    # Test click on canvas node reveals hash in detail label
    leaf_pos = visualizer.node_positions["leaf"]
    click_x = (leaf_pos[0] + leaf_pos[2]) // 2
    click_y = (leaf_pos[1] + leaf_pos[3]) // 2

    event = MagicMock()
    event.x = click_x
    event.y = click_y
    visualizer._on_canvas_click(event)
    assert "Leaf #2" in visualizer.detail_label.cget("text")

    visualizer.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_receipt_inspection_modal_dialog() -> None:
    """Test cryptographic receipt modal layout, copy actions, and archive check."""
    root = tk.Tk()
    root.withdraw()

    demos = demo_receipts()
    assert len(demos) >= 2
    demo_item = demos[0]

    modal = ReceiptInspectionModal(root, demo_item)
    root.update_idletasks()

    assert modal.title() == "Cryptographic Receipt Inspection"
    assert modal.status_chip.get_status()[0] == "WITNESSED"
    assert modal.status_chip.get_status()[1] == "success"

    # Verify JSON text content
    json_content = modal.json_text.get("1.0", "end")
    assert demo_item["receipt_handle"] in json_content
    assert demo_item["election_id"] in json_content

    # Test copy action
    modal._copy_json()
    assert "Copied to clipboard" in modal.copy_status.cget("text")

    # Test modal creation from Receipt dataclass object
    receipt_obj = Receipt(
        status="CONFIRMED",
        leaf_index=15,
        witnessed_at="30 Oct 2026 18:00 UTC",
        server_commitment="sha256:commit_hex_sample",
        witness_checkpoint="sha256:root_hex_sample",
        election_id="elec_live_99",
        handle="RCPT_LIVE_7788",
    )
    modal_obj = ReceiptInspectionModal(root, receipt_obj)
    root.update_idletasks()
    assert modal_obj.status_chip.get_status()[0] == "CONFIRMED"
    assert modal_obj.status_chip.get_status()[1] == "success"

    # Test saving receipt to voter wallet from modal
    modal._save_to_wallet()
    assert "Saved to voter wallet" in modal.copy_status.cget("text")

    # Test exporting receipt to file from modal
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp_export:
        tmp_export_path = tmp_export.name
    with patch("tkinter.filedialog.asksaveasfilename", return_value=tmp_export_path):
        modal._export_file()
        assert "Exported to" in modal.copy_status.cget("text")
        exported_content = Path(tmp_export_path).read_text(encoding="utf-8")
        assert demo_item["receipt_handle"] in exported_content
    try:
        os.remove(tmp_export_path)
    except Exception:
        pass

    modal.destroy()
    modal_obj.destroy()
    root.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_keyboard_shortcuts_and_high_contrast_theme() -> None:
    """Test global keyboard shortcuts, high contrast toggle, and shortcuts guide modal."""
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()

    # Test shortcuts modal
    app.show_shortcuts_modal()
    app.update_idletasks()
    assert app.shortcuts_modal is not None
    assert app.shortcuts_modal.winfo_exists()
    app.shortcuts_modal.destroy()
    app.shortcuts_modal = None

    # Test high contrast toggle
    assert app.high_contrast_mode is False
    app.toggle_high_contrast()
    app.update_idletasks()
    assert app.high_contrast_mode is True

    # Verify high contrast background updated
    assert app.cget("bg") == HC_BG

    # Toggle back to standard contrast
    app.toggle_high_contrast()
    app.update_idletasks()
    assert app.high_contrast_mode is False
    assert app.cget("bg") == SURFACE

    # Test receipt view and demo inspection button
    app._show_receipt()
    app.update_idletasks()
    assert hasattr(app, "receipt_chip")
    assert app.receipt_chip.get_status()[0] == "READY"

    # Open receipt modal from app
    app._open_receipt_modal(demo_receipts()[0])
    app.update_idletasks()
    assert app.receipt_modal is not None
    assert app.receipt_modal.winfo_exists()
    app.receipt_modal.destroy()
    app.receipt_modal = None

    app.destroy()
