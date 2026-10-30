"""
Cryptographic hashing functions according to RFC 9162 and HimVote standards.
"""

import hashlib
from typing import List, Union
from src.crypto.canonical import canonical_json_bytes


def sha256_digest(data: Union[bytes, str]) -> str:
    """
    Computes standard SHA256 hex digest.
    """
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def compute_manifest_digest(manifest_dict: dict) -> str:
    """
    Computes deterministic manifest digest using canonical JSON and SHA256.
    """
    canonical_bytes = canonical_json_bytes(manifest_dict)
    return hashlib.sha256(canonical_bytes).hexdigest()


def rfc9162_leaf_hash(leaf_bytes: bytes) -> bytes:
    """
    RFC 9162 leaf hash prefix: SHA256(0x00 || leaf_bytes).
    """
    return hashlib.sha256(b"\x00" + leaf_bytes).digest()


def rfc9162_node_hash(left_hash: bytes, right_hash: bytes) -> bytes:
    """
    RFC 9162 interior node hash prefix: SHA256(0x01 || left || right).
    """
    return hashlib.sha256(b"\x01" + left_hash + right_hash).digest()


def compute_roster_commitment(roster_items: List[dict]) -> str:
    """
    Computes deterministic roster commitment from roster members.
    Items are sorted deterministically before computing the root digest.
    """
    if not roster_items:
        return hashlib.sha256(b"empty_roster").hexdigest()

    serialized_items = [canonical_json_str_leaf(item) for item in roster_items]
    serialized_items.sort()
    
    current_hashes = [hashlib.sha256(item.encode("utf-8")).digest() for item in serialized_items]
    
    while len(current_hashes) > 1:
        next_level = []
        for i in range(0, len(current_hashes), 2):
            if i + 1 < len(current_hashes):
                combined = rfc9162_node_hash(current_hashes[i], current_hashes[i + 1])
            else:
                combined = current_hashes[i]
            next_level.append(combined)
        current_hashes = next_level

    return current_hashes[0].hex()


def canonical_json_str_leaf(item: dict) -> str:
    """Helper to serialize single item canonically."""
    return canonical_json_bytes(item).decode("utf-8")
