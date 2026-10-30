# HimVote Test Vectors Package

## Overview
Golden test vectors providing canonical verification material for HimVote implementations.
All implementations across Python, Kotlin, Swift, TypeScript, and C Sharp must match these vectors precisely.

## Standards and Mathematical Specifications
* RFC 8785: JSON Canonicalization Scheme JCS. Whitespace outside strings is prohibited. Dictionary keys sorted by UTF 16 code unit values. Floating point numbers prohibited.
* RFC 9162: Certificate Transparency and Merkle Tree Logging.
  * Leaf hash calculation: SHA256 over byte 0x00 concatenated with canonical leaf record bytes.
  * Node hash calculation: SHA256 over byte 0x01 concatenated with left child hash and right child hash.
  * Empty tree hash: SHA256 over empty byte string.
* RFC 9474: RSA Blind Signatures. Blinding factor r is chosen coprime to RSA modulus N.

## Test Vector Files
* ballot_evidence_vectors.json: Contains sequential canonical ballot evidence records, canonical JCS strings, canonical UTF 8 byte representations, and SHA256 leaf hashes.
* merkle_tree_vectors.json: Contains Merkle tree root hashes for tree sizes from 0 through 8, audit paths for leaf inclusion proofs, and consistency proofs across tree size transitions.
* blind_signature_vectors.json: Contains RSA 2048 key parameters, voter tokens, blinding factors, blinded requests, request digests, blind signature responses, unblinded signatures, and derived credential nullifiers.
* checkpoint_vectors.json: Contains incremental and final checkpoint records, canonical JCS serializations, checkpoint SHA256 digests, and independent witness Ed25519 signatures.
* canonical_ballot_evidence.json: Single canonical ballot record in strict RFC 8785 format without extraneous whitespace.
* checkpoint_record.json: Single canonical checkpoint record in strict RFC 8785 format without extraneous whitespace.
* verify_vectors.py: Standalone Python verification script validating all test vectors.

## Execution and Verification
To verify all test vectors execute:
python3 packages/test_vectors/verify_vectors.py
