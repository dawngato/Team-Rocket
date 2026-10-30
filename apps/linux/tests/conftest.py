"""Pytest configuration for HimVote Linux desktop application tests."""

from pathlib import Path
import sys

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
