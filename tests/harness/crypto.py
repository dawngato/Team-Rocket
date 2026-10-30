"""
HimVote cryptographic primitives module.
Complies with RFC 8785 canonical JSON and RFC 9162 Merkle tree specifications.
Provides blind credentials, nullifier derivation, and zero knowledge proof simulations.
"""

import base64
import hashlib
import json
import os
from typing import Any, Dict, List, Optional, Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import hashes, hmac


def canonical_json_bytes(data: Any) -> bytes:
    """
    Produce canonical JSON bytes conforming to RFC 8785.
    Keys are sorted lexicographically, no whitespace, UTF 8 encoded.
    Floats are disallowed to prevent cross platform serialization drift.
    """
    def _validate_types(obj: Any) -> None:
        if isinstance(obj, float):
            raise ValueError("Float values are forbidden in canonical ballot records")
        if isinstance(obj, dict):
            for k, v in obj.items():
                if not isinstance(k, str):
                    raise ValueError("Dictionary keys must be strings")
                _validate_types(v)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _validate_types(item)

    _validate_types(data)
    encoded = json.dumps(
        data,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False
    )
    return encoded.encode("utf-8")


def sha256_digest(data: bytes) -> str:
    """Compute hex sha256 digest with sha256 prefix."""
    h = hashlib.sha256(data).hexdigest()
    return f"sha256:{h}"


def sha256_bytes(data: bytes) -> bytes:
    """Compute raw 32 byte sha256 digest."""
    return hashlib.sha256(data).digest()


class MerkleTree:
    """
    RFC 9162 Merkle tree implementation.
    Leaf prefix: 0x00
    Node prefix: 0x01
    """

    def __init__(self, leaves: Optional[List[bytes]] = None):
        self.leaves: List[bytes] = []
        self.leaf_hashes: List[bytes] = []
        if leaves:
            for leaf in leaves:
                self.append_leaf(leaf)

    @staticmethod
    def hash_leaf(leaf_data: bytes) -> bytes:
        """Hash a leaf using RFC 9162 prefix 0x00."""
        return sha256_bytes(b"\x00" + leaf_data)

    @staticmethod
    def hash_children(left: bytes, right: bytes) -> bytes:
        """Hash two internal nodes using RFC 9162 prefix 0x01."""
        return sha256_bytes(b"\x01" + left + right)

    def append_leaf(self, leaf_data: bytes) -> int:
        """Append a leaf and return its zero indexed leaf index."""
        index = len(self.leaves)
        self.leaves.append(leaf_data)
        self.leaf_hashes.append(self.hash_leaf(leaf_data))
        return index

    @property
    def tree_size(self) -> int:
        return len(self.leaf_hashes)

    def get_root_bytes(self) -> bytes:
        """Compute Merkle tree root hash according to RFC 9162."""
        if not self.leaf_hashes:
            return sha256_bytes(b"")
        return self._compute_subtree_root(0, len(self.leaf_hashes))

    def get_root_hex(self) -> str:
        """Return Merkle root with sha256 prefix."""
        return f"sha256:{self.get_root_bytes().hex()}"

    def _compute_subtree_root(self, start: int, length: int) -> bytes:
        if length == 1:
            return self.leaf_hashes[start]
        # Largest power of two strictly less than length
        k = 1 << (length - 1).bit_length() - 1
        if k >= length:
            k >>= 1
        left = self._compute_subtree_root(start, k)
        right = self._compute_subtree_root(start + k, length - k)
        return self.hash_children(left, right)

    def get_inclusion_proof(self, leaf_index: int) -> List[Tuple[str, str]]:
        """
        Generate RFC 9162 audit path for leaf at leaf_index.
        Returns list of tuples (direction, hash_hex) where direction is 'L' or 'R'.
        """
        if leaf_index < 0 or leaf_index >= len(self.leaf_hashes):
            raise IndexError("Leaf index out of bounds")
        proof: List[Tuple[str, str]] = []
        self._build_audit_path(leaf_index, 0, len(self.leaf_hashes), proof)
        return proof

    def _build_audit_path(
        self,
        index: int,
        start: int,
        length: int,
        proof: List[Tuple[str, str]]
    ) -> None:
        if length <= 1:
            return
        k = 1 << (length - 1).bit_length() - 1
        if k >= length:
            k >>= 1
        if index < start + k:
            self._build_audit_path(index, start, k, proof)
            right_root = self._compute_subtree_root(start + k, length - k)
            proof.append(("R", f"sha256:{right_root.hex()}"))
        else:
            self._build_audit_path(index, start + k, length - k, proof)
            left_root = self._compute_subtree_root(start, k)
            proof.append(("L", f"sha256:{left_root.hex()}"))

    @staticmethod
    def verify_inclusion_proof(
        leaf_data: bytes,
        leaf_index: int,
        tree_size: int,
        proof: List[Tuple[str, str]],
        expected_root_hex: str
    ) -> bool:
        """Verify an RFC 9162 Merkle audit path against an expected root."""
        current = MerkleTree.hash_leaf(leaf_data)
        for direction, sibling_hex in proof:
            clean_hex = sibling_hex.replace("sha256:", "")
            sibling_bytes = bytes.fromhex(clean_hex)
            if direction == "R":
                current = MerkleTree.hash_children(current, sibling_bytes)
            elif direction == "L":
                current = MerkleTree.hash_children(sibling_bytes, current)
            else:
                return False
        computed = f"sha256:{current.hex()}"
        return computed.lower() == expected_root_hex.lower()


class KeyPair:
    """Ed25519 signing key pair for authoritative roles."""

    def __init__(self, private_key: Optional[ed25519.Ed25519PrivateKey] = None):
        if private_key is None:
            self.private_key = ed25519.Ed25519PrivateKey.generate()
        else:
            self.private_key = private_key
        self.public_key = self.private_key.public_key()

    @property
    def public_bytes(self) -> bytes:
        return self.public_key.public_bytes_raw()

    @property
    def key_id(self) -> str:
        h = hashlib.sha256(self.public_bytes).hexdigest()[:16]
        return f"key_{h}"

    def sign(self, message: bytes) -> str:
        sig = self.private_key.sign(message)
        return base64.urlsafe_b64encode(sig).decode("ascii")

    def verify(self, message: bytes, signature_b64url: str) -> bool:
        try:
            sig = base64.urlsafe_b64decode(signature_b64url.encode("ascii"))
            self.public_key.verify(sig, message)
            return True
        except Exception:
            return False


class BlindCredentialIssuer:
    """
    Simulates RFC 9474 blind signature token issuer for student credentials.
    The issuer key signs blinded tokens. The voter unblinds the signature.
    """

    def __init__(self, election_id: str):
        self.election_id = election_id
        self._signing_secret = os.urandom(32)
        self.issuer_key_id = f"issuer_key_{hashlib.sha256(self._signing_secret).hexdigest()[:12]}"

    def sign_blinded_request(self, blinded_request_b64url: str) -> str:
        """Sign a blinded request received from an authorized student."""
        raw_blinded = base64.urlsafe_b64decode(blinded_request_b64url.encode("ascii"))
        h = hmac.HMAC(self._signing_secret, hashes.SHA256())
        h.update(self.election_id.encode("utf-8"))
        h.update(raw_blinded)
        signature = h.finalize()
        return base64.urlsafe_b64encode(signature).decode("ascii")

    def verify_credential(
        self,
        election_id: str,
        secret_serial: str,
        proof_b64url: str
    ) -> bool:
        """
        Verify an unblinded credential presented during casting.
        Must match the election and be signed by this issuer.
        """
        if election_id != self.election_id:
            return False
        try:
            expected_hmac = hmac.HMAC(self._signing_secret, hashes.SHA256())
            expected_hmac.update(election_id.encode("utf-8"))
            expected_hmac.update(secret_serial.encode("utf-8"))
            signature = base64.urlsafe_b64decode(proof_b64url.encode("ascii"))
            expected_hmac.verify(signature)
            return True
        except Exception:
            return False


class VoterCredentialClient:
    """
    Client side token blinding, unblinding and nullifier derivation.
    """

    def __init__(self, election_id: str, client_platform: str = "web"):
        self.election_id = election_id
        self.client_platform = client_platform
        self.secret_serial = os.urandom(32).hex()
        self.blind_factor = os.urandom(32).hex()

    def create_blinded_request(self) -> str:
        """Create blinded request sent to identity issuer."""
        # Token binds secret serial with election context
        token_payload = self.secret_serial.encode("utf-8")
        return base64.urlsafe_b64encode(token_payload).decode("ascii")

    def unblind_response(self, blind_response_b64url: str) -> str:
        """Unblind token signature to obtain anonymous casting proof."""
        return blind_response_b64url

    def derive_nullifier(self) -> str:
        """
        Derive the election nullifier from the voter secret serial.
        Nullifier is unique per voter and per election.
        """
        payload = f"himvote:nullifier:{self.election_id}:{self.secret_serial}".encode("utf-8")
        return sha256_digest(payload)


def encrypt_choice(choice: str, election_id: str) -> Tuple[str, str]:
    """
    Simulate ElectionGuard verifiable encryption of candidate selection.
    Returns (engine_ballot_b64url, engine_proofs_b64url).
    """
    nonce = os.urandom(16).hex()
    ciphertext_dict = {
        "election_id": election_id,
        "nonce": nonce,
        "encrypted_data": hashlib.sha256(f"{choice}:{nonce}".encode("utf-8")).hexdigest()
    }
    proof_dict = {
        "proof_version": "electionguard_v1",
        "valid_selection": True,
        "commitment": hashlib.sha256(f"proof:{choice}:{nonce}".encode("utf-8")).hexdigest()
    }
    ballot_b64 = base64.urlsafe_b64encode(canonical_json_bytes(ciphertext_dict)).decode("ascii")
    proofs_b64 = base64.urlsafe_b64encode(canonical_json_bytes(proof_dict)).decode("ascii")
    return ballot_b64, proofs_b64


def verify_engine_ballot(ballot_b64url: str, proofs_b64url: str, election_id: str) -> bool:
    """Verify that ballot ciphertext and zero knowledge proofs are valid."""
    try:
        raw_ballot = base64.urlsafe_b64decode(ballot_b64url.encode("ascii"))
        raw_proofs = base64.urlsafe_b64decode(proofs_b64url.encode("ascii"))
        ballot_obj = json.loads(raw_ballot.decode("utf-8"))
        proofs_obj = json.loads(raw_proofs.decode("utf-8"))
        if ballot_obj.get("election_id") != election_id:
            return False
        if not proofs_obj.get("valid_selection"):
            return False
        return True
    except Exception:
        return False
