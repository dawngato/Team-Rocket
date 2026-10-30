# Honest Security Disclosures

**Document Date**: 31 October 2026  
**Auditor**: HimVote Autonomous Security Documentation Agent  
**Standard**: Honest Cryptographic Disclosure & Non-Exaggeration Policy  

---

## 1. Non-Exaggeration Policy & Prohibited Terminology

In accordance with strict cryptographic review standards, the HimVote platform, its architects, documentation, and maintainers explicitly prohibit the use of the following misleading terms:

| Prohibited Term | Why It Is Deceptive in Electronic Voting | Approved Technical Alternative |
| :--- | :--- | :--- |
| **"Unhackable"** | Ignores physical endpoint compromise, firmware rootkits, and social engineering. | *"Hardened against remote tampering with independent verification."* |
| **"100% Secure"** | Security is an operational risk profile, not a boolean state. | *"Mathematically bounded security assuming honest cryptographic parameters."* |
| **"Impossible to Compromise"** | Side-channel attacks, key exposure, and timing correlation remain perpetual risks. | *"Resistant to single-point compromise under defined threshold assumptions."* |
| **"Completely Anonymous"** | Network metadata, device telemetry, and timing can leak correlation. | *"Pseudonymous and unlinkable under computational blind signature assumptions."* |
| **"Guaranteed Election Integrity"** | Integrity is subject to verifier participation and honest witness thresholds. | *"End-to-End Verifiable (E2E-V) with auditable public transparency logs."* |

---

## 2. What HimVote Can Cryptographically Prove

When configured and operated according to protocol parameters, HimVote provides mathematical and structural evidence for the following properties:

### 2.1 Single-Cast Invariant (`CONFIRMED`)
- **Evidence**: Unique nullifier enforcement in the `accepted_encrypted_ballots` and `nullifiers_to_leaf` tables (`services/casting/src/service.py`).
- **Proof**: Concurrent and sequential submissions of the same credential nullifier trigger an atomic database transaction abort, permitting identical safe retries but unconditionally rejecting any differing ballot with HTTP 409 Conflict.
- **Test Evidence**: Automated suite `tests/security/reports/Q7_01_duplicate_submission.json` demonstrates 100/100 race attempts resulting in exactly 1 accepted leaf.

### 2.2 Tamper-Evident Record Integrity (`CONFIRMED`)
- **Evidence**: RFC 9162 append-only Merkle transparency tree evaluated using SHA-256 over RFC 8785 canonicalized JSON leaf bytes.
- **Proof**: Modifying, inserting, deleting, or reordering any ballot leaf in the database invalidates the root hash calculated by independent verifiers and triggers an immediate verification failure.
- **Test Evidence**: Test reports `Q7_02_unauthorized_insertion.json`, `Q7_03_deletion.json`, and `Q7_04_modification.json` confirm root mismatch detection across all test runs.

### 2.3 Decoupled Identity and Ballot Flow (`CONFIRMED`)
- **Evidence**: Separate database clusters (`identity_issuer` and `casting`) with zero shared primary keys, foreign keys, or database links.
- **Proof**: The identity service signs an RSA blind message (`RFC 9474`). The voter unblinds the token locally. When cast to the casting service, the token proves eligibility without revealing student identity or authentication credentials.

### 2.4 Independent Offline Auditability (`CONFIRMED`)
- **Evidence**: Standalone audit verifier script (`packages/verifier/verify_election.py`) executes in an air-gapped environment without network access.
- **Proof**: Evaluates manifest digests, roster attestations, Merkle inclusion proofs, and tally homomorphic sums without calling any HimVote microservice API.

---

## 3. What HimVote Cannot Prove (Honest Disclosures)

Independent auditors, election administrators, and voters must understand that HimVote **cannot** guarantee the following conditions:

### 3.1 Physical Voter Coercion
- **Disclosure**: Cryptography cannot prevent a physical adversary standing over a voter's shoulder in a dorm or private residence from coercing their vote.
- **Boundary**: Coercion-resistance mechanisms like Selene or JCJ require special untracked physical registration ceremonies or fake credentials, which are not implemented in this educational version.

### 3.2 Compromised Voter Personal Devices
- **Disclosure**: If a voter's laptop, phone, or tablet is infected with malware, a keylogger, or a screen recorder, candidate selections can be intercepted before client-side encryption.
- **Boundary**: Endpoint security is an external dependency of the voter's hardware and OS integrity.

### 3.3 Traffic Analysis and Timing Correlation
- **Disclosure**: If a passive network adversary monitors ISP or campus Wi-Fi traffic, they may correlate the exact millisecond a student authenticated against `identity_issuer` with the subsequent casting request to `casting_gateway`.
- **Mitigation Requirement**: True unlinkability in high-threat environments requires Tor, Mixnets, or batch delays. HimVote currently relies on standard TLS 1.3 with recommended token holding delays.

### 3.4 Small Electorate Deanonymization
- **Disclosure**: If a departmental election has a unanimous result (e.g., 100% of 12 voters choose Candidate A), tally privacy is mathematically impossible regardless of encryption.
- **Mitigation**: The system flags contests below the privacy threshold as `PRIVACY_LIMITED`.

### 3.5 Operational Key Custody
- **Disclosure**: If election administrators store witness private keys or issuer signing keys on the same host or share root access across microservices, the mathematical independence of the multi-witness architecture collapses into an administrative monoculture.
