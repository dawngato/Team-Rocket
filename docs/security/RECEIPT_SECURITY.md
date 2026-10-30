# Election Receipt Security and Verification

**Document Revision**: 2026.10  
**Classification**: Individual Verifiability & Receipt-Freeness Analysis  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Receipt Anatomy & Structure

When a voter successfully casts an encrypted ballot, the Casting Gateway issues a cryptographic Receipt:

```json
{
  "handle": "rcpt_7f8a9b0c1d2e3f4a5b6c7d8e9f012345",
  "leaf_index": 2839,
  "status": "WITNESSED",
  "witnessed_at_utc": "2026-10-31T04:12:00Z",
  "leaf_hash": "sha256:d84f2c019d84e2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4a1b2c3d4e5f60718",
  "merkle_root": "sha256:b81d77a281c019d84f2c019d84e2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4a1",
  "tree_size": 2840,
  "merkle_proof": [
    "sha256:a1b2c3d4...",
    "sha256:e5f60718...",
    "sha256:9f8a3c20..."
  ],
  "chain_tx_hash": "0x7f4e91c2a8f0d365e1029384756cba9182736450f1e2d3c4b5a6978102f9e8d7"
}
```

---

## 2. Receipt Lifecycle & Four Verification States

To prevent premature claims of security in the user interface, receipts progress through four strictly defined states:

```
[ State 1: SUBMITTED ] 
   │ • Gateway received ballot over HTTPS
   │ • Schema and blind signature validated
   ▼
[ State 2: ACCEPTED ]
   │ • Nullifier locked in PostgreSQL database
   │ • Ballot leaf committed to outbox
   ▼
[ State 3: WITNESSED ]
   │ • Witness nodes processed leaf into RFC 9162 Merkle tree
   │ • Checkpoint root signed by witness quorum
   ▼
[ State 4: ANCHORED ]
   │ • Relayer posted checkpoint transaction to EVM smart contract
   │ • 64+ block confirmations reached on consensus layer
```

---

## 3. Receipt-Freeness and Anti-Coercion Analysis

### 3.1 What the Receipt Proves (Individual Verifiability)
- **Cast-as-Intended**: By retaining the encryption randomness locally on the device during voting, the voter can verify that the ciphertext corresponds to their candidate choice.
- **Recorded-as-Cast**: The Merkle inclusion proof verifies that the ballot leaf hash exists at `leaf_index` under the witnessed root.
- **Tallied-as-Recorded**: The final tally proof demonstrates that all leaves in the witnessed tree were included in the homomorphic sum.

### 3.2 What the Receipt Hides (Receipt-Freeness)
- The receipt contains **zero plaintext candidate choices**, **zero voter identifiers**, and **zero decryption keys**.
- An adversary presented with this receipt can verify that the student voted and that their ballot was counted, but **cannot** determine *who* the student voted for. This protects the voter from ex-post bribery or retaliation.
