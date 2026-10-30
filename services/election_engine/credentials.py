"""Credential issuance and verification module.
Implements RFC 9474 compatible blind signature issuance and deterministic nullifiers.
"""

import hashlib
import secrets
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple
from cryptography.hazmat.primitives.asymmetric import rsa


def derive_nullifier(election_id: str, voter_token: str) -> str:
    """Derive deterministic nullifier from election ID and voter secret token."""
    message = f"himvote_nullifier_v1:{election_id}:{voter_token}".encode("utf_8")
    return hashlib.sha256(message).hexdigest()


def hash_token_to_int(token_str: str, modulus_n: int) -> int:
    """Hash voter token to an integer scalar modulo RSA modulus N."""
    digest = hashlib.sha256(token_str.encode("utf_8")).digest()
    return int.from_bytes(digest, "big") % modulus_n


@dataclass
class IssuerKeyPair:
    """RSA blind signature issuer key pair."""
    key_id: str
    modulus_n: int
    public_exponent_e: int
    private_exponent_d: int

    @classmethod
    def generate(cls, key_id: str = "issuer_default_key", key_size: int = 2048) -> "IssuerKeyPair":
        """Generate a new RSA key pair for blind signature issuance."""
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
        pub_nums = private_key.public_key().public_numbers()
        priv_nums = private_key.private_numbers()
        return cls(
            key_id=key_id,
            modulus_n=pub_nums.n,
            public_exponent_e=pub_nums.e,
            private_exponent_d=priv_nums.d,
        )

    def get_public_dict(self) -> Dict[str, Any]:
        """Export public parameters for verification."""
        return {
            "key_id": self.key_id,
            "n": hex(self.modulus_n),
            "e": self.public_exponent_e,
        }

    def sign_blinded_request(self, blinded_request_int: int) -> int:
        """Sign a blinded integer per RFC 9474."""
        if blinded_request_int <= 1 or blinded_request_int >= self.modulus_n:
            raise ValueError("Blinded request out of valid range")
        return pow(blinded_request_int, self.private_exponent_d, self.modulus_n)


@dataclass
class VoterCredential:
    """Voter credential token, blinding factor, and resulting signature."""
    election_id: str
    voter_token: str
    blinding_factor_r: Optional[int] = None
    signature: Optional[int] = None

    @classmethod
    def create(cls, election_id: str) -> "VoterCredential":
        """Create a fresh random voter secret token."""
        token = secrets.token_hex(32)
        return cls(election_id=election_id, voter_token=token)

    def generate_blinded_request(self, modulus_n: int, public_exponent_e: int) -> int:
        """Generate blinded request for the issuer."""
        m = hash_token_to_int(self.voter_token, modulus_n)
        r = secrets.randbelow(modulus_n - 3) + 2
        self.blinding_factor_r = r
        blinded = (m * pow(r, public_exponent_e, modulus_n)) % modulus_n
        return blinded

    def unblind_signature(self, blind_signature: int, modulus_n: int) -> int:
        """Unblind the signature received from the issuer."""
        if not self.blinding_factor_r:
            raise ValueError("Missing blinding factor")
        inv_r = pow(self.blinding_factor_r, -1, modulus_n)
        sig = (blind_signature * inv_r) % modulus_n
        self.signature = sig
        return sig

    def get_credential_proof(self, manifest_digest: str) -> Dict[str, Any]:
        """Construct proof payload to accompany cast ballot."""
        if not self.signature:
            raise ValueError("Credential has not been signed")
        return {
            "election_id": self.election_id,
            "manifest_digest": manifest_digest,
            "voter_token": self.voter_token,
            "signature": hex(self.signature),
        }

    def get_nullifier(self) -> str:
        """Compute the deterministic nullifier for this election."""
        return derive_nullifier(self.election_id, self.voter_token)


def verify_credential_proof(
    election_id: str,
    manifest_digest: str,
    credential_proof: Dict[str, Any],
    issuer_public_key: Dict[str, Any],
) -> Tuple[bool, str]:
    """Verify an anonymous credential proof and derive nullifier."""
    proof_election_id = credential_proof.get("election_id")
    proof_manifest_digest = credential_proof.get("manifest_digest")
    if proof_election_id != election_id:
        return False, ""
    if proof_manifest_digest != manifest_digest:
        return False, ""

    voter_token = credential_proof.get("voter_token")
    sig_raw = credential_proof.get("signature")
    if not voter_token or not sig_raw:
        return False, ""

    sig = int(sig_raw, 16) if isinstance(sig_raw, str) else int(sig_raw)
    n_raw = issuer_public_key.get("n")
    e_val = issuer_public_key.get("e", 65537)
    if not n_raw:
        return False, ""
    n = int(n_raw, 16) if isinstance(n_raw, str) else int(n_raw)

    m = hash_token_to_int(voter_token, n)
    reconstructed_m = pow(sig, e_val, n)
    if reconstructed_m != m:
        return False, ""

    nullifier = derive_nullifier(election_id, voter_token)
    return True, nullifier
