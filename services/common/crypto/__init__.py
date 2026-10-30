"""Compatibility module exposing himvote_crypto primitives under services.common.crypto."""

import sys
from pathlib import Path

# Ensure packages directory is available on python path
_packages_dir = str(Path(__file__).resolve().parents[3] / "packages" / "himvote_crypto")
if _packages_dir not in sys.path:
    sys.path.insert(0, _packages_dir)

from himvote_crypto import *  # noqa: F401, F403
