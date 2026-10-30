# CAMPUS VAULT — SECURITY & CRYPTOGRAPHIC SPECIFICATION

**Project:** Campus Vault — Secure University Election & Independent Verification Platform  
**Target Institution:** Veritas Metropolitan University (Educational Prototype)  
**Cryptographic Protocol Version:** 1.0  
**Hashing Standard:** SHA-256 (FIPS 180-4) with Domain Separation  
**Digital Signature Standard:** Ed25519 (RFC 8032 / Edwards-curve Digital Signature Algorithm)  

---

## 1. Threat Model & Adversary Profiles

Campus Vault is engineered under an explicit threat model that accounts for internal and external adversaries:

1. **Malicious Authenticated Students (Double Voting & Concurrency Attacks):**
   - *Adversary Goal:* Cast multiple ballots for a favored candidate across multiple browser tabs or racing automated HTTP requests.
   - *Mitigation:* Database-level isolation transactions (`prisma.$transaction`) and unique constraints on `(electionId, userId)` guarantee atomic check-and-consume behavior. Duplicate attempts trigger security audit events and are rejected.

2. **Unregistered or Ineligible Users:**
   - *Adversary Goal:* Cast votes without being registered for the specific election or department.
   - *Mitigation:* Strict server-side verification against the `VoterEligibility` record. Client-supplied eligibility flags are ignored.

3. **Rogue Database / Application Administrator:**
   - *Adversary Goal:* Silently inject fictitious ballots, delete unfavorable ballots, or modify candidate choices after submission.
   - *Mitigation:* All accepted ballots are committed into a deterministic SHA-256 Merkle tree. Any insertion, deletion, or modification alters the Merkle root. Checkpoints containing the root and sequence numbers are digitally signed with an Ed25519 private key. The standalone verifier detects root and tally mismatches immediately.

4. **Public Network Observers & Coercers:**
   - *Adversary Goal:* Eavesdrop on network communication to discover voter choices, or demand proof of vote from a student (vote buying/coercion).
   - *Mitigation:* Ballot receipts contain ONLY non-revealing tracking hashes and Merkle path proofs. The candidate choice is never included in the receipt. A voter cannot use their receipt to prove their candidate choice to a third party.

---

## 2. Privacy Boundary & Identity Decoupling

Separating voter identity from voting choices is enforced at the schema and protocol layer:

```
[Student Account]
       │
       ▼
[VoterEligibility] ───────► Stores: studentId, userId, hasVoted, receiptCode
(Authentication Plane)     NO candidate selection stored here.
       │
       ▼ (Atomically decoupled during database transaction)
       │
[AcceptedBallot]   ───────► Stores: ballotId, candidateId, leafHash, leafIndex, receiptHash
(Cryptographic Plane)      NO studentId, userId, or IP address stored here.
```

- **Receipt Tracking Hash:** `receiptHash = SHA256(receiptCode)`.
- When a student checks their receipt, the server confirms that `receiptHash` exists at `leafIndex` in the Merkle tree and returns sibling hashes to reconstruct the root. At no point is the student's candidate identity revealed.

---

## 3. Merkle Tree & Domain Separation

To prevent length extension and second-preimage collision attacks:
- **Leaf Prefix:** `CV:LEAF:v1:`
- **Internal Node Prefix:** `CV:NODE:v1:`
- **Empty Tree Root:** `SHA256("CV:EMPTY_TREE:v1:")`

### Canonical Leaf Serialization:
```json
{"ballotId":"...","candidateId":"...","electionId":"...","receiptHash":"...","version":"1.0"}
```
All JSON keys are canonically sorted with zero extraneous whitespace prior to hashing.

---

## 4. Standalone Independent Verification

The verification script (`scripts/verify_election.py`) runs independently of the web application server:
```bash
python scripts/verify_election.py \
  --manifest artifacts/elec-senate-2026-rep/election_manifest.json \
  --ballots artifacts/elec-senate-2026-rep/accepted_ballots.jsonl \
  --checkpoint artifacts/elec-senate-2026-rep/signed_checkpoint.json \
  --public-key artifacts/elec-senate-2026-rep/trusted_auditor_public_key.pem
```

The script executes 7 independent mathematical checks:
1. Manifest artifact schema consistency.
2. Checkpoint Ed25519 digital signature validation against the trusted auditor public key.
3. Duplicate ballot ID check across JSONL records.
4. Candidate reference validation against the manifest.
5. Exact ballot count match against the signed checkpoint.
6. Complete Merkle root reconstruction from leaves.
7. Independent tally recomputation and comparison against the published result.

---

## 5. Trust Assumptions & Honest Limitations

1. **Trust Anchors:** The standalone verifier must be supplied with an independently trusted auditor public key (`trusted_auditor_public_key.pem`). If an attacker replaces both the checkpoint signature and the auditor public key in the auditor's own trust store, verification cannot detect the substitution.
2. **Client Endpoint Security:** A compromised personal computer or mobile browser could intercept or alter user keystrokes before encryption and transmission.
3. **Metadata & Timing Attacks:** On low-volume installations, an attacker monitoring microsecond database commit timestamps could potentially correlate voter check-in times with ballot insertion times.
4. **Educational Prototype Status:** This platform is designed for research, academic evaluation, and cybersecurity hackathons. It is not certified for high-stakes government general elections.
