"""Unit tests for RFC 9162 Merkle tree recomputation and inclusion proofs."""

from pathlib import Path
import hashlib
import json
import sys
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    ArchiveError,
    ElectionArchive,
    MerkleProofError,
    canonicalize_json,
    compute_rfc9162_merkle_root,
    format_digest,
    generate_rfc9162_inclusion_proof,
    normalize_digest,
    sha256_digest,
    sha256_hex,
    verify_rfc9162_inclusion_proof,
)


def test_canonicalize_json_basic_types() -> None:
    assert canonicalize_json(None) == b"null"
    assert canonicalize_json(True) == b"true"
    assert canonicalize_json(False) == b"false"
    assert canonicalize_json(123) == b"123"
    assert canonicalize_json("HimVote") == b'"HimVote"'
    assert canonicalize_json([]) == b"[]"
    assert canonicalize_json([1, 2, 3]) == b"[1,2,3]"


def test_canonicalize_json_sorts_keys_by_utf16_code_units() -> None:
    data = {"zebra": 1, "alpha": 2, "beta": {"nested_z": 9, "nested_a": 8}}
    canonical = canonicalize_json(data)
    assert canonical == b'{"alpha":2,"beta":{"nested_a":8,"nested_z":9},"zebra":1}'


def test_canonicalize_json_strictly_rejects_floats() -> None:
    with pytest.raises(ArchiveError, match="Floats are not permitted"):
        canonicalize_json({"count": 12.34})


def test_compute_rfc9162_merkle_root_empty() -> None:
    root = compute_rfc9162_merkle_root([])
    assert root == hashlib.sha256(b"").digest()


def test_compute_rfc9162_merkle_root_single_leaf() -> None:
    leaf = b"leaf_payload"
    root = compute_rfc9162_merkle_root([leaf])
    expected = hashlib.sha256(b"\x00" + leaf).digest()
    assert root == expected


def test_compute_rfc9162_merkle_root_two_leaves() -> None:
    leaf0 = b"leaf_zero"
    leaf1 = b"leaf_one"
    root = compute_rfc9162_merkle_root([leaf0, leaf1])
    h0 = hashlib.sha256(b"\x00" + leaf0).digest()
    h1 = hashlib.sha256(b"\x00" + leaf1).digest()
    expected = hashlib.sha256(b"\x01" + h0 + h1).digest()
    assert root == expected


@pytest.mark.parametrize("tree_size", [1, 2, 3, 4, 7, 8, 15, 16, 25, 42])
def test_rfc9162_inclusion_proofs_verify_for_all_leaves(tree_size: int) -> None:
    leaves = [f"leaf_record_{i}".encode("utf_8") for i in range(tree_size)]
    root = compute_rfc9162_merkle_root(leaves)

    for idx in range(tree_size):
        proof = generate_rfc9162_inclusion_proof(leaves, idx)
        is_valid = verify_rfc9162_inclusion_proof(leaves[idx], proof, root)
        assert is_valid is True


def test_rfc9162_inclusion_proof_rejects_tampered_leaf() -> None:
    leaves = [b"record_0", b"record_1", b"record_2", b"record_3"]
    root = compute_rfc9162_merkle_root(leaves)
    proof = generate_rfc9162_inclusion_proof(leaves, 1)

    # Tampered leaf content
    tampered_leaf = b"record_tampered"
    assert verify_rfc9162_inclusion_proof(tampered_leaf, proof, root) is False


def test_rfc9162_inclusion_proof_rejects_tampered_sibling() -> None:
    leaves = [b"record_0", b"record_1", b"record_2", b"record_3"]
    root = compute_rfc9162_merkle_root(leaves)
    proof = generate_rfc9162_inclusion_proof(leaves, 2)

    # Corrupt one sibling
    tampered_proof = [(side, b"\xff" * 32) for side, _ in proof]
    assert verify_rfc9162_inclusion_proof(leaves[2], tampered_proof, root) is False


def test_inclusion_proof_out_of_bounds_raises_error() -> None:
    leaves = [b"a", b"b"]
    with pytest.raises(MerkleProofError):
        generate_rfc9162_inclusion_proof(leaves, 2)
    with pytest.raises(MerkleProofError):
        generate_rfc9162_inclusion_proof(leaves, -1)


def test_simulation_data_merkle_recomputation_matches_witness() -> None:
    simulation_export = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not simulation_export.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    archive = ElectionArchive.load(simulation_export)
    recomputed_root, matches_witness = archive.recompute_merkle_root()
    assert matches_witness is True
    if archive.witness_final:
        expected_root = archive.witness_final.get("checkpoint", {}).get("merkle_root")
        if expected_root:
            assert recomputed_root.lower() == expected_root.lower()

    last_digest = archive.get_last_leaf_digest()
    if archive.witness_final:
        expected_last = archive.witness_final.get("checkpoint", {}).get("last_leaf_digest")
        if expected_last:
            assert last_digest.lower() == expected_last.lower()

    # Test inclusion proofs for first, middle, and last leaves
    for test_idx in (0, 49, 99):
        proof_res = archive.get_leaf_proof(test_idx)
        assert proof_res.verified is True
        assert proof_res.path_length > 0
        assert proof_res.root_hex == recomputed_root

    # Leaf 0 has depth 7 in 64 leaf left subtree
    assert archive.get_leaf_proof(0).path_length == 7
    # Leaf 99 has depth 4 in 36 leaf right subtree
    assert archive.get_leaf_proof(99).path_length == 4

    archive.close()
