"""Cryptographic primitives for HimVote Profile VEEM.
Implements exponential ElGamal, Cramer Damgard Schoenmakers disjunctive proofs,
Chaum Pedersen sum proofs, trustee DLEQ proofs, and RFC 9162 Merkle tree.
"""

import hashlib
import json
import secrets
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

try:
    from himvote_crypto.jcs import canonicalize as _reviewed_jcs_canonicalize
except ImportError:
    _reviewed_jcs_canonicalize = None

try:
    from .constants import G, P, Q
except (ImportError, ValueError):
    from constants import G, P, Q


def canonical_json(data: Any) -> bytes:
    """Serialize data with the shared RFC 8785 integer-only HimVote profile."""
    if _reviewed_jcs_canonicalize is not None:
        return _reviewed_jcs_canonicalize(data, allow_floats=False)

    def _check_floats(obj: Any) -> None:
        if isinstance(obj, float):
            raise ValueError("Float values forbidden in canonical JSON")
        if isinstance(obj, dict):
            for k, v in obj.items():
                if not isinstance(k, str):
                    raise ValueError("Dictionary keys must be strings")
                _check_floats(v)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _check_floats(item)

    _check_floats(data)
    def _serialize(obj: Any) -> str:
        if isinstance(obj, dict):
            keys = sorted(obj.keys(), key=lambda key: key.encode("utf-16-be"))
            return "{" + ",".join(f"{json.dumps(key, ensure_ascii=False)}:{_serialize(obj[key])}" for key in keys) + "}"
        if isinstance(obj, (list, tuple)):
            return "[" + ",".join(_serialize(item) for item in obj) + "]"
        if isinstance(obj, str):
            return json.dumps(obj, ensure_ascii=False)
        if obj is True:
            return "true"
        if obj is False:
            return "false"
        if obj is None:
            return "null"
        if isinstance(obj, int):
            return str(obj)
        raise TypeError(f"Unsupported canonical JSON value: {type(obj).__name__}")

    return _serialize(data).encode("utf_8")


def sha256_digest(*items: Any) -> bytes:
    """Compute SHA256 digest over mixed items."""
    hasher = hashlib.sha256()
    for item in items:
        if isinstance(item, int):
            bit_len = item.bit_length()
            byte_len = (bit_len + 7) // 8 or 1
            hasher.update(item.to_bytes(byte_len, "big"))
        elif isinstance(item, str):
            hasher.update(item.encode("utf_8"))
        elif isinstance(item, bytes):
            hasher.update(item)
        elif isinstance(item, (dict, list)):
            hasher.update(canonical_json(item))
        else:
            hasher.update(str(item).encode("utf_8"))
    return hasher.digest()


def hash_to_scalar(*items: Any) -> int:
    """Hash arbitrary inputs into a scalar in Z_q."""
    digest = sha256_digest(*items)
    return int.from_bytes(digest, "big") % Q


def is_in_subgroup(val: int) -> bool:
    """Verify that an integer is in the prime order subgroup G_q modulo P."""
    if not isinstance(val, int):
        return False
    if val <= 1 or val >= P:
        return False
    return pow(val, Q, P) == 1


@dataclass(frozen=True)
class ElGamalCiphertext:
    """Exponential ElGamal ciphertext tuple a and b."""
    a: int
    b: int

    def multiply(self, other: "ElGamalCiphertext") -> "ElGamalCiphertext":
        """Homomorphic multiplication of two ciphertexts."""
        return ElGamalCiphertext(
            a=(self.a * other.a) % P,
            b=(self.b * other.b) % P,
        )

    def to_dict(self) -> Dict[str, str]:
        """Serialize to dictionary with hex strings."""
        return {"a": hex(self.a), "b": hex(self.b)}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ElGamalCiphertext":
        """Deserialize from dictionary."""
        a_val = int(data["a"], 16) if isinstance(data["a"], str) else int(data["a"])
        b_val = int(data["b"], 16) if isinstance(data["b"], str) else int(data["b"])
        return cls(a=a_val, b=b_val)


@dataclass(frozen=True)
class DisjunctiveProof:
    """Cramer Damgard Schoenmakers proof that ciphertext encrypts 0 or 1."""
    a0: int
    b0: int
    a1: int
    b1: int
    c0: int
    c1: int
    z0: int
    z1: int

    def to_dict(self) -> Dict[str, str]:
        """Serialize proof to dictionary."""
        return {
            "a0": hex(self.a0),
            "b0": hex(self.b0),
            "a1": hex(self.a1),
            "b1": hex(self.b1),
            "c0": hex(self.c0),
            "c1": hex(self.c1),
            "z0": hex(self.z0),
            "z1": hex(self.z1),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DisjunctiveProof":
        """Deserialize proof from dictionary."""
        def _parse(k: str) -> int:
            val = data[k]
            return int(val, 16) if isinstance(val, str) else int(val)

        return cls(
            a0=_parse("a0"),
            b0=_parse("b0"),
            a1=_parse("a1"),
            b1=_parse("b1"),
            c0=_parse("c0"),
            c1=_parse("c1"),
            z0=_parse("z0"),
            z1=_parse("z1"),
        )


def prove_disjunctive(
    manifest_digest: str,
    election_id: str,
    candidate_id: str,
    public_key: int,
    randomness: int,
    plaintext_vote: int,
) -> DisjunctiveProof:
    """Generate non interactive disjunctive Chaum Pedersen proof for 0 or 1 vote."""
    if plaintext_vote not in (0, 1):
        raise ValueError("Plaintext vote must be 0 or 1")

    a = pow(G, randomness, P)
    b = (pow(public_key, randomness, P) * pow(G, plaintext_vote, P)) % P
    inv_g = pow(G, -1, P)
    b_div_g = (b * inv_g) % P

    if plaintext_vote == 0:
        # Simulated branch 1
        c1 = secrets.randbelow(Q - 1) + 1
        z1 = secrets.randbelow(Q - 1) + 1
        a1 = (pow(G, z1, P) * pow(a, -c1, P)) % P
        b1 = (pow(public_key, z1, P) * pow(b_div_g, -c1, P)) % P

        # Real branch 0
        w0 = secrets.randbelow(Q - 1) + 1
        a0 = pow(G, w0, P)
        b0 = pow(public_key, w0, P)

        c_total = hash_to_scalar(
            manifest_digest, election_id, candidate_id, a, b, a0, b0, a1, b1
        )
        c0 = (c_total - c1) % Q
        z0 = (w0 + c0 * randomness) % Q
    else:
        # Simulated branch 0
        c0 = secrets.randbelow(Q - 1) + 1
        z0 = secrets.randbelow(Q - 1) + 1
        a0 = (pow(G, z0, P) * pow(a, -c0, P)) % P
        b0 = (pow(public_key, z0, P) * pow(b, -c0, P)) % P

        # Real branch 1
        w1 = secrets.randbelow(Q - 1) + 1
        a1 = pow(G, w1, P)
        b1 = pow(public_key, w1, P)

        c_total = hash_to_scalar(
            manifest_digest, election_id, candidate_id, a, b, a0, b0, a1, b1
        )
        c1 = (c_total - c0) % Q
        z1 = (w1 + c1 * randomness) % Q

    return DisjunctiveProof(a0=a0, b0=b0, a1=a1, b1=b1, c0=c0, c1=c1, z0=z0, z1=z1)


def verify_disjunctive(
    manifest_digest: str,
    election_id: str,
    candidate_id: str,
    public_key: int,
    ciphertext: ElGamalCiphertext,
    proof: DisjunctiveProof,
) -> bool:
    """Verify non interactive disjunctive Chaum Pedersen proof for 0 or 1 vote."""
    if not is_in_subgroup(ciphertext.a) or not is_in_subgroup(ciphertext.b):
        return False
    if not is_in_subgroup(proof.a0) or not is_in_subgroup(proof.b0):
        return False
    if not is_in_subgroup(proof.a1) or not is_in_subgroup(proof.b1):
        return False

    c_total = hash_to_scalar(
        manifest_digest,
        election_id,
        candidate_id,
        ciphertext.a,
        ciphertext.b,
        proof.a0,
        proof.b0,
        proof.a1,
        proof.b1,
    )
    if (proof.c0 + proof.c1) % Q != c_total:
        return False

    # Check branch 0
    if pow(G, proof.z0, P) != (proof.a0 * pow(ciphertext.a, proof.c0, P)) % P:
        return False
    if pow(public_key, proof.z0, P) != (proof.b0 * pow(ciphertext.b, proof.c0, P)) % P:
        return False

    # Check branch 1
    inv_g = pow(G, -1, P)
    b_div_g = (ciphertext.b * inv_g) % P
    if pow(G, proof.z1, P) != (proof.a1 * pow(ciphertext.a, proof.c1, P)) % P:
        return False
    if pow(public_key, proof.z1, P) != (proof.b1 * pow(b_div_g, proof.c1, P)) % P:
        return False

    return True


@dataclass(frozen=True)
class SumProof:
    """Chaum Pedersen proof that aggregate ciphertext encrypts 1."""
    a_comm: int
    b_comm: int
    c: int
    z: int

    def to_dict(self) -> Dict[str, str]:
        """Serialize proof to dictionary."""
        return {
            "a_comm": hex(self.a_comm),
            "b_comm": hex(self.b_comm),
            "c": hex(self.c),
            "z": hex(self.z),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SumProof":
        """Deserialize proof from dictionary."""
        def _parse(k: str) -> int:
            val = data[k]
            return int(val, 16) if isinstance(val, str) else int(val)

        return cls(
            a_comm=_parse("a_comm"),
            b_comm=_parse("b_comm"),
            c=_parse("c"),
            z=_parse("z"),
        )


def prove_sum(
    manifest_digest: str,
    election_id: str,
    public_key: int,
    sum_randomness: int,
    sum_ciphertext: ElGamalCiphertext,
) -> SumProof:
    """Generate Chaum Pedersen proof that sum of candidate votes equals 1."""
    w = secrets.randbelow(Q - 1) + 1
    a_comm = pow(G, w, P)
    b_comm = pow(public_key, w, P)

    c = hash_to_scalar(
        manifest_digest,
        election_id,
        "sum_proof_constant",
        sum_ciphertext.a,
        sum_ciphertext.b,
        a_comm,
        b_comm,
    )
    z = (w + c * sum_randomness) % Q
    return SumProof(a_comm=a_comm, b_comm=b_comm, c=c, z=z)


def verify_sum(
    manifest_digest: str,
    election_id: str,
    public_key: int,
    sum_ciphertext: ElGamalCiphertext,
    proof: SumProof,
) -> bool:
    """Verify Chaum Pedersen proof that sum of candidate votes equals 1."""
    if not is_in_subgroup(sum_ciphertext.a) or not is_in_subgroup(sum_ciphertext.b):
        return False
    if not is_in_subgroup(proof.a_comm) or not is_in_subgroup(proof.b_comm):
        return False

    c_expected = hash_to_scalar(
        manifest_digest,
        election_id,
        "sum_proof_constant",
        sum_ciphertext.a,
        sum_ciphertext.b,
        proof.a_comm,
        proof.b_comm,
    )
    if proof.c != c_expected:
        return False

    inv_g = pow(G, -1, P)
    b_div_g = (sum_ciphertext.b * inv_g) % P

    if pow(G, proof.z, P) != (proof.a_comm * pow(sum_ciphertext.a, proof.c, P)) % P:
        return False
    if pow(public_key, proof.z, P) != (proof.b_comm * pow(b_div_g, proof.c, P)) % P:
        return False

    return True


@dataclass(frozen=True)
class DLEQProof:
    """Chaum Pedersen discrete log equality proof for trustee decryption share."""
    t1: int
    t2: int
    c: int
    z: int

    def to_dict(self) -> Dict[str, str]:
        """Serialize proof to dictionary."""
        return {
            "t1": hex(self.t1),
            "t2": hex(self.t2),
            "c": hex(self.c),
            "z": hex(self.z),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DLEQProof":
        """Deserialize proof from dictionary."""
        def _parse(k: str) -> int:
            val = data[k]
            return int(val, 16) if isinstance(val, str) else int(val)

        return cls(
            t1=_parse("t1"),
            t2=_parse("t2"),
            c=_parse("c"),
            z=_parse("z"),
        )


def prove_dleq(
    manifest_digest: str,
    election_id: str,
    trustee_id: str,
    candidate_id: str,
    public_key_share: int,
    aggregated_a: int,
    decryption_share: int,
    secret_key_share: int,
) -> DLEQProof:
    """Generate Chaum Pedersen DLEQ proof for trustee decryption share."""
    u = secrets.randbelow(Q - 1) + 1
    t1 = pow(G, u, P)
    t2 = pow(aggregated_a, u, P)

    c = hash_to_scalar(
        manifest_digest,
        election_id,
        trustee_id,
        candidate_id,
        G,
        public_key_share,
        aggregated_a,
        decryption_share,
        t1,
        t2,
    )
    z = (u + c * secret_key_share) % Q
    return DLEQProof(t1=t1, t2=t2, c=c, z=z)


def verify_dleq(
    manifest_digest: str,
    election_id: str,
    trustee_id: str,
    candidate_id: str,
    public_key_share: int,
    aggregated_a: int,
    decryption_share: int,
    proof: DLEQProof,
) -> bool:
    """Verify Chaum Pedersen DLEQ proof for trustee decryption share."""
    if not is_in_subgroup(public_key_share) or not is_in_subgroup(decryption_share):
        return False
    if not is_in_subgroup(proof.t1) or not is_in_subgroup(proof.t2):
        return False

    c_expected = hash_to_scalar(
        manifest_digest,
        election_id,
        trustee_id,
        candidate_id,
        G,
        public_key_share,
        aggregated_a,
        decryption_share,
        proof.t1,
        proof.t2,
    )
    if proof.c != c_expected:
        return False

    if pow(G, proof.z, P) != (proof.t1 * pow(public_key_share, proof.c, P)) % P:
        return False
    if pow(aggregated_a, proof.z, P) != (proof.t2 * pow(decryption_share, proof.c, P)) % P:
        return False

    return True


@dataclass
class TrusteeKeyPair:
    """Trustee private and public key share with Schnorr proof of knowledge."""
    trustee_id: str
    secret_key: int
    public_key_share: int
    pok_comm: int
    pok_resp: int

    @classmethod
    def generate(cls, trustee_id: str, manifest_digest: str, election_id: str) -> "TrusteeKeyPair":
        """Generate a fresh trustee key share with Schnorr proof of knowledge."""
        sk = secrets.randbelow(Q - 1) + 1
        pk_share = pow(G, sk, P)
        w = secrets.randbelow(Q - 1) + 1
        comm = pow(G, w, P)
        c = hash_to_scalar(manifest_digest, election_id, trustee_id, G, pk_share, comm)
        resp = (w + c * sk) % Q
        return cls(
            trustee_id=trustee_id,
            secret_key=sk,
            public_key_share=pk_share,
            pok_comm=comm,
            pok_resp=resp,
        )

    def verify_proof_of_knowledge(self, manifest_digest: str, election_id: str) -> bool:
        """Verify the trustee Schnorr proof of knowledge."""
        if not is_in_subgroup(self.public_key_share) or not is_in_subgroup(self.pok_comm):
            return False
        c = hash_to_scalar(
            manifest_digest,
            election_id,
            self.trustee_id,
            G,
            self.public_key_share,
            self.pok_comm,
        )
        return pow(G, self.pok_resp, P) == (self.pok_comm * pow(self.public_key_share, c, P)) % P


def solve_discrete_log(target_element: int, max_votes: int = 100000) -> Optional[int]:
    """Solve discrete log g^v == target_element modulo P up to max_votes."""
    if target_element == 1:
        return 0
    # Baby step giant step for counts
    m = int(max_votes ** 0.5) + 1
    table: Dict[int, int] = {}
    cur = 1
    for j in range(m):
        table[cur] = j
        cur = (cur * G) % P

    inv_g_m = pow(pow(G, m, P), -1, P)
    gamma = target_element
    for i in range(m + 1):
        if gamma in table:
            res = i * m + table[gamma]
            if res <= max_votes:
                return res
        gamma = (gamma * inv_g_m) % P
    return None


class MerkleTree:
    """RFC 9162 Merkle log implementation."""

    def __init__(self, leaf_records: Optional[List[bytes]] = None) -> None:
        self.leaf_records: List[bytes] = []
        self.leaf_hashes: List[bytes] = []
        if leaf_records:
            for rec in leaf_records:
                self.append_leaf(rec)

    @staticmethod
    def hash_leaf(data: bytes) -> bytes:
        """RFC 9162 leaf hash: SHA256(0x00 || data)."""
        return hashlib.sha256(b"\x00" + data).digest()

    @staticmethod
    def hash_children(left: bytes, right: bytes) -> bytes:
        """RFC 9162 node hash: SHA256(0x01 || left || right)."""
        return hashlib.sha256(b"\x01" + left + right).digest()

    def append_leaf(self, record_bytes: bytes) -> int:
        """Append a canonical leaf record to the tree and return index."""
        idx = len(self.leaf_records)
        self.leaf_records.append(record_bytes)
        self.leaf_hashes.append(self.hash_leaf(record_bytes))
        return idx

    def get_root_bytes(self) -> bytes:
        """Compute the RFC 9162 Merkle tree root hash."""
        if not self.leaf_hashes:
            return hashlib.sha256(b"").digest()

        def _sub_tree_hash(hashes: List[bytes]) -> bytes:
            n = len(hashes)
            if n == 1:
                return hashes[0]
            k = 1 << ((n - 1).bit_length() - 1)
            left_root = _sub_tree_hash(hashes[:k])
            right_root = _sub_tree_hash(hashes[k:])
            return self.hash_children(left_root, right_root)

        return _sub_tree_hash(self.leaf_hashes)

    def get_root_hex(self) -> str:
        """Return the hex encoded Merkle root hash."""
        return self.get_root_bytes().hex()

    def get_audit_path(self, index: int) -> List[Dict[str, str]]:
        """Generate RFC 9162 inclusion proof audit path for leaf at index."""
        n = len(self.leaf_hashes)
        if index < 0 or index >= n:
            raise IndexError("Leaf index out of bounds")

        path: List[Dict[str, str]] = []

        def _build_path(hashes: List[bytes], idx: int) -> bytes:
            count = len(hashes)
            if count == 1:
                return hashes[0]
            k = 1 << ((count - 1).bit_length() - 1)
            if idx < k:
                sub_left = _build_path(hashes[:k], idx)
                sub_right = self._compute_root(hashes[k:])
                path.append({"direction": "right", "hash": sub_right.hex()})
                return self.hash_children(sub_left, sub_right)
            else:
                sub_left = self._compute_root(hashes[:k])
                sub_right = _build_path(hashes[k:], idx - k)
                path.append({"direction": "left", "hash": sub_left.hex()})
                return self.hash_children(sub_left, sub_right)

        _build_path(self.leaf_hashes, index)
        return path

    def _compute_root(self, hashes: List[bytes]) -> bytes:
        count = len(hashes)
        if count == 1:
            return hashes[0]
        k = 1 << ((count - 1).bit_length() - 1)
        left = self._compute_root(hashes[:k])
        right = self._compute_root(hashes[k:])
        return self.hash_children(left, right)

    @classmethod
    def verify_inclusion_proof(
        cls,
        leaf_hash_hex: str,
        index: int,
        path: List[Dict[str, str]],
        expected_root_hex: str,
    ) -> bool:
        """Verify RFC 9162 inclusion proof against expected Merkle root."""
        current = bytes.fromhex(leaf_hash_hex)
        for step in path:
            sibling = bytes.fromhex(step["hash"])
            direction = step["direction"]
            if direction == "left":
                current = cls.hash_children(sibling, current)
            elif direction == "right":
                current = cls.hash_children(current, sibling)
            else:
                return False
        return current.hex().lower() == expected_root_hex.lower()
