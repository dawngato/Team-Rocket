# External Dependencies and Trust Boundaries

**Document Revision**: 2026.10  
**Classification**: Supply Chain & Third-Party Risk Analysis  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. External Dependencies Inventory

| Dependency Category | Technology / Library | Version Baseline | Security Function | Failure Mode / Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **Cryptographic Engine** | ElectionGuard / Belenios | Specification 1.0 | Homomorphic encryption & tally proofs | Mathematical zero-days; mitigated by offline test vectors |
| **Relational Storage** | PostgreSQL | 16.x | ACID nullifier locks and append-only outbox | DB crash or corruption; mitigated by Merkle hashing |
| **Consensus Anchor** | Ethereum (EVM) | Solidity 0.8.24 | Monotonic checkpoint finality | Chain reorganization; mitigated by 64-block confirmation depth |
| **Python Cryptography** | `cryptography`, `pycryptodome` | Latest stable | RSA blind signatures, Ed25519, SHA-256 | Native C binding vulnerabilities; mitigated by pin verification |
| **TypeScript Web Crypto** | Web Crypto API (SubtleCrypto) | W3C Standard | Client-side ballot encryption in browser | Browser sandbox escape; mitigated by CSP and SRI |
| **Campus Identity IdP** | SAML 2.0 / OIDC | Standard | Student identity verification before issuance | IdP account takeover; mitigated by MFA and issuance journals |

---

## 2. Trust Boundaries and Failure Isolation

```
                                [ External Campus SSO ]
                                           │
                                ┌──────────┴──────────┐
                                │   Identity Issuer   │
                                └──────────┬──────────┘
                                           │ (Blind Token)
 ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
 │ TRUST BOUNDARY 1                        │                        TRUST BOUNDARY 2 │
 ▼                                         ▼                                         ▼
[ Casting Gateway ] ──────────────► [ PostgreSQL DB ] ──────────────► [ Witness Quorum ]
        │                                                                    │
        ▼                                                                    ▼
[ Election Engine ]                                                 [ EVM Anchor Relayer ]
 (Homomorphic Tally)                                                  (Sepolia / Anvil)
```

### 2.1 Cryptographic Voting Engine Boundary
- **Trust Assumption**: HimVote assumes the homomorphic encryption implementation correctly implements ElGamal over verifiable cyclic groups.
- **Isolation**: HimVote treats the engine as an untrusted calculator. All engine outputs (encrypted ballots, partial decryptions, and tally proofs) are verified independently by the standalone verifier (`packages/verifier/verify_election.py`).

### 2.2 PostgreSQL Database Boundary
- **Trust Assumption**: ACID transaction guarantees and unique index constraints prevent race conditions.
- **Isolation**: Even if the database administrator is compromised, database records cannot be altered retroactively without invalidating the cryptographic Merkle tree root signed by external witnesses.

### 2.3 EVM RPC Provider Boundary
- **Trust Assumption**: RPC nodes return authentic block headers and broadcast transactions to miners/validators.
- **Isolation**: If an RPC node lies or experiences downtime, the relayer fails over to secondary RPC endpoints. The verification client checks transaction inclusion proofs directly on the EVM header log.
