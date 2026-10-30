"""Pytest configuration for HimVote Linux desktop application tests."""

import os
from pathlib import Path
import sys
import time
import pytest

# Ensure Tcl/Tk libraries are located reliably on Windows systems
if sys.platform == "win32":
    _tcl_cand = Path(sys.base_prefix) / "tcl" / "tcl8.6"
    if _tcl_cand.exists() and "TCL_LIBRARY" not in os.environ:
        os.environ["TCL_LIBRARY"] = str(_tcl_cand)
    _tk_cand = Path(sys.base_prefix) / "tcl" / "tk8.6"
    if _tk_cand.exists() and "TK_LIBRARY" not in os.environ:
        os.environ["TK_LIBRARY"] = str(_tk_cand)

# Ensure Team-Rocket root is at the front of sys.path
_REPO_ROOT = Path(__file__).resolve().parents[3]
_rendered = str(_REPO_ROOT)
if _rendered in sys.path:
    sys.path.remove(_rendered)
sys.path.insert(0, _rendered)

# Move parent folder after Team-Rocket so local apps package takes precedence
_parent = str(_REPO_ROOT.parent)
while _parent in sys.path:
    sys.path.remove(_parent)
sys.path.append(_parent)

# Clear any shadowed modules in sys.modules
for mod_name in list(sys.modules.keys()):
    if mod_name == "apps" or mod_name.startswith("apps."):
        del sys.modules[mod_name]


@pytest.fixture(autouse=True)
def _tcl_stabilizer():
    """Ensure Windows desktop GDI handles and Tcl interpreters cleanly cycle between tests."""
    yield
    if sys.platform == "win32":
        time.sleep(0.05)
