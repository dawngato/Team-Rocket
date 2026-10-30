"""
Root conftest for HimVote automated security and integration test suite.
Configures python search path so tests package is cleanly discoverable.
"""

import os
import sys

_here = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_here)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
