"""Unit tests for RFC 9162 Merkle Tree and Proof Computation."""

import hashlib
import pytest
from himvote_crypto.exceptions import MerkleError
from himvote_crypto.merkle import (
    MerkleTree,
    consistency_proof,
    empty_tree_hash,
    inclusion_proof,
    leaf_hash,
    merkle_tree_hash,
    node_hash,
    verify_consistency,
    verify_inclusion,
)


def test_merkle_prefixes_and_empty():
    """Verify domain separation prefixes and empty tree hash."""
    assert empty_tree_hash() == hashlib.sha256(b"").digest()

    raw_leaf = b"ballot_sample"
    expected_leaf_hash = hashlib.sha256(b"\x00" + raw_leaf).digest()
    assert leaf_hash(raw_leaf) == expected_leaf_hash

    left = hashlib.sha256(b"left").digest()
    right = hashlib.sha256(b"right").digest()
    expected_node_hash = hashlib.sha256(b"\x01" + left + right).digest()
    assert node_hash(left, right) == expected_node_hash


def test_merkle_rfc9162_seven_leaves():
    """Verify RFC 9162 Section 2.1.5 7 leaf binary tree example."""
    leaves = [f"leaf_input_{i}".encode("ascii") for i in range(7)]
    tree = MerkleTree(leaves)
    assert tree.size == 7
    root = tree.root_hash()
    assert len(root) == 32

    # Test inclusion proofs for all 7 leaves
    for i in range(7):
        proof = tree.inclusion_proof(i)
        assert tree.verify_leaf_inclusion(i, proof)
        assert verify_inclusion(i, 7, tree.get_leaf_hash(i), proof, root)

    # Test consistency proofs for all sub sizes from 1 up to 6
    for m in range(1, 7):
        old_root = merkle_tree_hash(leaves[:m])
        c_proof = tree.consistency_proof(m)
        assert verify_consistency(m, 7, old_root, root, c_proof)


def test_merkle_inclusion_negative_cases():
    """Verify inclusion verification rejects invalid inputs and tampered proofs."""
    leaves = [b"leaf_0", b"leaf_1", b"leaf_2", b"leaf_3"]
    root = merkle_tree_hash(leaves)
    proof = inclusion_proof(1, leaves)
    lh = leaf_hash(leaves[1])

    # Valid case
    assert verify_inclusion(1, 4, lh, proof, root)

    # Tampered leaf hash
    tampered_lh = leaf_hash(b"tampered")
    assert not verify_inclusion(1, 4, tampered_lh, proof, root)

    # Wrong leaf index
    assert not verify_inclusion(2, 4, lh, proof, root)

    # Index out of bounds
    assert not verify_inclusion(4, 4, lh, proof, root)
    assert not verify_inclusion(-1, 4, lh, proof, root)

    # Tampered proof node
    tampered_proof = [b"x" * 32] + proof[1:]
    assert not verify_inclusion(1, 4, lh, tampered_proof, root)

    # Tampered root hash
    assert not verify_inclusion(1, 4, lh, proof, b"y" * 32)


def test_merkle_consistency_negative_cases():
    """Verify consistency verification rejects invalid or forged proofs."""
    leaves = [b"leaf_" + str(i).encode() for i in range(8)]
    first_size = 4
    second_size = 8
    first_root = merkle_tree_hash(leaves[:first_size])
    second_root = merkle_tree_hash(leaves)

    proof = consistency_proof(first_size, leaves)
    assert verify_consistency(first_size, second_size, first_root, second_root, proof)

    # Wrong first root
    assert not verify_consistency(first_size, second_size, b"z" * 32, second_root, proof)

    # Wrong second root
    assert not verify_consistency(first_size, second_size, first_root, b"z" * 32, proof)

    # First size greater than second size
    assert not verify_consistency(second_size, first_size, second_root, first_root, proof)

    # Empty proof when first_size < second_size
    assert not verify_consistency(first_size, second_size, first_root, second_root, [])

    # Tampered proof hash
    bad_proof = [b"w" * 32] + proof[1:]
    assert not verify_consistency(first_size, second_size, first_root, second_root, bad_proof)


def test_merkle_single_leaf_tree():
    """Verify tree behavior with a single leaf."""
    leaves = [b"lone_leaf"]
    root = merkle_tree_hash(leaves)
    assert root == leaf_hash(b"lone_leaf")

    proof = inclusion_proof(0, leaves)
    assert proof == []
    assert verify_inclusion(0, 1, root, proof, root)


def test_merkle_large_tree():
    """Verify inclusion and consistency on larger tree size 65."""
    leaves = [f"large_leaf_{i}".encode() for i in range(65)]
    tree = MerkleTree(leaves)
    assert tree.size == 65
    root = tree.root_hash()

    # Test boundary leaves
    for idx in [0, 31, 32, 63, 64]:
        p = tree.inclusion_proof(idx)
        assert tree.verify_leaf_inclusion(idx, p)

    # Test consistency
    for prev_sz in [1, 32, 64]:
        prev_root = merkle_tree_hash(leaves[:prev_sz])
        cp = tree.consistency_proof(prev_sz)
        assert verify_consistency(prev_sz, 65, prev_root, root, cp)
