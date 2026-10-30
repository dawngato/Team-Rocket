"""GUI unit and integration tests for HimVote Linux desktop application."""

import os
from pathlib import Path
import sys
from unittest.mock import patch
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import HimVoteLinuxApp


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_linux_window_starts_and_closes() -> None:
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()
    app.after(50, app.destroy)
    app.mainloop()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_linux_navigation_views() -> None:
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()

    # Test switching to receipt view
    app._show_receipt()
    app.update_idletasks()

    # Test switching to elections view
    app._show_elections()
    app.update_idletasks()

    # Test switching to offline audit view
    app._show_audit()
    app.update_idletasks()

    assert hasattr(app, "audit_notebook")
    assert app.audit_notebook.index("current") == 0

    app.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_gui_load_archive_renders_merkle_and_tallies() -> None:
    sim_dir = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not sim_dir.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()

    app._show_audit()
    app.update_idletasks()

    # Load archive
    app._load_archive_path(sim_dir)
    app.update_idletasks()

    assert app.current_inspection is not None
    assert app.current_inspection.total_leaves == 100
    assert app.current_inspection.is_valid is True

    # Test leaf proof recomputation in GUI
    app._inspect_leaf_proof()
    app.update_idletasks()

    proof_items = app.proof_treeview.get_children()
    assert len(proof_items) == 7

    # Test changing leaf index and recomputing
    app.leaf_index_spin.set(42)
    app._inspect_leaf_proof()
    app.update_idletasks()
    assert len(app.proof_treeview.get_children()) == 7

    # Verify tally tab is populated
    children = app.tab_tally.winfo_children()
    assert len(children) > 0

    app.destroy()


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_gui_handles_invalid_archive_path_gracefully() -> None:
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()
    app._show_audit()

    with patch("tkinter.messagebox.showerror") as mock_err:
        app._load_archive_path(Path("/tmp/invalid_path_xyz"))
        assert mock_err.called is True

    app.destroy()
