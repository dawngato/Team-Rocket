"""
RFC 9162 Merkle Tree implementation.
Computes Merkle Tree Hash and generates consistency and inclusion proofs.
"""

import hashlib
from typing import Sequence, List, Optional


EMPTY_TREE_HASH: bytes = hashlib.sha256(b"").digest()
LEAF_PREFIX: bytes = b"\x00"
INTERNAL_NODE_PREFIX: bytes = b"\x01"


def compute_leaf_hash(leaf_data: bytes) -> bytes:
    """
    Compute leaf hash according to RFC 9162 Section 2.1.2.
    Prefix byte is 0x00 followed by raw leaf data.
    """
    return hashlib.sha256(LEAF_PREFIX + leaf_data).digest()


def hash_internal_node(left_hash: bytes, right_hash: bytes) -> bytes:
    """
    Compute internal node hash according to RFC 9162 Section 2.1.2.
    Prefix byte is 0x01 followed by left and right hashes.
    """
    return hashlib.sha256(INTERNAL_NODE_PREFIX + left_hash + right_hash).digest()


def compute_mth_from_hashes(hashes: Sequence[bytes]) -> bytes:
    """
    Compute Merkle Tree Hash recursively from an ordered sequence of leaf hashes.
    """
    n = len(hashes)
    if n == 0:
        return EMPTY_TREE_HASH
    if n == 1:
        return hashes[0]

    k = 1 << ((n - 1).bit_length() - 1)
    left_root = compute_mth_from_hashes(hashes[:k])
    right_root = compute_mth_from_hashes(hashes[k:])
    return hash_internal_node(left_root, right_root)


def generate_subproof(m: int, hashes: Sequence[bytes], is_complete: bool) -> List[bytes]:
    """
    Helper function for RFC 9162 Section 2.1.4 consistency proof calculation.
    """
    n = len(hashes)
    if m == n:
        if is_complete:
            return []
        return [compute_mth_from_hashes(hashes)]

    k = 1 << ((n - 1).bit_length() - 1)
    if m <= k:
        return generate_subproof(m, hashes[:k], is_complete) + [compute_mth_from_hashes(hashes[k:])]
    else:
        return generate_subproof(m - k, hashes[k:], False) + [compute_mth_from_hashes(hashes[:k])]


class RFC9162MerkleTree:
    """
    Represents an append only Merkle tree conforming to RFC 9162.
    """

    def __init__(self, initial_leaf_hashes: Optional[Sequence[bytes]] = None):
        self._leaf_hashes: List[bytes] = list(initial_leaf_hashes) if initial_leaf_hashes else []

    @property
    def tree_size(self) -> int:
        """Return the current number of leaves in the tree."""
        return len(self._leaf_hashes)

    def append_leaf_bytes(self, leaf_data: bytes) -> int:
        """
        Hash leaf data per RFC 9162 and append to tree.
        Returns the new tree size.
        """
        leaf_hash = compute_leaf_hash(leaf_data)
        self._leaf_hashes.append(leaf_hash)
        return len(self._leaf_hashes)

    def append_leaf_hash(self, leaf_hash: bytes) -> int:
        """
        Append precomputed 32 byte leaf hash to tree.
        Returns the new tree size.
        """
        if len(leaf_hash) != 32:
            raise ValueError("Leaf hash must be exactly 32 bytes")
        self._leaf_hashes.append(leaf_hash)
        return len(self._leaf_hashes)

    def get_leaf_hash(self, index: int) -> bytes:
        """Return leaf hash at given index."""
        if index < 0 or index >= len(self._leaf_hashes):
            raise IndexError("Leaf index out of range")
        return self._leaf_hashes[index]

    def root_hash(self) -> bytes:
        """Compute current Merkle Tree Hash root."""
        return compute_mth_from_hashes(self._leaf_hashes)

    def root_hex(self) -> str:
        """Compute current Merkle Tree root as hex string."""
        return self.root_hash().hex()

    def consistency_proof(self, old_size: int) -> List[str]:
        """
        Generate RFC 9162 consistency proof between old_size and current tree_size.
        Returns list of hex strings.
        """
        n = len(self._leaf_hashes)
        if old_size == 0 or old_size == n:
            return []
        if old_size > n or old_size < 0:
            raise ValueError("Invalid old tree size for consistency proof")

        k = 1 << ((n - 1).bit_length() - 1)
        if old_size <= k:
            proof_bytes = generate_subproof(old_size, self._leaf_hashes[:k], True) + [
                compute_mth_from_hashes(self._leaf_hashes[k:])
            ]
        else:
            proof_bytes = generate_subproof(old_size - k, self._leaf_hashes[k:], False) + [
                compute_mth_from_hashes(self._leaf_hashes[:k])
            ]

        return [h.hex() for h in proof_bytes]

    def inclusion_proof(self, leaf_index: int) -> List[str]:
        """
        Generate RFC 9162 inclusion proof for leaf at leaf_index.
        Returns list of hex strings.
        """
        n = len(self._leaf_hashes)
        if leaf_index < 0 or leaf_index >= n:
            raise IndexError("Leaf index out of bounds for inclusion proof")

        def sub_inclusion(idx: int, hashes: Sequence[bytes]) -> List[bytes]:
            sz = len(hashes)
            if sz == 1:
                return []
            k_val = 1 << ((sz - 1).bit_length() - 1)
            if idx < k_val:
                return sub_inclusion(idx, hashes[:k_val]) + [compute_mth_from_hashes(hashes[k_val:])]
            else:
                return sub_inclusion(idx - k_val, hashes[k_val:]) + [compute_mth_from_hashes(hashes[:k_val])]

        raw_proof = sub_inclusion(leaf_index, self._leaf_hashes)
        return [h.hex() for h in raw_proof]

    @staticmethod
    def verify_consistency(
        old_size: int,
        new_size: int,
        old_root_bytes: bytes,
        new_root_bytes: bytes,
        proof_hashes: Sequence[bytes],
    ) -> bool:
        """
        Verify RFC 9162 consistency proof between old and new trees.
        """
        if old_size == new_size:
            return len(proof_hashes) == 0 and old_root_bytes == new_root_bytes
        if old_size == 0:
            return len(proof_hashes) == 0
        if old_size > new_size or len(proof_hashes) == 0:
            return False

        is_pow2 = (old_size & (old_size - 1)) == 0
        p = list(proof_hashes)
        if is_pow2:
            p = [old_root_bytes] + p

        node = p[0]
        last_node = p[0]
        fn = old_size - 1
        sn = new_size - 1

        while fn & 1:
            fn >>= 1
            sn >>= 1

        p_idx = 1
        while sn > 0:
            if fn & 1:
                if p_idx >= len(p):
                    return False
                node = hash_internal_node(p[p_idx], node)
                last_node = hash_internal_node(p[p_idx], last_node)
                p_idx += 1
            elif fn < sn:
                if p_idx >= len(p):
                    return False
                node = hash_internal_node(node, p[p_idx])
                p_idx += 1
            fn >>= 1
            sn >>= 1

        return node == new_root_bytes and last_node == old_root_bytes and p_idx == len(p)

    @staticmethod
    def verify_inclusion(
        leaf_index: int,
        tree_size: int,
        leaf_hash_bytes: bytes,
        expected_root_bytes: bytes,
        proof_hashes: Sequence[bytes],
    ) -> bool:
        """
        Verify RFC 9162 inclusion proof for leaf_index in tree of size tree_size.
        """
        if leaf_index < 0 or leaf_index >= tree_size:
            return False
        if tree_size == 1:
            return len(proof_hashes) == 0 and leaf_hash_bytes == expected_root_bytes

        def verify_rec(idx: int, sz: int, current_hash: bytes, proof: Sequence[bytes]) -> bytes:
            if sz == 1:
                return current_hash
            k_val = 1 << ((sz - 1).bit_length() - 1)
            sibling = proof[-1]
            rem = proof[:-1]
            if idx < k_val:
                left = verify_rec(idx, k_val, current_hash, rem)
                return hash_internal_node(left, sibling)
            else:
                right = verify_rec(idx - k_val, sz - k_val, current_hash, rem)
                return hash_internal_node(sibling, right)

        try:
            computed_root = verify_rec(leaf_index, tree_size, leaf_hash_bytes, proof_hashes)
            return computed_root == expected_root_bytes
        except Exception:
            return False
