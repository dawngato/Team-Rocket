# Cryptographic Security Architecture

**Document Revision**: 2026.10  
**Classification**: Cryptographic Primitives & Protocol Specifications  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Cryptographic Primitives & Standards Matrix

| Standard / Primitive | Protocol Function in HimVote | Implementation File | Verification State |
| :--- | :--- | :--- | :--- |
| **RFC 8785 (JCS)** | Canonical JSON serialization before all hashing & signing | `packages/canonical_json/`, `apps/web/src/lib/` | `CONFIRMED` |
| **RFC 9474 (RSABSSA)** | Blind signatures for unlinkable credential issuance | `services/identity_issuer/src/crypto.py` | `CONFIRMED` |
| **RFC 9162** | Merkle transparency tree & inclusion/consistency proofs | `services/witness/src/merkle.py` | `CONFIRMED` |
| **RFC 8032 (Ed25519)** | Digital signatures for witnesses, roster approvers, auditors | `services/common/crypto_utils.py` | `CONFIRMED` |
| **Argon2id** | Memory-hard password hashing for institutional admins | `services/admin_api/src/auth.py` | `CONFIRMED` |
| **SHA-256** | Cryptographic hash function for leaf and node digests | Universal | `CONFIRMED` |
| **EVM Smart Contract** | Monotonic checkpoint root anchoring on Ethereum | `contracts/src/HimVoteAnchor.sol` | `CONFIRMED` |

---

## 2. RFC 8785 JSON Canonicalization Scheme (JCS)

To guarantee that cryptographic signatures and Merkle root hashes evaluate identically across Python, TypeScript, and Go runtimes, all JSON structures must be canonicalized before digest computation.

### 2.1 Canonicalization Rules
1. **UTF-8 Encoding**: Character representation is strictly UTF-8 without byte-order marks.
2. **Whitespace Elimination**: Zero insignificant whitespace outside string literals (no spaces, newlines, or tabs between tokens).
3. **Dictionary Key Ordering**: Object keys are sorted lexicographically by their UTF-16 code units.
4. **Numeric Representation**: Strict IEEE 754 64-bit float formatting; integer values are formatted without exponent notation; leading zeros are prohibited.

### 2.2 Mathematical Specification
$$\text{Digest}(O) = \text{SHA-256}(\text{JCS}(O))$$

---

## 3. RFC 9474 Blind Signature Credential Protocol

HimVote decouples voter identity from ballot casting using RSA Blind Signatures for Anonymous Credentials (RFC 9474).

```
Voter Client                                              Identity Issuer
    │                                                            │
    │  1. Generate random message m and blinding factor r        │
    │  2. Compute blinded message: m' = (m * r^e) mod N          │
    │───────────────────────── m' ──────────────────────────────►│
    │                                                            │ 3. Verify voter on frozen roster
    │                                                            │ 4. Verify no previous issuance
    │                                                            │ 5. Sign: s' = (m')^d mod N
    │◄──────────────────────── s' ───────────────────────────────│
    │                                                            │
    │  6. Unblind signature: s = (s' * r^(-1)) mod N             │
    │  7. Verify: s^e mod N == m                                 │
    │                                                            │
(Token ready for casting without identity linkage)
```

### 3.1 Security Properties
1. **Unlinkability**: The Issuer observes only $m'$ during the ceremony. The unblinded signature $s$ and message $m$ presented to the Casting Gateway cannot be correlated with $m'$ without solving the RSA discrete logarithm problem.
2. **Unforgeability**: Voters cannot forge an unblinded token $s$ without possessing the Issuer private exponent $d$.

---

## 4. RFC 9162 Merkle Transparency Tree Construction

The casting ledger is structured as an append-only binary Merkle tree compliant with RFC 9162.

### 4.1 Leaf Hashing
Leaves are hashed using a `0x00` domain separation prefix over canonicalized RFC 8785 JSON bytes:
$$\text{MTH}(\text{leaf}) = \text{SHA-256}(0\text{x}00 \parallel \text{JCS}(\text{leaf\_record}))$$

### 4.2 Interior Node Hashing
Interior nodes are hashed using a `0x01` domain separation prefix over their left and right children:
$$\text{MTH}(A, B) = \text{SHA-256}(0\text{x}01 \parallel \text{MTH}(A) \parallel \text{MTH}(B))$$

### 4.3 Inclusion Proof Verification
An auditor or student verifies that a ballot leaf $L$ at index $i$ exists in a tree of size $N$ with root $R$ by reconstructing the path:
$$\text{VerifyProof}(L, i, N, \text{Path}, R) \in \{\text{TRUE}, \text{FALSE}\}$$
If any intermediate hash differs, the function fails closed and rejects the receipt.

---

## 5. Checkpoint Structure & EVM Anchoring

At regular intervals, the witness nodes construct a formal cryptographic Checkpoint:

```json
{
  "checkpoint_sequence": 42,
  "election_id": "demo_union_2026",
  "tree_size": 2840,
  "merkle_root": "sha256:b81d77a281c019d84f2c019d84e2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4a1",
  "timestamp_utc": "2026-10-31T04:00:00Z",
  "witness_signatures": [
    {
      "key_id": "witness-core-01",
      "signature": "ed25519:9a12b4e5d6c7..."
    }
  ]
}
```

This checkpoint is relayed to the EVM contract:
```solidity
function commitCheckpoint(
    string calldata electionId,
    uint256 sequenceNumber,
    uint256 treeSize,
    bytes32 merkleRoot,
    bytes calldata witnessAttestation
) external;
```
The contract enforces that `sequenceNumber == lastSequenceNumber + 1` and `treeSize >= lastTreeSize`, preventing rollback attacks and split-view equivocation.
