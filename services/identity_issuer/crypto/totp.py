"""
Time based One Time Password (TOTP) module for MFA.
Uses pyotp to generate provisioning URIs and verify tokens.
"""

import pyotp
from ..config import MFA_ISSUER


def generate_totp_secret() -> str:
    """Generate random base32 TOTP secret key."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str, issuer: str = MFA_ISSUER) -> str:
    """Generate otpauth URI for authenticator applications."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, token: str, valid_window: int = 1) -> bool:
    """Verify given token against secret with a tolerance window."""
    if not token or not secret:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(token.strip(), valid_window=valid_window))
    except Exception:
        return False
