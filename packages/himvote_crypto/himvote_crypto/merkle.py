"""RFC 9162 binary Merkle Tree and cryptographic proof computation.

Implements the log auditing primitives defined in RFC 9162:
* Leaf hash: SHA256(0x00 || leaf_bytes)
* Node hash: SHA256(0x01 || left_hash || right_hash)
* Merkle tree hash MTH for arbitrary non empty and empty trees
* Audit path generation and verification for inclusion proofs
* Consistency proof generation and verification between tree versions
"""

import hashlib
from typing import List, Optional, Sequence

from himvote_crypto.exceptions import (
    ConsistencyProofError,
    InclusionProofError,
    MerkleError,
)

LEAF_PREFIX = b"\x00"
NODE_PREFIX = b"\x01"


def leaf_hash(leaf_bytes: bytes) -> bytes:
    """Compute the RFC 9162 leaf hash: SHA256(0x00 || leaf_bytes)."""
    return hashlib.sha256(LEAF_PREFIX + leaf_bytes).digest()


def node_hash(left_hash: bytes, right_hash: bytes) -> bytes:
    """Compute the RFC 9162 interior node hash: SHA256(0x01 || left || right)."""
    return hashlib.sha256(NODE_PREFIX + left_hash + right_hash).digest()


def empty_tree_hash() -> bytes:
    """Compute the hash of an empty tree: SHA256(b'')."""
    return hashlib.sha256(b"").digest()


def largest_power_of_2_less_than(n: int) -> int:
    """Find the largest power of two strictly smaller than n for n greater than 1."""
    if n <= 1:
        raise ValueError(f"n must be greater than 1, got {n}")
    k = 1
    while k * 2 < n:
        k *= 2
    return k


def merkle_tree_hash(leaves: Sequence[bytes]) -> bytes:
    """Calculate the Merkle Tree Hash (MTH) for an ordered list of leaf byte entries.

    Follows RFC 9162 Section 2.1.1 definition:
    * MTH({}) = HASH()
    * MTH({d0}) = HASH(0x00 || d0)
    * MTH(D_n) = HASH(0x01 || MTH(D[0:k]) || MTH(D[k:n])) where k is largest power of 2 less than n.
    """
    n = len(leaves)
    if n == 0:
        return empty_tree_hash()
    if n == 1:
        return leaf_hash(leaves[0])

    k = largest_power_of_2_less_than(n)
    left_mth = merkle_tree_hash(leaves[:k])
    right_mth = merkle_tree_hash(leaves[k:])
    return node_hash(left_mth, right_mth)


def merkle_tree_hash_from_hashes(leaf_hashes: Sequence[bytes]) -> bytes:
    """Calculate the Merkle Tree Hash from precalculated leaf hashes."""
    n = len(leaf_hashes)
    if n == 0:
        return empty_tree_hash()
    if n == 1:
        return leaf_hashes[0]

    k = largest_power_of_2_less_than(n)
    left_mth = merkle_tree_hash_from_hashes(leaf_hashes[:k])
    right_mth = merkle_tree_hash_from_hashes(leaf_hashes[k:])
    return node_hash(left_mth, right_mth)


def inclusion_proof(leaf_index: int, leaves: Sequence[bytes]) -> List[bytes]:
    """Generate the RFC 9162 Merkle inclusion proof PATH(m, D_n) for the leaf at leaf_index.

    Parameters:
        leaf_index: Zero indexed position m of the leaf, where 0 <= m < len(leaves).
        leaves: Sequence of raw leaf byte entries.

    Returns:
        List of intermediate hashes forming the inclusion path to the root.
    """
    n = len(leaves)
    if not (0 <= leaf_index < n):
        raise MerkleError(
            f"leaf_index {leaf_index} out of bounds for tree size {n}"
        )
    if n == 1:
        return []

    k = largest_power_of_2_less_than(n)
    if leaf_index < k:
        return inclusion_proof(leaf_index, leaves[:k]) + [
            merkle_tree_hash(leaves[k:])
        ]
    else:
        return inclusion_proof(leaf_index - k, leaves[k:]) + [
            merkle_tree_hash(leaves[:k])
        ]


def verify_inclusion(
    leaf_index: int,
    tree_size: int,
    target_leaf_hash: bytes,
    proof: Sequence[bytes],
    root_hash: bytes,
) -> bool:
    """Verify an inclusion proof per RFC 9162 Section 2.1.3.2.

    Parameters:
        leaf_index: Zero indexed leaf location.
        tree_size: Total count of leaves in the tree instance.
        target_leaf_hash: Precomputed leaf hash SHA256(0x00 || leaf_bytes).
        proof: Sequence of hashes in the inclusion path.
        root_hash: Expected Merkle tree root hash.

    Returns:
        True if the proof is valid and reconstructs root_hash, False otherwise.
    """
    if leaf_index < 0 or leaf_index >= tree_size:
        return False

    if tree_size == 1:
        return len(proof) == 0 and target_leaf_hash == root_hash

    fn = leaf_index
    sn = tree_size - 1
    r = target_leaf_hash

    for p in proof:
        if sn == 0:
            return False
        if (fn & 1) == 1 or fn == sn:
            r = node_hash(p, r)
            if (fn & 1) == 0:
                while (fn & 1) == 0 and fn > 0:
                    fn >>= 1
                    sn >>= 1
        else:
            r = node_hash(r, p)
        fn >>= 1
        sn >>= 1

    return sn == 0 and r == root_hash


def _subproof(m: int, leaves: Sequence[bytes], b: bool) -> List[bytes]:
    """Helper recursive function SUBPROOF per RFC 9162 Section 2.1.4.1."""
    n = len(leaves)
    if m == n:
        if b:
            return []
        return [merkle_tree_hash(leaves)]

    k = largest_power_of_2_less_than(n)
    if m <= k:
        return _subproof(m, leaves[:k], b) + [merkle_tree_hash(leaves[k:])]
    else:
        return _subproof(m - k, leaves[k:], False) + [
            merkle_tree_hash(leaves[:k])
        ]


def consistency_proof(
    first_size: int,
    leaves: Sequence[bytes],
) -> List[bytes]:
    """Generate the RFC 9162 Merkle consistency proof PROOF(m, D_n).

    Parameters:
        first_size: Leaf count m of the earlier snapshot (0 < m <= len(leaves)).
        leaves: Complete sequence of leaf byte entries up to the newer size n.

    Returns:
        List of hashes establishing append only consistency between the snapshots.
    """
    n = len(leaves)
    if first_size <= 0 or first_size > n:
        raise MerkleError(
            f"first_size {first_size} must satisfy 0 < first_size <= {n}"
        )
    if first_size == n:
        return []
    return _subproof(first_size, leaves, True)


def verify_consistency(
    first_size: int,
    second_size: int,
    first_root: bytes,
    second_root: bytes,
    proof: Sequence[bytes],
) -> bool:
    """Verify consistency between two tree snapshots per RFC 9162 Section 2.1.4.2.

    Parameters:
        first_size: Leaf count of the earlier tree head.
        second_size: Leaf count of the later tree head.
        first_root: Merkle root hash of the earlier tree head.
        second_root: Merkle root hash of the later tree head.
        proof: Sequence of hashes in the consistency path.

    Returns:
        True if the earlier tree is a proven append only prefix of the later tree.
    """
    if first_size == second_size:
        return first_root == second_root and len(proof) == 0

    if first_size <= 0 or first_size > second_size:
        return False

    if len(proof) == 0:
        return False

    path = list(proof)
    if (first_size & (first_size - 1)) == 0:
        path = [first_root] + path

    fn = first_size - 1
    sn = second_size - 1

    while (fn & 1) == 1:
        fn >>= 1
        sn >>= 1

    fr = path[0]
    sr = path[0]

    for c in path[1:]:
        if sn == 0:
            return False
        if (fn & 1) == 1 or fn == sn:
            fr = node_hash(c, fr)
            sr = node_hash(c, sr)
            if (fn & 1) == 0:
                while (fn & 1) == 0 and fn > 0:
                    fn >>= 1
                    sn >>= 1
        else:
            sr = node_hash(sr, c)
        fn >>= 1
        sn >>= 1

    return fr == first_root and sr == second_root and sn == 0


class MerkleTree:
    """In memory stateful RFC 9162 binary Merkle Tree."""

    def __init__(self, initial_leaves: Optional[Sequence[bytes]] = None) -> None:
        self._leaves: List[bytes] = []
        self._leaf_hashes: List[bytes] = []
        if initial_leaves:
            self.extend(initial_leaves)

    @property
    def size(self) -> int:
        """Current number of leaves in the tree."""
        return len(self._leaves)

    def append(self, leaf_bytes: bytes) -> int:
        """Append a leaf entry and return its assigned leaf index."""
        idx = len(self._leaves)
        self._leaves.append(leaf_bytes)
        self._leaf_hashes.append(leaf_hash(leaf_bytes))
        return idx

    def extend(self, leaves: Sequence[bytes]) -> None:
        """Append multiple leaf entries in order."""
        for leaf in leaves:
            self.append(leaf)

    def root_hash(self) -> bytes:
        """Compute the current Merkle tree root hash."""
        return merkle_tree_hash(self._leaves)

    def root_hash_hex(self) -> str:
        """Compute the current Merkle tree root hash as hexadecimal string."""
        return self.root_hash().hex()

    def get_leaf(self, index: int) -> bytes:
        """Retrieve the raw bytes for the leaf at index."""
        return self._leaves[index]

    def get_leaf_hash(self, index: int) -> bytes:
        """Retrieve the precalculated leaf hash for index."""
        return self._leaf_hashes[index]

    def inclusion_proof(self, index: int) -> List[bytes]:
        """Generate inclusion proof for the leaf at index."""
        return inclusion_proof(index, self._leaves)

    def consistency_proof(self, previous_size: int) -> List[bytes]:
        """Generate consistency proof relative to an earlier tree size."""
        return consistency_proof(previous_size, self._leaves)

    def verify_leaf_inclusion(
        self,
        index: int,
        proof: Sequence[bytes],
        expected_root: Optional[bytes] = None,
    ) -> bool:
        """Verify inclusion proof for a leaf in this tree."""
        root = expected_root if expected_root is not None else self.root_hash()
        lh = self.get_leaf_hash(index)
        return verify_inclusion(index, self.size, lh, proof, root)
