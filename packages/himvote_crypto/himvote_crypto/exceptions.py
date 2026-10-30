"""Cryptographic and canonicalization exceptions for HimVote."""

from typing import Optional


class CryptoError(Exception):
    """Base exception for himvote_crypto operations."""


class CanonicalizationError(CryptoError):
    """Base exception for JSON canonicalization failures."""


class DuplicateKeyError(CanonicalizationError):
    """Raised when duplicate object keys are detected during parsing."""

    def __init__(self, key: str, message: Optional[str] = None) -> None:
        self.key = key
        super().__init__(message or f"Duplicate object key detected: {key}")


class FloatNotPermittedError(CanonicalizationError, ValueError):
    """Raised when floating point numbers are encountered in strict integer mode."""

    def __init__(self, message: Optional[str] = None) -> None:
        super().__init__(
            message
            or "Floating point numbers are forbidden in HimVote canonical records to avoid precision ambiguity"
        )


class InvalidUnicodeError(CanonicalizationError):
    """Raised when invalid Unicode characters or lone surrogates are encountered."""


class MerkleError(CryptoError):
    """Base exception for Merkle tree and proof operations."""


class InclusionProofError(MerkleError):
    """Raised when Merkle inclusion proof verification fails."""


class ConsistencyProofError(MerkleError):
    """Raised when Merkle consistency proof verification fails."""


class RSABlindError(CryptoError):
    """Base exception for RSA blind signature operations."""


class BlindingError(RSABlindError):
    """Raised when blinding or inversion fails."""


class InvalidSignatureError(CryptoError):
    """Raised when a digital signature fails cryptographic verification."""


class Ed25519Error(CryptoError):
    """Base exception for Ed25519 signing and verification operations."""
