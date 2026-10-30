"""Cryptographic unit tests for HimVote Profile VEEM primitives."""

import secrets
import pytest

from ..constants import G, P, Q
from ..crypto import (
    DLEQProof,
    DisjunctiveProof,
    ElGamalCiphertext,
    MerkleTree,
    SumProof,
    TrusteeKeyPair,
    canonical_json,
    is_in_subgroup,
    prove_disjunctive,
    prove_dleq,
    prove_sum,
    solve_discrete_log,
    verify_disjunctive,
    verify_dleq,
    verify_sum,
)


def test_subgroup_membership() -> None:
    """Verify subgroup checks for generator and elements."""
    assert is_in_subgroup(G) is True
    assert is_in_subgroup(1) is False
    assert is_in_subgroup(P) is False
    assert is_in_subgroup(P + 1) is False
    assert is_in_subgroup(G + 1) is False


def test_elgamal_homomorphic_multiplication() -> None:
    """Verify exponential ElGamal additive homomorphism through multiplication."""
    s = secrets.randbelow(Q - 1) + 1
    h = pow(G, s, P)

    # Encrypt 2 and 3
    r1 = secrets.randbelow(Q - 1) + 1
    r2 = secrets.randbelow(Q - 1) + 1
    ct1 = ElGamalCiphertext(a=pow(G, r1, P), b=(pow(h, r1, P) * pow(G, 2, P)) % P)
    ct2 = ElGamalCiphertext(a=pow(G, r2, P), b=(pow(h, r2, P) * pow(G, 3, P)) % P)

    ct_sum = ct1.multiply(ct2)
    decryption_factor = pow(ct_sum.a, s, P)
    plaintext_element = (ct_sum.b * pow(decryption_factor, -1, P)) % P

    assert plaintext_element == pow(G, 5, P)


def test_disjunctive_proof_for_zero_and_one() -> None:
    """Verify Cramer Damgard Schoenmakers proof generation and validation."""
    s = secrets.randbelow(Q - 1) + 1
    h = pow(G, s, P)
    manifest_digest = "manifest_test_hash"
    election_id = "election_test_id"
    cand_id = "cand_test_id"

    # Test vote value 0
    r0 = secrets.randbelow(Q - 1) + 1
    ct0 = ElGamalCiphertext(a=pow(G, r0, P), b=(pow(h, r0, P) * pow(G, 0, P)) % P)
    proof0 = prove_disjunctive(manifest_digest, election_id, cand_id, h, r0, 0)
    assert verify_disjunctive(manifest_digest, election_id, cand_id, h, ct0, proof0) is True

    # Test vote value 1
    r1 = secrets.randbelow(Q - 1) + 1
    ct1 = ElGamalCiphertext(a=pow(G, r1, P), b=(pow(h, r1, P) * pow(G, 1, P)) % P)
    proof1 = prove_disjunctive(manifest_digest, election_id, cand_id, h, r1, 1)
    assert verify_disjunctive(manifest_digest, election_id, cand_id, h, ct1, proof1) is True

    # Tampered vote value 2 should be rejected by prover
    with pytest.raises(ValueError):
        prove_disjunctive(manifest_digest, election_id, cand_id, h, r1, 2)


def test_disjunctive_proof_rejection_on_tampering() -> None:
    """Verify disjunctive proof fails when ciphertext or proof is modified."""
    s = secrets.randbelow(Q - 1) + 1
    h = pow(G, s, P)
    manifest_digest = "manifest_test_hash"
    election_id = "election_test_id"
    cand_id = "cand_test_id"

    r = secrets.randbelow(Q - 1) + 1
    ct = ElGamalCiphertext(a=pow(G, r, P), b=(pow(h, r, P) * pow(G, 1, P)) % P)
    proof = prove_disjunctive(manifest_digest, election_id, cand_id, h, r, 1)

    # Tamper with challenge
    tampered_proof = DisjunctiveProof(
        a0=proof.a0,
        b0=proof.b0,
        a1=proof.a1,
        b1=proof.b1,
        c0=(proof.c0 + 1) % Q,
        c1=proof.c1,
        z0=proof.z0,
        z1=proof.z1,
    )
    assert verify_disjunctive(manifest_digest, election_id, cand_id, h, ct, tampered_proof) is False


def test_sum_proof() -> None:
    """Verify Chaum Pedersen proof that sum of votes equals 1."""
    s = secrets.randbelow(Q - 1) + 1
    h = pow(G, s, P)
    manifest_digest = "manifest_test_hash"
    election_id = "election_test_id"

    r1 = secrets.randbelow(Q - 1) + 1
    r2 = secrets.randbelow(Q - 1) + 1
    ct1 = ElGamalCiphertext(a=pow(G, r1, P), b=(pow(h, r1, P) * pow(G, 1, P)) % P)
    ct2 = ElGamalCiphertext(a=pow(G, r2, P), b=(pow(h, r2, P) * pow(G, 0, P)) % P)

    sum_ct = ct1.multiply(ct2)
    sum_r = (r1 + r2) % Q

    proof = prove_sum(manifest_digest, election_id, h, sum_r, sum_ct)
    assert verify_sum(manifest_digest, election_id, h, sum_ct, proof) is True

    # Tampered response
    bad_proof = SumProof(a_comm=proof.a_comm, b_comm=proof.b_comm, c=proof.c, z=(proof.z + 1) % Q)
    assert verify_sum(manifest_digest, election_id, h, sum_ct, bad_proof) is False


def test_trustee_key_pair_and_dleq() -> None:
    """Verify trustee Schnorr proof of knowledge and DLEQ decryption share proofs."""
    manifest_digest = "manifest_test_hash"
    election_id = "election_test_id"
    trustee = TrusteeKeyPair.generate("trustee_test", manifest_digest, election_id)
    assert trustee.verify_proof_of_knowledge(manifest_digest, election_id) is True

    # Create dummy aggregated ciphertext
    agg_a = pow(G, 12345, P)
    dec_share = pow(agg_a, trustee.secret_key, P)

    dleq = prove_dleq(
        manifest_digest=manifest_digest,
        election_id=election_id,
        trustee_id=trustee.trustee_id,
        candidate_id="cand_test",
        public_key_share=trustee.public_key_share,
        aggregated_a=agg_a,
        decryption_share=dec_share,
        secret_key_share=trustee.secret_key,
    )

    assert verify_dleq(
        manifest_digest=manifest_digest,
        election_id=election_id,
        trustee_id=trustee.trustee_id,
        candidate_id="cand_test",
        public_key_share=trustee.public_key_share,
        aggregated_a=agg_a,
        decryption_share=dec_share,
        proof=dleq,
    ) is True


def test_discrete_log_solver() -> None:
    """Verify small discrete log recovery."""
    assert solve_discrete_log(pow(G, 0, P)) == 0
    assert solve_discrete_log(pow(G, 1, P)) == 1
    assert solve_discrete_log(pow(G, 42, P)) == 42
    assert solve_discrete_log(pow(G, 999, P)) == 999


def test_merkle_tree_rfc9162() -> None:
    """Verify RFC 9162 Merkle log root and audit path inclusion verification."""
    tree = MerkleTree()
    records = [f"ballot_evidence_record_{i}".encode("utf_8") for i in range(5)]
    for r in records:
        tree.append_leaf(r)

    root = tree.get_root_hex()
    assert len(root) == 64

    for i in range(5):
        path = tree.get_audit_path(i)
        leaf_hash = MerkleTree.hash_leaf(records[i]).hex()
        verified = MerkleTree.verify_inclusion_proof(
            leaf_hash_hex=leaf_hash,
            index=i,
            path=path,
            expected_root_hex=root,
        )
        assert verified is True

        # Tampered leaf hash
        bad_leaf_hash = leaf_hash[:-1] + ("0" if leaf_hash[-1] != "0" else "1")
        assert MerkleTree.verify_inclusion_proof(
            leaf_hash_hex=bad_leaf_hash,
            index=i,
            path=path,
            expected_root_hex=root,
        ) is False


def test_canonical_json_rfc8785() -> None:
    """Verify RFC 8785 canonical JSON formatting."""
    d = {"z": 1, "a": "hello", "nested": {"k2": True, "k1": None}}
    res = canonical_json(d)
    assert res == b'{"a":"hello","nested":{"k1":null,"k2":true},"z":1}'

    with pytest.raises(ValueError):
        canonical_json({"float_key": 3.14})
