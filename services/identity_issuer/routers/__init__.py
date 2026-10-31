"""
Router package for HimVote Identity Issuer.
"""

from .auth import router as auth_router
from .bootstrap import router as bootstrap_router
from .admin import router as admin_router
from .roster import router as roster_router
from .credentials import router as credentials_router
from .profile import router as profile_router

__all__ = [
    "auth_router",
    "bootstrap_router",
    "admin_router",
    "roster_router",
    "credentials_router",
    "profile_router",
]
