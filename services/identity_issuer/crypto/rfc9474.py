"""
RFC 9474 RSA Blind Signatures module.
Production grade implementation conforming to RFC 9474 BlindSign specification.

BlindSign(sk, blinded_msg):
1. m = bytes_to_int(blinded_msg)
2. s = RSASP1(sk, m)
3. m_prime = RSAVP1(pk, s)
4. If m != m_prime, raise signing failure
5. blind_sig = int_to_bytes(s, modulus_len)
6. return blind_sig
"""

import math
import secrets
import base64
import hashlib
from typing import Tuple, Optional
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from ..config import ISSUER_PRIVATE_KEY_PEM


class RsaBlindIssuer:
    """RSA Blind Signature Issuer implementing RFC 9474 operations."""

    def __init__(self, private_key: Optional[rsa.RSAPrivateKey] = None):
        if private_key is not None:
            self._private_key = private_key
        elif ISSUER_PRIVATE_KEY_PEM:
            self._private_key = serialization.load_pem_private_key(
                ISSUER_PRIVATE_KEY_PEM.encode("utf-8"),
                password=None,
            )
        else:
            self._private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )

        self._public_key = self._private_key.public_key()
        priv_numbers = self._private_key.private_numbers()
        pub_numbers = self._public_key.public_numbers()

        self.n = pub_numbers.n
        self.e = pub_numbers.e
        self.d = priv_numbers.d
        self.modulus_len = (self._private_key.key_size + 7) // 8

    @property
    def public_key(self) -> rsa.RSAPublicKey:
        """Get the RSA public key."""
        return self._public_key

    def blind_sign(self, blinded_msg: bytes) -> bytes:
        """
        Execute BlindSign per RFC 9474 Section 4.3.
        Steps:
        1. m = bytes_to_int(blinded_msg)
        2. Verify 0 <= m < n
        3. s = RSASP1(sk, m) = pow(m, d, n)
        4. m_prime = RSAVP1(pk, s) = pow(s, e, n)
        5. Verify m == m_prime
        6. blind_sig = int_to_bytes(s, modulus_len)
        """
        m = int.from_bytes(blinded_msg, byteorder="big")
        if m < 0 or m >= self.n:
            raise ValueError("message representative out of range")

        s = pow(m, self.d, self.n)
        m_prime = pow(s, self.e, self.n)

        if m != m_prime:
            raise RuntimeError("signing failure")

        return s.to_bytes(self.modulus_len, byteorder="big")

    def blind_sign_base64url(self, blinded_msg_b64url: str) -> str:
        """Decode base64url blinded request, blind sign, return base64url response."""
        try:
            padded = blinded_msg_b64url + "=" * ((4 - len(blinded_msg_b64url) % 4) % 4)
            blinded_bytes = base64.urlsafe_b64decode(padded.encode("ascii"))
        except Exception as exc:
            raise ValueError(f"Invalid base64url blinded request: {exc}")

        blind_sig_bytes = self.blind_sign(blinded_bytes)
        encoded = base64.urlsafe_b64encode(blind_sig_bytes).decode("ascii").rstrip("=")
        return encoded


# Default singleton issuer instance
default_issuer = RsaBlindIssuer()


def get_default_issuer() -> RsaBlindIssuer:
    """Return the shared issuer instance."""
    return default_issuer


def client_blind(
    message: bytes,
    public_key: rsa.RSAPublicKey,
) -> Tuple[str, int]:
    """
    Client helper to blind a message for RFC 9474 test and client scenarios.
    Returns (blinded_request_base64url, blinding_factor_r).
    """
    pub_numbers = public_key.public_numbers()
    n = pub_numbers.n
    e = pub_numbers.e
    modulus_len = (public_key.key_size + 7) // 8

    # Derive representative integer via SHA256
    digest = hashlib.sha256(message).digest()
    m = int.from_bytes(digest, byteorder="big") % n

    # Choose random blinding factor r coprime to n
    r = secrets.randbelow(n - 2) + 2
    while math.gcd(r, n) != 1:
        r = secrets.randbelow(n - 2) + 2

    # m_blind = (m * r^e) mod n
    m_blind = (m * pow(r, e, n)) % n
    blinded_bytes = m_blind.to_bytes(modulus_len, byteorder="big")
    b64url = base64.urlsafe_b64encode(blinded_bytes).decode("ascii").rstrip("=")
    return b64url, r


def client_finalize(
    blind_sig_b64url: str,
    r: int,
    public_key: rsa.RSAPublicKey,
) -> bytes:
    """
    Client helper to unblind the signature received from issuer.
    sig = (s * r^-1) mod n.
    """
    pub_numbers = public_key.public_numbers()
    n = pub_numbers.n
    modulus_len = (public_key.key_size + 7) // 8

    padded = blind_sig_b64url + "=" * ((4 - len(blind_sig_b64url) % 4) % 4)
    blind_sig_bytes = base64.urlsafe_b64decode(padded.encode("ascii"))
    s = int.from_bytes(blind_sig_bytes, byteorder="big")

    r_inv = pow(r, -1, n)
    sig = (s * r_inv) % n
    return sig.to_bytes(modulus_len, byteorder="big")


def client_verify(
    message: bytes,
    signature: bytes,
    public_key: rsa.RSAPublicKey,
) -> bool:
    """
    Verify unblinded signature on original message.
    Check pow(sig, e, n) == m.
    """
    pub_numbers = public_key.public_numbers()
    n = pub_numbers.n
    e = pub_numbers.e

    digest = hashlib.sha256(message).digest()
    m = int.from_bytes(digest, byteorder="big") % n
    sig_int = int.from_bytes(signature, byteorder="big")

    recovered = pow(sig_int, e, n)
    return recovered == m
