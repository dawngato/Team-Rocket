"""
HimVote Golden Test Vector Verification Script
Validates canonical JSON RFC 8785, Merkle log RFC 9162, RSA blind signatures RFC 9474, and checkpoint signatures
"""

import os
import sys
import json
import base64
import hashlib
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

def jcs_rfc8785(obj):
    if obj is None:
        return "null"
    elif isinstance(obj, bool):
        return "true" if obj else "false"
    elif isinstance(obj, int):
        return str(obj)
    elif isinstance(obj, float):
        raise ValueError("Floats forbidden in canonical JSON")
    elif isinstance(obj, str):
        res = ['"']
        for c in obj:
            cp = ord(c)
            if c == '"':
                res.append('\\"')
            elif c == '\\':
                res.append('\\\\')
            elif c == '\b':
                res.append('\\b')
            elif c == '\f':
                res.append('\\f')
            elif c == '\n':
                res.append('\\n')
            elif c == '\r':
                res.append('\\r')
            elif c == '\t':
                res.append('\\t')
            elif cp < 0x20:
                res.append(f'\\u{cp:04x}')
            else:
                res.append(c)
        res.append('"')
        return ''.join(res)
    elif isinstance(obj, list):
        return '[' + ','.join(jcs_rfc8785(x) for x in obj) + ']'
    elif isinstance(obj, dict):
        keys = sorted(obj.keys(), key=lambda k: k.encode('utf-16-be'))
        return '{' + ','.join(jcs_rfc8785(k) + ':' + jcs_rfc8785(obj[k]) for k in keys) + '}'
    else:
        raise TypeError(f"Unsupported type: {type(obj)}")

def sha256_bytes(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()

def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def leaf_hash_bytes(canonical_leaf: bytes) -> bytes:
    return sha256_bytes(b'\x00' + canonical_leaf)

def node_hash_bytes(left: bytes, right: bytes) -> bytes:
    return sha256_bytes(b'\x01' + left + right)

def mth(leaves_hashes: list[bytes]) -> bytes:
    n = len(leaves_hashes)
    if n == 0:
        return sha256_bytes(b'')
    if n == 1:
        return leaves_hashes[0]
    k = 1 << ((n - 1).bit_length() - 1)
    left = mth(leaves_hashes[:k])
    right = mth(leaves_hashes[k:])
    return node_hash_bytes(left, right)

def verify_all():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Verify ballot evidence vectors
    ballot_path = os.path.join(base_dir, "ballot_evidence_vectors.json")
    with open(ballot_path, "r", encoding="utf-8") as f:
        ballot_data = json.load(f)
    
    for v in ballot_data["vectors"]:
        rec = v["record"]
        canon_computed = jcs_rfc8785(rec)
        assert canon_computed == v["canonical_json"], "Canonical JSON string mismatch"
        canon_bytes = canon_computed.encode("utf-8")
        assert canon_bytes.hex() == v["canonical_bytes_hex"], "Canonical bytes hex mismatch"
        l_hash = leaf_hash_bytes(canon_bytes).hex()
        assert l_hash == v["leaf_hash"], "Leaf hash computation mismatch"
    print("Ballot evidence vectors verified successfully")
    
    # 2. Verify Merkle tree vectors
    merkle_path = os.path.join(base_dir, "merkle_tree_vectors.json")
    with open(merkle_path, "r", encoding="utf-8") as f:
        merkle_data = json.load(f)
        
    leaves_hashes = [bytes.fromhex(h) for h in merkle_data["leaf_hashes"]]
    assert mth([]).hex() == merkle_data["tree_roots"]["size_0"]["merkle_root"]
    assert mth(leaves_hashes[:1]).hex() == merkle_data["tree_roots"]["size_1"]["merkle_root"]
    assert mth(leaves_hashes[:2]).hex() == merkle_data["tree_roots"]["size_2"]["merkle_root"]
    assert mth(leaves_hashes[:3]).hex() == merkle_data["tree_roots"]["size_3"]["merkle_root"]
    assert mth(leaves_hashes[:4]).hex() == merkle_data["tree_roots"]["size_4"]["merkle_root"]
    print("Merkle tree root hashes verified successfully")
    
    # 3. Verify blind signature vectors
    blind_path = os.path.join(base_dir, "blind_signature_vectors.json")
    with open(blind_path, "r", encoding="utf-8") as f:
        blind_data = json.load(f)
        
    pub = blind_data["public_key"]
    N = int(pub["modulus_n"], 16)
    e = pub["public_exponent_e"]
    d = int(blind_data["private_key"]["private_exponent_d"], 16)
    
    for bv in blind_data["vectors"]:
        m_int = int(bv["token_integer"])
        r_int = int(bv["blinding_factor_r"])
        r_inv = int(bv["blinding_factor_inverse"])
        m_blinded = int(bv["blinded_message_integer"])
        
        # Verify blinding equation
        assert (m_int * pow(r_int, e, N)) % N == m_blinded
        
        # Verify signing
        s_blinded = pow(m_blinded, d, N)
        s_unblinded = (s_blinded * r_inv) % N
        
        # Verify RSA verification
        assert pow(s_unblinded, e, N) == m_int
        
        # Verify nullifier
        token_bytes = bv["token_plaintext"].encode("utf-8")
        s_unblinded_bytes = s_unblinded.to_bytes(256, "big")
        computed_nullifier = sha256_hex(s_unblinded_bytes + token_bytes)
        assert computed_nullifier == bv["credential_nullifier_hex"]
    print("Blind signature vectors verified successfully")
    
    # 4. Verify checkpoint vectors
    checkpoint_path = os.path.join(base_dir, "checkpoint_vectors.json")
    with open(checkpoint_path, "r", encoding="utf-8") as f:
        cp_data = json.load(f)
        
    witness_pub_bytes = bytes.fromhex(cp_data["witness_public_key_hex"])
    witness_pub_key = ed25519.Ed25519PublicKey.from_public_bytes(witness_pub_bytes)
    
    for cp in cp_data["checkpoints"]:
        rec = cp["record"]
        canon_str = jcs_rfc8785(rec)
        assert canon_str == cp["canonical_json"]
        canon_bytes = canon_str.encode("utf-8")
        assert canon_bytes.hex() == cp["canonical_bytes_hex"]
        digest = sha256_hex(canon_bytes)
        assert digest == cp["checkpoint_digest"]
        
        # Verify witness Ed25519 signature
        # Note base64url padding
        sig_b64 = cp["witness_signature_b64url"]
        rem = len(sig_b64) % 4
        if rem > 0:
            sig_b64 += "=" * (4 - rem)
        sig_bytes = base64.urlsafe_b64decode(sig_b64)
        witness_pub_key.verify(sig_bytes, canon_bytes)
    print("Checkpoint record vectors verified successfully")
    print("All HimVote test vectors passed verification")

if __name__ == "__main__":
    verify_all()
