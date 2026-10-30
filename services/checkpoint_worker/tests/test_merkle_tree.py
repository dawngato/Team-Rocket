"""
Unit tests for RFC 9162 Merkle tree implementation.
"""

import hashlib
import pytest
from checkpoint_worker.crypto.merkle_tree import (
    RFC9162MerkleTree,
    compute_leaf_hash,
    EMPTY_TREE_HASH,
)


def test_empty_tree():
    """
    Empty tree root hash must equal SHA256 of empty byte string.
    """
    tree = RFC9162MerkleTree()
    assert tree.tree_size == 0
    assert tree.root_hash() == EMPTY_TREE_HASH
    assert tree.root_hex() == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


def test_single_leaf_tree():
    """
    Single leaf tree root must equal SHA256 with 0x00 prefix.
    """
    tree = RFC9162MerkleTree()
    leaf_payload = b"ballot_sample_0"
    tree.append_leaf_bytes(leaf_payload)
    assert tree.tree_size == 1

    expected_hash = hashlib.sha256(b"\x00" + leaf_payload).digest()
    assert tree.root_hash() == expected_hash
    assert tree.get_leaf_hash(0) == expected_hash


def test_consistency_proof_verification():
    """
    Verify RFC 9162 consistency proofs for trees of varying sizes.
    """
    tree = RFC9162MerkleTree()
    roots_by_size = {}

    for i in range(1, 16):
        tree.append_leaf_bytes(f"leaf_payload_{i}".encode("utf-8"))
        roots_by_size[i] = tree.root_hash()

    for old_size in range(1, 16):
        for new_size in range(old_size, 16):
            sub_tree = RFC9162MerkleTree([tree.get_leaf_hash(j) for j in range(new_size)])
            proof_hex = sub_tree.consistency_proof(old_size)
            proof_bytes = [bytes.fromhex(h) for h in proof_hex]

            is_valid = RFC9162MerkleTree.verify_consistency(
                old_size=old_size,
                new_size=new_size,
                old_root_bytes=roots_by_size[old_size],
                new_root_bytes=roots_by_size[new_size],
                proof_hashes=proof_bytes,
            )
            assert is_valid, f"Consistency proof failed for old_size {old_size} new_size {new_size}"


def test_inclusion_proof_verification():
    """
    Verify RFC 9162 inclusion proofs for every leaf across trees of size 1 to 12.
    """
    for size in range(1, 13):
        tree = RFC9162MerkleTree()
        for idx in range(size):
            tree.append_leaf_bytes(f"inclusion_test_leaf_{idx}".encode("utf-8"))

        root = tree.root_hash()
        for idx in range(size):
            leaf_h = tree.get_leaf_hash(idx)
            proof_hex = tree.inclusion_proof(idx)
            proof_bytes = [bytes.fromhex(h) for h in proof_hex]

            is_valid = RFC9162MerkleTree.verify_inclusion(
                leaf_index=idx,
                tree_size=size,
                leaf_hash_bytes=leaf_h,
                expected_root_bytes=root,
                proof_hashes=proof_bytes,
            )
            assert is_valid, f"Inclusion proof failed for size {size} leaf index {idx}"


def test_consistency_proof_tamper_rejection():
    """
    Tampered consistency proofs must be rejected.
    """
    tree = RFC9162MerkleTree()
    for i in range(8):
        tree.append_leaf_bytes(f"payload_{i}".encode("utf-8"))

    old_root = RFC9162MerkleTree([tree.get_leaf_hash(j) for j in range(4)]).root_hash()
    new_root = tree.root_hash()
    proof_hex = tree.consistency_proof(4)
    proof_bytes = [bytes.fromhex(h) for h in proof_hex]

    tampered_proof = [b"x" * 32] + proof_bytes[1:]
    assert not RFC9162MerkleTree.verify_consistency(
        old_size=4,
        new_size=8,
        old_root_bytes=old_root,
        new_root_bytes=new_root,
        proof_hashes=tampered_proof,
    )


def test_merkle_tree_boundary_checks():
    """
    Test edge conditions and error boundaries.
    """
    tree = RFC9162MerkleTree()
    with pytest.raises(ValueError, match="exactly 32 bytes"):
        tree.append_leaf_hash(b"short")

    with pytest.raises(IndexError, match="out of range"):
        tree.get_leaf_hash(0)

    tree.append_leaf_bytes(b"entry")
    with pytest.raises(ValueError, match="Invalid old tree size"):
        tree.consistency_proof(5)

    with pytest.raises(IndexError, match="out of bounds"):
        tree.inclusion_proof(10)

    # Verification helper boundaries
    assert RFC9162MerkleTree.verify_consistency(5, 5, b"root", b"root", []) is True
    assert RFC9162MerkleTree.verify_consistency(0, 5, b"root", b"root", []) is True
    assert RFC9162MerkleTree.verify_consistency(6, 5, b"root", b"root", []) is False
    assert RFC9162MerkleTree.verify_consistency(2, 5, b"root", b"root", []) is False

    # Inclusion verification boundaries
    assert RFC9162MerkleTree.verify_inclusion(-1, 5, b"leaf", b"root", []) is False
    assert RFC9162MerkleTree.verify_inclusion(0, 1, b"leaf", b"leaf", []) is True
    assert RFC9162MerkleTree.verify_inclusion(0, 1, b"leaf", b"other", []) is False

