"""
Cryptographic primitives and RFC 9162 Merkle log operations for HimVote Witness.
Strict adherence to:
* SHA256 hashing
* RFC 9162 Certificate Transparency Merkle Tree Hash and Consistency Verification
* RFC 8785 JSON Canonicalization binding
* Ed25519 signature generation and verification
"""

import hashlib
from typing import List, Optional
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature


def sha256_bytes(data: bytes) -> bytes:
    """Compute standard SHA256 digest returning raw bytes."""
    return hashlib.sha256(data).digest()


def sha256_hex(data: bytes) -> str:
    """Compute standard SHA256 digest returning lowercase hexadecimal string."""
    return hashlib.sha256(data).hexdigest()


def leaf_hash(data: bytes) -> bytes:
    """
    Compute RFC 9162 leaf hash: SHA256(0x00 || data).
    Leaf prefix prevents second preimage attacks.
    """
    return sha256_bytes(b"\x00" + data)


def node_hash(left: bytes, right: bytes) -> bytes:
    """
    Compute RFC 9162 interior node hash: SHA256(0x01 || left || right).
    Node prefix ensures domain separation from leaf nodes.
    """
    return sha256_bytes(b"\x01" + left + right)


def _largest_power_of_two_less_than(n: int) -> int:
    """Return the largest power of 2 strictly less than n where n > 1."""
    if n <= 1:
        return 0
    return 1 << ((n - 1).bit_length() - 1)


def merkle_tree_hash(leaf_hashes: List[bytes]) -> bytes:
    """
    Calculate RFC 9162 Merkle Tree Hash (MTH) for an ordered list of leaf hashes.
    Empty tree produces SHA256 of empty bytes.
    """
    count = len(leaf_hashes)
    if count == 0:
        return sha256_bytes(b"")
    if count == 1:
        return leaf_hashes[0]

    k = _largest_power_of_two_less_than(count)
    left_sub_root = merkle_tree_hash(leaf_hashes[:k])
    right_sub_root = merkle_tree_hash(leaf_hashes[k:])
    return node_hash(left_sub_root, right_sub_root)


def _subproof(m: int, leaf_hashes: List[bytes], is_root_subproof: bool) -> List[bytes]:
    """Helper generating consistency proof path according to RFC 9162 Section 2.1.4.1."""
    n = len(leaf_hashes)
    if m == n:
        if is_root_subproof:
            return []
        return [merkle_tree_hash(leaf_hashes)]

    k = _largest_power_of_two_less_than(n)
    if m <= k:
        left_path = _subproof(m, leaf_hashes[:k], is_root_subproof)
        right_commitment = merkle_tree_hash(leaf_hashes[k:])
        return left_path + [right_commitment]
    else:
        right_path = _subproof(m - k, leaf_hashes[k:], False)
        left_commitment = merkle_tree_hash(leaf_hashes[:k])
        return right_path + [left_commitment]


def generate_consistency_proof(first_size: int, leaf_hashes: List[bytes]) -> List[bytes]:
    """
    Generate RFC 9162 consistency proof between tree of first_size and full tree.
    Returns empty list if first_size equals full tree size or is zero.
    """
    second_size = len(leaf_hashes)
    if first_size <= 0 or first_size >= second_size:
        return []
    return _subproof(first_size, leaf_hashes, True)


def verify_consistency_proof(
    first_size: int,
    second_size: int,
    first_root: bytes,
    second_root: bytes,
    consistency_path: List[bytes]
) -> bool:
    """
    Verify Merkle consistency proof per RFC 9162 Section 2.1.4.2.
    Proves that older tree of first_size with first_root is an exact prefix of
    newer tree of second_size with second_root, ensuring no leaves were modified,
    reordered, or truncated.
    """
    if first_size < 0 or second_size < 0:
        return False
    if first_size > second_size:
        return False
    if first_size == 0:
        return len(consistency_path) == 0
    if first_size == second_size:
        return len(consistency_path) == 0 and first_root == second_root
    if len(consistency_path) == 0:
        return False

    path = list(consistency_path)
    # RFC 9162: If first is an exact power of 2, prepend first_root
    if (first_size & (first_size - 1)) == 0:
        path = [first_root] + path

    fn = first_size - 1
    sn = second_size - 1

    while (fn & 1) == 1:
        fn >>= 1
        sn >>= 1

    if not path:
        return False

    fr = path[0]
    sr = path[0]

    for c in path[1:]:
        if sn == 0:
            return False
        if (fn & 1) == 1 or fn == sn:
            fr = node_hash(c, fr)
            sr = node_hash(c, sr)
            while (fn & 1) == 0 and fn > 0:
                fn >>= 1
                sn >>= 1
        else:
            sr = node_hash(sr, c)
        fn >>= 1
        sn >>= 1

    return fr == first_root and sr == second_root and sn == 0


def compute_witness_binding(
    election_id: str,
    previous_witness_sequence: int,
    checkpoint_canonical_bytes: bytes
) -> bytes:
    """
    Bind election ID, previous witness sequence, and canonical checkpoint bytes.
    Fulfills Section 5.4 requirement:
    'The witness signature binds the canonical bytes, the previous witness sequence and the election ID.'
    """
    prefix = f"HIMVOTE_WITNESS_V1:{election_id}:{previous_witness_sequence}:".encode("utf-8")
    return prefix + checkpoint_canonical_bytes


class KeyManager:
    """Handles Ed25519 signing keys, verification, and serialization."""

    def __init__(self, private_key: Optional[ed25519.Ed25519PrivateKey] = None):
        if private_key is None:
            self._private_key = ed25519.Ed25519PrivateKey.generate()
        else:
            self._private_key = private_key
        self._public_key = self._private_key.public_key()

    @classmethod
    def from_private_bytes(cls, raw_bytes: bytes) -> "KeyManager":
        """Load Ed25519 private key from 32 raw bytes."""
        pk = ed25519.Ed25519PrivateKey.from_private_bytes(raw_bytes)
        return cls(pk)

    @classmethod
    def from_hex(cls, hex_str: str) -> "KeyManager":
        """Load Ed25519 private key from 64 character hex string."""
        raw = bytes.fromhex(hex_str.strip())
        return cls.from_private_bytes(raw)

    def get_private_bytes(self) -> bytes:
        """Export raw 32 bytes of the private key."""
        return self._private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )

    def get_private_hex(self) -> str:
        """Export private key as hex string."""
        return self.get_private_bytes().hex()

    def get_public_bytes(self) -> bytes:
        """Export raw 32 bytes of public key."""
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )

    def get_public_hex(self) -> str:
        """Export public key as lowercase hex string."""
        return self.get_public_bytes().hex()

    def sign(self, message: bytes) -> bytes:
        """Sign arbitrary message bytes using Ed25519."""
        return self._private_key.sign(message)

    def sign_hex(self, message: bytes) -> str:
        """Sign message bytes and return signature as hex string."""
        return self.sign(message).hex()

    def sign_witness_ack(
        self,
        election_id: str,
        previous_witness_sequence: int,
        checkpoint_canonical_bytes: bytes
    ) -> str:
        """Sign canonical witness acknowledgement binding."""
        payload = compute_witness_binding(
            election_id=election_id,
            previous_witness_sequence=previous_witness_sequence,
            checkpoint_canonical_bytes=checkpoint_canonical_bytes
        )
        return self.sign_hex(payload)


def verify_ed25519_signature(
    public_key_hex: str,
    signature_hex: str,
    message: bytes
) -> bool:
    """
    Verify Ed25519 signature over message bytes.
    Returns True if valid, False on signature mismatch or malformed inputs.
    """
    try:
        pk_bytes = bytes.fromhex(public_key_hex.strip())
        sig_bytes = bytes.fromhex(signature_hex.strip())
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(pk_bytes)
        public_key.verify(sig_bytes, message)
        return True
    except (ValueError, InvalidSignature, Exception):
        return False


def verify_writer_signature(
    writer_public_key_hex: str,
    signature_hex: str,
    canonical_checkpoint_bytes: bytes
) -> bool:
    """
    Verify log writer signature over canonical checkpoint bytes or its SHA256 digest.
    Accepts signature covering canonical JSON directly or digest for client flexibility.
    """
    # Direct canonical bytes signature
    if verify_ed25519_signature(writer_public_key_hex, signature_hex, canonical_checkpoint_bytes):
        return True
    # Sha256 digest bytes signature
    digest_bytes = sha256_bytes(canonical_checkpoint_bytes)
    if verify_ed25519_signature(writer_public_key_hex, signature_hex, digest_bytes):
        return True
    # Sha256 hex string signature
    digest_hex_bytes = sha256_hex(canonical_checkpoint_bytes).encode("utf-8")
    if verify_ed25519_signature(writer_public_key_hex, signature_hex, digest_hex_bytes):
        return True
    return False
