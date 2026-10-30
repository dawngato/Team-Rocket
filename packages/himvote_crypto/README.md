# himvote_crypto

Reviewed cryptography and data canonicalization engine for the HimVote institutional election system.

## Overview

himvote_crypto provides vetted implementations of required cryptographic primitives and canonical data serialization formats.
The library strictly complies with HimVote security requirements from Section 0.1, Section 5, and Section 6 of the platform specifications.

## Core Capabilities

### 1. JSON Canonicalization Scheme (RFC 8785 JCS)
* Produces deterministic UTF_8 byte streams without byte order marks
* Sorts dictionary property keys lexicographically by UTF_16 code unit values
* Escapes control characters and mandatory characters per specification
* Leaves forward slashes and raw Unicode characters unescaped
* Strictly rejects duplicate keys during parsing
* Prohibits floating point values by default to eliminate cross platform ambiguity

### 2. Merkle Tree and Audit Proofs (RFC 9162)
* Leaf hash calculation using domain separation prefix: SHA256(0x00 || leaf_bytes)
* Interior node hash calculation using prefix: SHA256(0x01 || left_hash || right_hash)
* Empty tree hash representation: SHA256(empty byte string)
* Merkle Tree Hash computation for arbitrary tree sizes
* Audit path generation and verification for leaf inclusion proofs
* Consistency proof generation and verification between tree states
* In memory stateful MerkleTree implementation

### 3. RSA Blind Signatures (RFC 9474 RSABSSA)
* Client blinding routine generating blinded message and preserving inverse
* Server blind signing routine over blinded message representative
* Client unblinding routine with built in signature verification
* Public signature verification using RSA_PSS and SHA384
* Supports all four RFC 9474 variants including randomized and deterministic options

### 4. Ed25519 Signatures (RFC 8032)
* Key pair generation from raw 32 byte seeds
* Deterministic 64 byte signatures
* Witness checkpoint signing and independent verification
* Auditor attestation report signing and verification
* URL safe base64 encoding and decoding utilities

### 5. Canonical Election Models
* BallotEvidenceRecord: himvote.ballot_evidence.v1
* CheckpointRecord: himvote.checkpoint.v1
* Enforces strict schema validations and forbids unexpected attributes

## Golden Test Vectors
All cryptographic functions and canonical records are validated against golden vectors located in packages/test_vectors:
* jcs_vectors.json
* merkle_vectors.json
* rsa_blind_vectors.json
* ed25519_vectors.json
* ballot_evidence_vectors.json
* checkpoint_vectors.json

## Quick Start

```python
from himvote_crypto import (
    canonicalize,
    client_blind,
    client_finalize,
    ed25519_sign,
    ed25519_verify,
    generate_ed25519_keypair,
    generate_rsa_keypair,
    leaf_hash,
    merkle_tree_hash,
    server_blind_sign,
    verify_inclusion,
    verify_rsa_blind_signature,
    BallotEvidenceRecord,
)

# 1. Deterministic JSON Canonicalization
payload = {"election_id": "univ_2026", "count": 100}
canon_bytes = canonicalize(payload)

# 2. Merkle Tree Operations
leaves = [b"leaf_one", b"leaf_two", b"leaf_three"]
root = merkle_tree_hash(leaves)

# 3. RSA Blind Signatures
sk, pk = generate_rsa_keypair(key_size=2048)
blinded_msg, secret, prepared = client_blind(pk, b"voter_credential")
blind_sig = server_blind_sign(sk, blinded_msg)
sig = client_finalize(pk, prepared, blind_sig, secret)
assert verify_rsa_blind_signature(pk, prepared, sig)

# 4. Ed25519 Signatures
priv, pub = generate_ed25519_keypair()
witness_sig = ed25519_sign(priv, canon_bytes)
assert ed25519_verify(pub, canon_bytes, witness_sig)
```
