"""
Root pytest path bootstrap.

Identity issuer tests import HimVote.services.* (package rooted at the parent of
this repository folder). Casting and admin_api tests import src.* from their
service directories. This conftest keeps both styles working from one root run.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARENT = ROOT.parent
# election_engine is imported as services.election_engine only. Putting its
# directory on sys.path would shadow the top-level verifier/ package.
SERVICE_PATHS = [
    ROOT / "services" / "checkpoint_worker",
    ROOT / "services" / "anchor_relayer",
    ROOT / "packages" / "himvote_crypto",
    ROOT,
]

for path in [PARENT, *SERVICE_PATHS]:
    rendered = str(path)
    if rendered not in sys.path:
        sys.path.insert(0, rendered)
