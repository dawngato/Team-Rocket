# HIMVOTE — Security & Cryptographic Posture Status

**Date:** 2026-10-31  
**Auditor / Security Architect Review:** HimVote Engineering & Hardening Team  
**System Classification:** Educational Verifiable Voting Prototype (CodeForge 2.0 Question 07)

---

## 1. Cryptographic Boundary & Proof Evaluation

### Profile VEEM (Vetted Educational ElGamal Model)
- **Mathematical Basis:**
  - Discrete log ElGamal encryption over prime subgroup $(\mathbb{Z}_p^*, q, g)$ where $p = 2q + 1$ (2048-bit safe prime).
  - Ballots carry Chaum-Pedersen zero-knowledge equality proofs (DLEQ) and Cramer-Damgård-Schoenmakers disjunctive 1-out-of-2 zero-knowledge proofs ensuring selection validity $(v \in \{0, 1\})$ without opening plaintexts.
  - Voter privacy uses blinded token derivation and discrete-log nullifiers to decouple voter identity from ballot ciphertexts.
- **Verification Guarantee:**
  - All ciphertexts, sum proofs, and DLEQ decryption shares are validated deterministically by `verifier/verify.py` and `services/election_engine/adapter.py`.
  - Single-byte tampering causes immediate proof verification failure.
- **Operational Limitation Disclosure:**
  - Profile VEEM is an educational and reference ElGamal implementation. It is **not** an external multi-party computation ceremony (e.g. multi-trustee Helios or ElectionGuard with physical key distribution).
  - Production deployments require external multi-trustee threshold key generation before claiming distributed trust.

---

## 2. Immutability & Anti-Truncation Assurances

### RFC 9162 Merkle Tree Ledger
- Cast ballots are appended to an incremental RFC 9162 Merkle tree.
- The root hash is periodically committed to a signed checkpoint log.
- **PostgreSQL Database Triggers:**
  - Table `ballot_box`: protected by trigger `prevent_ballot_box_mutation()`. Any SQL `UPDATE` or `DELETE` query immediately aborts with `FEATURE_NOT_SUPPORTED`.
  - Table `evidence_store`: protected by trigger `prevent_evidence_mutation()`.
  - Result: Even with compromised operational database credentials, retroactive modification or deletion fails closed.

### Independent Witness Service
- Operates as a separate microservice (`witness/`) with dedicated cryptographic keypairs.
- Validates sequence monotonicity and Merkle consistency proofs before cosigning checkpoints.
- Rejects sequence gaps, backward tree sizes, and manifest digest mismatches.
- Hardened with explicit CORS whitelists (`cfg.allowed_origins`) avoiding wildcard exposures.

---

## 3. Defense Against Mandatory Q7 Threat Models

1. **Duplicate Cast:**
   - **Defense:** Single-cast nullifier uniqueness enforced by primary/unique key constraints in casting storage and checked in memory by the engine. Second attempts with the same credential nullifier are rejected with `DUPLICATE_NULLIFIER`.
2. **Unauthorized Insertion:**
   - **Defense:** Ballots without a valid, unblinded issuer signature matching an active election manifest are rejected prior to Merkle leaf insertion.
3. **Log Deletion:**
   - **Defense:** Database triggers abort deletions. In offline logs, Merkle consistency proofs detect any dropped leaves.
4. **Record Modification:**
   - **Defense:** Modifying any ciphertext or proof byte invalidates the Merkle leaf hash and zero-knowledge proof checks.
5. **Result Tampering:**
   - **Defense:** Homomorphic tallying is recomputed by the independent verifier from raw ciphertexts; any altered tally figure mismatches the decrypted aggregate factor.

---

## 4. Current Risk Matrix

| Risk Vector | Inherent Risk | Residual Risk | Status / Mitigation |
| :--- | :--- | :--- | :--- |
| Client-side State Manipulation | High | **Low** | Critical client paths fail closed; live API integration enforced. |
| In-flight Ballot Tampering | Critical | **Negligible** | ZK proofs + SHA-256 Merkle inclusion proofs detect all single-bit modifications. |
| Operational DB Impersonation | High | **Low** | DB immutability triggers block UPDATE/DELETE. |
| Cross-Origin Request Abuse | Medium | **Low** | Restricted CORS origins on witness and microservice endpoints. |
| Single Point of Trust | High | **Medium (Disclosed)**| Documented development profile VEEM; requires external MPC for multi-authority trust. |
