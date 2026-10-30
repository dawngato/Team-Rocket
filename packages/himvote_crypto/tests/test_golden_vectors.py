"""Golden vector integration tests validating against packages/test_vectors."""

import json
from pathlib import Path
import pytest
from himvote_crypto.ed25519 import ed25519_verify, sign
from himvote_crypto.exceptions import DuplicateKeyError, FloatNotPermittedError
from himvote_crypto.jcs import canonical_digest_hex, canonicalize, loads
from himvote_crypto.merkle import (
    leaf_hash,
    merkle_tree_hash,
    verify_consistency,
    verify_inclusion,
)
from himvote_crypto.models import BallotEvidenceRecord, CheckpointRecord
from himvote_crypto.rsa_blind import (
    RSABSSAVariant,
    client_blind,
    client_finalize,
    server_blind_sign,
    verify_signature,
)

VECTORS_DIR = Path(__file__).resolve().parents[2] / "test_vectors"


def test_golden_jcs_vectors():
    """Validate RFC 8785 canonicalization against golden jcs_vectors.json."""
    vector_file = VECTORS_DIR / "jcs_vectors.json"
    if not vector_file.exists():
        pytest.skip("jcs_vectors.json not found")

    with open(vector_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Unicode sorting test
    u_test = data["unicode_sorting_test"]
    canon_bytes = canonicalize(u_test["input"])
    assert canon_bytes.decode("utf-8") == u_test["expected_canonical_json"]

    parsed = loads(canon_bytes)
    assert list(parsed.keys()) == u_test["expected_key_order"]

    # String escaping test
    s_test = data["string_escaping_test"]
    s_canon = canonicalize(s_test["input"])
    assert s_canon.hex() == s_test["expected_canonical_hex"]

    # Duplicate key test
    d_test = data["duplicate_key_test"]
    with pytest.raises(DuplicateKeyError) as exc_info:
        loads(d_test["raw_json"])
    assert exc_info.value.key == d_test["duplicate_key"]

    # Float rejection test
    f_test = data["float_rejection_test"]
    with pytest.raises(FloatNotPermittedError):
        canonicalize(f_test["input"], allow_floats=False)


def test_golden_merkle_vectors():
    """Validate RFC 9162 Merkle tree computation against golden merkle_vectors.json."""
    vector_file = VECTORS_DIR / "merkle_vectors.json"
    if not vector_file.exists():
        pytest.skip("merkle_vectors.json not found")

    with open(vector_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate inclusion proofs
    for name, p_data in data["inclusion_proofs"].items():
        leaf_idx = p_data["leaf_index"]
        tree_sz = p_data["tree_size"]
        lh = bytes.fromhex(p_data["leaf_hash"])
        proof = [bytes.fromhex(h) for h in p_data["proof"]]
        expected_root = bytes.fromhex(data["tree_heads"][f"size_{tree_sz}"])

        assert verify_inclusion(leaf_idx, tree_sz, lh, proof, expected_root), f"Failed {name}"

    # Validate consistency proofs
    for name, c_data in data["consistency_proofs"].items():
        f_sz = c_data["first_size"]
        s_sz = c_data["second_size"]
        f_root = bytes.fromhex(c_data["first_root"])
        s_root = bytes.fromhex(c_data["second_root"])
        proof = [bytes.fromhex(h) for h in c_data["proof"]]

        assert verify_consistency(f_sz, s_sz, f_root, s_root, proof), f"Failed {name}"


def test_golden_rsa_blind_vectors():
    """Validate RFC 9474 test vectors against rsa_blind_vectors.json."""
    vector_file = VECTORS_DIR / "rsa_blind_vectors.json"
    if not vector_file.exists():
        pytest.skip("rsa_blind_vectors.json not found")

    with open(vector_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    for v in data["variants"]:
        variant = RSABSSAVariant[v["variant"]]
        n = int(v["n"], 16)
        e = int(v["e"], 16)
        d = int(v["d"], 16)
        modulus_len = (n.bit_length() + 7) // 8

        pk = (n, e)
        msg = bytes.fromhex(v["msg"])
        prepared_expected = bytes.fromhex(v["prepared_msg"])
        salt = bytes.fromhex(v["salt"]) if v["salt"] else b""
        inv = int(v["inv"], 16)
        r = pow(inv, -1, n)

        prefix = bytes.fromhex(v["msg_prefix"]) if v["msg_prefix"] else None

        # 1. Test client blinding reproduces exact blinded_msg
        blinded_msg, secret, prepared = client_blind(
            pk,
            msg,
            variant=variant,
            custom_salt=salt,
            custom_prefix=prefix,
            custom_r=r,
        )
        assert prepared.hex() == v["prepared_msg"]
        assert blinded_msg.hex() == v["blinded_msg"]
        assert secret.inv == inv

        # 2. Test server blind signing produces expected blind signature
        m_int = int.from_bytes(blinded_msg, "big")
        s_int = pow(m_int, d, n)
        blind_sig = s_int.to_bytes(modulus_len, "big")
        assert blind_sig.hex() == v["blind_sig"]

        # 3. Test client finalize produces expected signature
        sig = client_finalize(pk, prepared, blind_sig, secret)
        assert sig.hex() == v["sig"]

        # 4. Test public verification
        assert verify_signature(pk, prepared, sig, variant=variant)


def test_golden_ed25519_vectors():
    """Validate RFC 8032 test vectors against ed25519_vectors.json."""
    vector_file = VECTORS_DIR / "ed25519_vectors.json"
    if not vector_file.exists():
        pytest.skip("ed25519_vectors.json not found")

    with open(vector_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    for v in data["vectors"]:
        priv = bytes.fromhex(v["private_key_hex"])
        pub = bytes.fromhex(v["public_key_hex"])
        msg = bytes.fromhex(v["message_hex"]) if v["message_hex"] else b""
        expected_sig = bytes.fromhex(v["signature_hex"])

        computed_sig = sign(priv, msg)
        assert computed_sig == expected_sig
        assert ed25519_verify(pub, msg, expected_sig)


def test_golden_ballot_evidence_vectors():
    """Validate canonical ballot evidence records against ballot_evidence_vectors.json."""
    vector_file = VECTORS_DIR / "ballot_evidence_vectors.json"
    if not vector_file.exists():
        pytest.skip("ballot_evidence_vectors.json not found")

    with open(vector_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data["vectors"]:
        rec_dict = item["record"]
        record = BallotEvidenceRecord(**rec_dict)

        canon_bytes = record.canonical_bytes()
        assert canon_bytes.decode("utf-8") == item["canonical_json"]
        assert canon_bytes.hex() == item["canonical_bytes_hex"]
        assert record.leaf_hash_hex() == item["leaf_hash"]


def test_golden_checkpoint_vectors():
    """Validate canonical checkpoint records against checkpoint_vectors.json."""
    vector_file = VECTORS_DIR / "checkpoint_vectors.json"
    if not vector_file.exists():
        pytest.skip("checkpoint_vectors.json not found")

    with open(vector_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    witness_pub = bytes.fromhex(data["witness_public_key_hex"])

    for item in data["checkpoints"]:
        rec_dict = item["record"]
        record = CheckpointRecord(**rec_dict)

        canon_bytes = record.canonical_bytes()
        assert canon_bytes.decode("utf-8") == item["canonical_json"]
        assert canon_bytes.hex() == item["canonical_bytes_hex"]
        assert record.digest_hex() == item["checkpoint_digest"]

        # Verify witness signature
        sig_b64 = item["witness_signature_b64url"]
        rem = len(sig_b64) % 4
        if rem > 0:
            sig_b64 += "=" * (4 - rem)
        import base64
        sig_bytes = base64.urlsafe_b64decode(sig_b64)
        assert ed25519_verify(witness_pub, canon_bytes, sig_bytes)
