"""
Unit tests for cryptographic primitives and RFC 9162 Merkle tree logic.
Validates:
* RFC 8785 canonical JSON formatting and key sorting
* RFC 9162 leaf and node hashing
* Merkle Tree Hash calculations
* Consistency proof generation and verification across multiple tree sizes
* Negative consistency proof checks with corrupted proofs
* Ed25519 signature signing, verification, and key serialization
* Witness acknowledgement signature payload binding
"""

import hashlib
import pytest
from witness.canonical import canonical_json_bytes, canonical_json_str, CanonicalJsonError
from witness.crypto import (
    KeyManager,
    leaf_hash,
    node_hash,
    merkle_tree_hash,
    generate_consistency_proof,
    verify_consistency_proof,
    compute_witness_binding,
    verify_ed25519_signature,
    verify_writer_signature,
    sha256_hex
)


def test_canonical_json_sorting_and_formatting():
    """Verify RFC 8785 canonical JSON sorts keys and eliminates whitespace."""
    payload = {
        "zeta": 1,
        "alpha": 2,
        "nested": {
            "beta": "test",
            "aardvark": True,
            "empty": None
        }
    }
    canonical = canonical_json_str(payload)
    expected = '{"alpha":2,"nested":{"aardvark":true,"beta":"test","empty":null},"zeta":1}'
    assert canonical == expected


def test_canonical_json_rejection_of_floats():
    """Verify RFC 8785 canonical serializer rejects floats as mandated."""
    with pytest.raises(CanonicalJsonError):
        canonical_json_bytes({"invalid_float": 3.14159})


def test_rfc9162_leaf_and_node_domain_separation():
    """Verify RFC 9162 prefix separation between leaves (0x00) and nodes (0x01)."""
    data = b"vote_data"
    l_hash = leaf_hash(data)
    expected_leaf = hashlib.sha256(b"\x00" + data).digest()
    assert l_hash == expected_leaf

    left = hashlib.sha256(b"left").digest()
    right = hashlib.sha256(b"right").digest()
    n_hash = node_hash(left, right)
    expected_node = hashlib.sha256(b"\x01" + left + right).digest()
    assert n_hash == expected_node


def test_rfc9162_merkle_tree_hash_empty_and_single():
    """Verify MTH calculation for empty tree and single leaf."""
    empty_root = merkle_tree_hash([])
    assert empty_root == hashlib.sha256(b"").digest()

    leaf1 = leaf_hash(b"leaf1")
    single_root = merkle_tree_hash([leaf1])
    assert single_root == leaf1


def test_rfc9162_consistency_proofs_comprehensive():
    """
    Test RFC 9162 consistency proof generation and verification
    for all tree sizes up to 20 leaves.
    """
    raw_leaves = [f"leaf_record_{i}".encode("utf-8") for i in range(25)]
    leaf_hashes = [leaf_hash(l) for l in raw_leaves]

    for second_size in range(1, 20):
        second_root = merkle_tree_hash(leaf_hashes[:second_size])

        for first_size in range(1, second_size + 1):
            first_root = merkle_tree_hash(leaf_hashes[:first_size])
            proof = generate_consistency_proof(first_size, leaf_hashes[:second_size])

            # Verification must pass for legitimate proofs
            is_valid = verify_consistency_proof(
                first_size=first_size,
                second_size=second_size,
                first_root=first_root,
                second_root=second_root,
                consistency_path=proof
            )
            assert is_valid, f"Consistency proof failed for {first_size} to {second_size}"


def test_rfc9162_consistency_proof_rejection_of_corrupted_proof():
    """Verify verification fails when consistency proof hashes are altered."""
    raw_leaves = [f"leaf_record_{i}".encode("utf-8") for i in range(10)]
    leaf_hashes = [leaf_hash(l) for l in raw_leaves]

    first_size = 4
    second_size = 8
    first_root = merkle_tree_hash(leaf_hashes[:first_size])
    second_root = merkle_tree_hash(leaf_hashes[:second_size])
    proof = generate_consistency_proof(first_size, leaf_hashes[:second_size])
    assert len(proof) > 0

    # Corrupt a hash in the proof
    corrupted_proof = list(proof)
    corrupted_proof[0] = hashlib.sha256(b"corrupted").digest()

    is_valid = verify_consistency_proof(
        first_size=first_size,
        second_size=second_size,
        first_root=first_root,
        second_root=second_root,
        consistency_path=corrupted_proof
    )
    assert not is_valid


def test_rfc9162_consistency_proof_rejection_of_mismatched_roots():
    """Verify verification fails when roots do not match tree state."""
    raw_leaves = [f"leaf_{i}".encode("utf-8") for i in range(6)]
    leaf_hashes = [leaf_hash(l) for l in raw_leaves]

    first_root = merkle_tree_hash(leaf_hashes[:3])
    second_root = merkle_tree_hash(leaf_hashes[:6])
    wrong_root = hashlib.sha256(b"wrong").digest()
    proof = generate_consistency_proof(3, leaf_hashes[:6])

    assert not verify_consistency_proof(3, 6, wrong_root, second_root, proof)
    assert not verify_consistency_proof(3, 6, first_root, wrong_root, proof)


def test_ed25519_key_management_and_signatures():
    """Verify Ed25519 key generation, serialization, signing, and verification."""
    km = KeyManager()
    pub_hex = km.get_public_hex()
    priv_hex = km.get_private_hex()

    assert len(pub_hex) == 64
    assert len(priv_hex) == 64

    # Reload from private hex
    reloaded_km = KeyManager.from_hex(priv_hex)
    assert reloaded_km.get_public_hex() == pub_hex

    message = b"checkpoint_canonical_bytes_himvote"
    signature_hex = km.sign_hex(message)
    assert len(signature_hex) == 128

    # Verify signature
    assert verify_ed25519_signature(pub_hex, signature_hex, message)

    # Forged signature verification must fail
    forged_message = b"tampered_checkpoint_bytes"
    assert not verify_ed25519_signature(pub_hex, signature_hex, forged_message)

    # Corrupted signature bytes must fail
    corrupted_sig = "00" * 64
    assert not verify_ed25519_signature(pub_hex, corrupted_sig, message)


def test_witness_signature_binding():
    """Verify Section 5.4 witness signature binding."""
    election_id = "election_institutional_2026"
    prev_seq = 4
    checkpoint_bytes = b'{"tree_size":100}'

    binding = compute_witness_binding(election_id, prev_seq, checkpoint_bytes)
    assert election_id.encode("utf-8") in binding
    assert str(prev_seq).encode("utf-8") in binding
    assert checkpoint_bytes in binding

    km = KeyManager()
    sig = km.sign_witness_ack(election_id, prev_seq, checkpoint_bytes)
    assert verify_ed25519_signature(km.get_public_hex(), sig, binding)


def test_writer_signature_verification():
    """Verify writer signature verification accepts valid signature and rejects forged."""
    writer_km = KeyManager()
    writer_pub = writer_km.get_public_hex()
    checkpoint_bytes = b'{"election_id":"elec_1","tree_size":5}'

    # Valid signature
    sig = writer_km.sign_hex(checkpoint_bytes)
    assert verify_writer_signature(writer_pub, sig, checkpoint_bytes)

    # Signature by another writer (forged)
    impostor_km = KeyManager()
    impostor_sig = impostor_km.sign_hex(checkpoint_bytes)
    assert not verify_writer_signature(writer_pub, impostor_sig, checkpoint_bytes)

    # Tampered message
    tampered_bytes = b'{"election_id":"elec_1","tree_size":6}'
    assert not verify_writer_signature(writer_pub, sig, tampered_bytes)
