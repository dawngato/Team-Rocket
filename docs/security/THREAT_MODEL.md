# System Threat Model

**Document Date**: 31 October 2026  
**Auditor**: HimVote Autonomous Security Documentation Agent  
**Framework**: STRIDE / Defense-in-Depth for Electronic Voting Systems  
**Scope**: 19 Formal Threat Profiles  

---

## 1. Threat Matrix Overview

```
                                      ┌────────────────────────────────┐
                                      │       Threat Categories        │
                                      └────────────────┬───────────────┘
                                                       │
         ┌─────────────────────┬───────────────────────┼───────────────────────┬──────────────────────┐
         ▼                     ▼                       ▼                       ▼                      ▼
[ Voter & Endpoint ]   [ Authentication ]      [ Network & Timing ]    [ Cryptographic Log ]  [ Consensus & Ops ]
 • Coercion             • Credential Theft      • Traffic Analysis      • Merkle Tampering     • Chain Reorg
 • Device Compromise    • Phishing              • Timing Correlation    • Checkpoint Equiv.    • Engine Flaws
 • Malware & Loggers    • Unauthorized Issuance • Metadata Leakage      • Replay & Duplicates  • Admin Abuse
```

---

## 2. Comprehensive Threat Profiles

### Threat 01: Physical Voter Coercion and Vote Buying
- **THREAT NAME**: Physical Voter Coercion and Vote Buying
- **THREAT CLASSIFICATION**: External / Physical / Social Engineering
- **ATTACK SCENARIO**: An adversary physically intimidates a student in a private residence or pays a voter to select a specific candidate on their personal device while actively supervising the submission.
- **AFFECTED COMPONENTS**: Voter Interface (`apps/web`, `apps/linux`), Browser Session.
- **POTENTIAL IMPACT**: Loss of free ballot choice; distortion of election outcomes.
- **CURRENT MITIGATION**: Receipt handles hide candidate selections, preventing ex-post vote-selling (the voter cannot prove who they voted for to a buyer after leaving).
- **RESIDUAL RISK**: Real-time shoulder surfing cannot be prevented by software without supervised physical voting booths.
- **VERIFICATION STATUS**: `CONFIRMED` (Receipt hiding verified in `apps/web/tests/student_receipt_flow.test.ts`).
- **RECOMMENDED IMPROVEMENT**: Deploy supervised physical kiosk booths running the Linux kiosk client for contested elections.

---

### Threat 02: Compromised Voter Personal Devices
- **THREAT NAME**: Compromised Personal Devices
- **THREAT CLASSIFICATION**: Endpoint Security / Operating System Tampering
- **ATTACK SCENARIO**: A voter's personal computer has an infected OS with modified root certificates, compromised browser extensions, or remote access software.
- **AFFECTED COMPONENTS**: Client Browser runtime, Device Memory.
- **POTENTIAL IMPACT**: Interception of voter choices prior to client-side encryption; manipulation of unencrypted payloads.
- **CURRENT MITIGATION**: Strict Content Security Policy (CSP), subresource integrity checks, isolated iframe boundaries, and standalone desktop client option.
- **RESIDUAL RISK**: Root-level attackers control memory and can manipulate the user display.
- **VERIFICATION STATUS**: `PARTIALLY VERIFIED` (CSP and client tests pass; rootkit resistance unverified).
- **RECOMMENDED IMPROVEMENT**: Provide hardware token authentication and live-USB bootable voting images.

---

### Threat 03: Client Malware and Keyloggers
- **THREAT NAME**: Client Malware and Keyloggers
- **THREAT CLASSIFICATION**: Endpoint Security / Malicious Code Execution
- **ATTACK SCENARIO**: A background spyware process logs user mouse clicks, touch events, or keystrokes while the voter selects candidates on screen.
- **AFFECTED COMPONENTS**: Web input handlers, UI selection components.
- **POTENTIAL IMPACT**: Deanonymization of ballot choices prior to encryption.
- **CURRENT MITIGATION**: Randomized candidate card display order; direct touch/click selection without typed plaintext candidate names.
- **RESIDUAL RISK**: Advanced screen-recording malware records coordinate clicks matching the visual DOM layout.
- **VERIFICATION STATUS**: `CONFIRMED` (Randomized display order verified in UI unit tests).
- **RECOMMENDED IMPROVEMENT**: Implement dynamic visual coordinate scrambling or out-of-band verification.

---

### Threat 04: Credential Theft
- **THREAT NAME**: Credential Theft
- **THREAT CLASSIFICATION**: Authentication / Credential Hijacking
- **ATTACK SCENARIO**: An adversary steals a student's institutional login credentials (password, SSO session token) via session hijacking or device theft.
- **AFFECTED COMPONENTS**: `services/identity_issuer`, Institutional SSO IdP.
- **POTENTIAL IMPACT**: Unauthorized issuance of a voting token on behalf of an eligible voter; voter disenfranchisement.
- **CURRENT MITIGATION**: Multi-factor authentication (TOTP/WebAuthn), short-lived issuance sessions, and append-only issuance journal recording issuance timestamps.
- **RESIDUAL RISK**: Stolen valid MFA sessions allow one-time credential acquisition before the victim notices.
- **VERIFICATION STATUS**: `CONFIRMED` (MFA session revocation verified in identity issuer test suite).
- **RECOMMENDED IMPROVEMENT**: Send instant SMS/email issuance alerts allowing voters to flag disputed issuances before election closure.

---

### Threat 05: Identity Phishing
- **THREAT NAME**: Identity Phishing
- **THREAT CLASSIFICATION**: Social Engineering / Network Spoofing
- **ATTACK SCENARIO**: An attacker distributes fraudulent emails mimicking university election notices directing students to a counterfeit login domain to harvest SSO credentials.
- **AFFECTED COMPONENTS**: Voter Authentication Portal, DNS, Email Gateway.
- **POTENTIAL IMPACT**: Mass collection of student login credentials.
- **CURRENT MITIGATION**: WebAuthn/FIDO2 hardware-bound authentication support (domain-bound origin validation prevents credential reuse on rogue domains).
- **RESIDUAL RISK**: Passwords and legacy TOTP codes remain vulnerable if institutional IdP permits non-FIDO2 fallbacks.
- **VERIFICATION STATUS**: `PARTIALLY VERIFIED` (WebAuthn origin checks implemented in web client; university IdP settings dependent on deployment).
- **RECOMMENDED IMPROVEMENT**: Mandate strict WebAuthn/FIDO2 keys without SMS/password fallbacks for campus elections.

---

### Threat 06: Unauthorized Credential Issuance
- **THREAT NAME**: Unauthorized Credential Issuance
- **THREAT CLASSIFICATION**: Authorization Bypass / Privilege Abuse
- **ATTACK SCENARIO**: A compromised identity issuer administrator attempts to generate extra blind tokens for non-existent students or unenrolled accounts.
- **AFFECTED COMPONENTS**: `services/identity_issuer/src/service.py`, Roster Database.
- **POTENTIAL IMPACT**: Padding the voter pool with illegitimate ballots.
- **CURRENT MITIGATION**: Strict Roster Freeze Attestation Ceremony. The voter roster is cryptographically hashed and signed by an independent Roster Approver key (`RFC 8785` digest) before the election opens. No token can be issued without matching an entry on the signed roster.
- **RESIDUAL RISK**: If the Roster Approver key colludes with the Identity Issuer key, unauthorized roster entries could be introduced before the freeze.
- **VERIFICATION STATUS**: `CONFIRMED` (Roster attestation verified in `tests/test_roster_attestation.py`).
- **RECOMMENDED IMPROVEMENT**: Multi-signature threshold roster freeze requiring 3 of 5 independent student union and administrative keys.

---

### Threat 07: Insider Threats (Database Administrator Tampering)
- **THREAT NAME**: Insider Threats / Database Tampering
- **THREAT CLASSIFICATION**: Malicious Administrator / Direct SQL Manipulation
- **ATTACK SCENARIO**: A database administrator with root access directly executes SQL statements to alter votes in the `accepted_encrypted_ballots` table.
- **AFFECTED COMPONENTS**: PostgreSQL database, Database tables.
- **POTENTIAL IMPACT**: Falsification of cast ballots.
- **CURRENT MITIGATION**: Merkle transparency tree. Ballots are committed into an append-only RFC 9162 Merkle log witnessed by independent external nodes. Any manual SQL edit breaks the Merkle root hash.
- **RESIDUAL RISK**: The DBA can cause a denial-of-service by corrupting database state.
- **VERIFICATION STATUS**: `CONFIRMED` (Automated tests `Q7_03_deletion` and `Q7_04_modification` prove that SQL tampering breaks Merkle verification).
- **RECOMMENDED IMPROVEMENT**: Immutable write-once cloud audit storage with cryptographic hardware signing.

---

### Threat 08: Institutional Collusion
- **THREAT NAME**: Institutional Collusion
- **THREAT CLASSIFICATION**: Multi-Party Compromise / Systemic Corruption
- **ATTACK SCENARIO**: University administrators, casting service operators, and witness nodes conspire together to fabricate election results.
- **AFFECTED COMPONENTS**: All HimVote services (`identity_issuer`, `casting`, `witness`, `anchor_relayer`).
- **POTENTIAL IMPACT**: Subversion of democratic process without software alerts.
- **CURRENT MITIGATION**: Public verifiable evidence package export. The election package can be audited by third-party external observers using the standalone offline verifier (`packages/verifier`). If public observers hold pinned keys, rogue results cannot be certified.
- **RESIDUAL RISK**: Colluding actors could withhold the evidence archive entirely, causing election failure.
- **VERIFICATION STATUS**: `CONFIRMED` (Offline verifier successfully audits evidence independently of all server nodes).
- **RECOMMENDED IMPROVEMENT**: Distribute witness nodes to external non-profit organizations outside university jurisdictional control.

---

### Threat 09: Network Traffic Analysis
- **THREAT NAME**: Network Traffic Analysis
- **THREAT CLASSIFICATION**: Passive Eavesdropping / Side-Channel Analysis
- **ATTACK SCENARIO**: An adversary monitoring network traffic observes packet sizes, packet counts, and transport flows between clients and microservices.
- **AFFECTED COMPONENTS**: TLS Termination layer, Network switches.
- **POTENTIAL IMPACT**: Inferring voter activity or candidate selection based on differential ciphertext sizes.
- **CURRENT MITIGATION**: Uniform ciphertext padding. All encrypted ballot payloads are padded to a constant fixed byte length (`RFC 8785` canonicalization + fixed-width serialization).
- **RESIDUAL RISK**: Traffic presence (knowing that a user voted) remains observable to local network administrators.
- **VERIFICATION STATUS**: `CONFIRMED` (Ballot padding verified in `packages/test_vectors/`).
- **RECOMMENDED IMPROVEMENT**: Implement dummy traffic generation and Tor / Onion routing client support.

---

### Threat 10: Timing Correlation
- **THREAT NAME**: Timing Correlation
- **THREAT CLASSIFICATION**: Side-Channel / Metadata Correlation
- **ATTACK SCENARIO**: An adversary records the exact millisecond a student acquires a credential from `identity_issuer` and correlates it with a ballot submission arriving at `casting` 300ms later.
- **AFFECTED COMPONENTS**: Client dispatch logic, API logging.
- **POTENTIAL IMPACT**: Linking real identity to ballot leaf index.
- **CURRENT MITIGATION**: Recommended asynchronous holding delay; decoupled network paths; no IP addresses or student IDs logged in the casting database.
- **RESIDUAL RISK**: Low voter volume allows statistical correlation if issuance and casting occur in immediate sequence.
- **VERIFICATION STATUS**: `PARTIALLY VERIFIED` (No IP stored verified in `services/casting/src/models.py`; automated delay enforcement optional in client).
- **RECOMMENDED IMPROVEMENT**: Enforce mandatory client-side random jitter delay (e.g., 5 to 60 seconds) between issuance and casting.

---

### Threat 11: Metadata Leakage (HTTP Headers and Logging)
- **THREAT NAME**: Metadata Leakage
- **THREAT CLASSIFICATION**: Information Disclosure / Infrastructure Misconfiguration
- **ATTACK SCENARIO**: Reverse proxies or application logs record client IP addresses, User-Agent strings, or session cookies in the casting service access logs.
- **AFFECTED COMPONENTS**: Nginx / Caddy reverse proxies, application logger.
- **POTENTIAL IMPACT**: De-anonymization of voters via server log forensics.
- **CURRENT MITIGATION**: Reverse proxy header redaction; casting database schema contains no IP or User-Agent columns; strict logging filters redact sensitive headers.
- **RESIDUAL RISK**: Misconfigured load balancers upstream might retain access logs unless explicitly sanitized.
- **VERIFICATION STATUS**: `CONFIRMED` (Casting schema verified in PostgreSQL migration scripts).
- **RECOMMENDED IMPROVEMENT**: Deploy ephemeral in-memory proxy buffers with disabled access log writes for the casting gateway.

---

### Threat 12: Replay Attacks
- **THREAT NAME**: Replay Attacks
- **THREAT CLASSIFICATION**: Network Tampering / Message Replay
- **ATTACK SCENARIO**: An attacker captures a valid voter submission payload and resubmits it repeatedly across the network.
- **AFFECTED COMPONENTS**: `services/casting/src/routes.py`, Ingress API.
- **POTENTIAL IMPACT**: State exhaustion, denial-of-service, or corrupting log indices.
- **CURRENT MITIGATION**: Strict idempotency key checking and nullifier uniqueness. Re-submitting an identical payload returns the cached receipt handle; re-submitting an altered payload with the same nullifier is rejected with HTTP 409.
- **RESIDUAL RISK**: Network bandwidth consumption from flooded requests.
- **VERIFICATION STATUS**: `CONFIRMED` (Replay handling verified in `tests/integration/test_protocol_casting.py`).
- **RECOMMENDED IMPROVEMENT**: Add short-lived challenge-response nonces to casting requests.

---

### Threat 13: Duplicate Voting (Double-Casting)
- **THREAT NAME**: Duplicate Voting
- **THREAT CLASSIFICATION**: Protocol Violation / Integrity Violation
- **ATTACK SCENARIO**: A voter attempts to cast two different ballots using the same issued credential, or launches concurrent race requests across multiple browser tabs.
- **AFFECTED COMPONENTS**: `services/casting/src/service.py`, Database row locking.
- **POTENTIAL IMPACT**: Ballot stuffing; skewing election results.
- **CURRENT MITIGATION**: PostgreSQL atomic row-level nullifier locking with unique index constraints (`nullifiers_to_leaf`).
- **RESIDUAL RISK**: None under standard PostgreSQL ACID guarantees.
- **VERIFICATION STATUS**: `CONFIRMED` (Automated stress test `Q7_01_duplicate_submission.json` confirmed 100/100 duplicate race rejections).
- **RECOMMENDED IMPROVEMENT**: Maintain current verified architecture.

---

### Threat 14: Denial-of-Service (DoS / DDoS)
- **THREAT NAME**: Denial-of-Service (DoS / DDoS)
- **THREAT CLASSIFICATION**: Availability / Resource Exhaustion
- **ATTACK SCENARIO**: A botnet floods the casting API with volumetric traffic, or an attacker submits large malformed JSON payloads to exhaust server CPU and RAM.
- **AFFECTED COMPONENTS**: API Gateway, FastAPI web server, Database connections.
- **POTENTIAL IMPACT**: Voters cannot cast ballots before the election closure deadline.
- **CURRENT MITIGATION**: Rate limiting middleware, strict Pydantic payload size limits (100KB max payload), connection pooling limits, and offline ballot queue support.
- **RESIDUAL RISK**: Volumetric network saturation upstream of server infrastructure.
- **VERIFICATION STATUS**: `PARTIALLY VERIFIED` (Rate limiting and Pydantic bounds verified in unit tests; volumetric DDoS requires external CDN/WAF).
- **RECOMMENDED IMPROVEMENT**: Integrate Cloudflare Magic Transit or AWS Shield with Anycast routing.

---

### Threat 15: Merkle Log Manipulation
- **THREAT NAME**: Merkle Log Manipulation
- **THREAT CLASSIFICATION**: Log Tampering / Historical Revisionism
- **ATTACK SCENARIO**: An attacker gains access to the casting storage and attempts to reorder, replace, or truncate ballot records.
- **AFFECTED COMPONENTS**: RFC 9162 Merkle log implementation, `services/witness`.
- **POTENTIAL IMPACT**: Removal or alteration of legitimate votes.
- **CURRENT MITIGATION**: Cryptographic Merkle tree hash chaining. Every leaf computation includes `hash(0x00 || RFC8785_canonical_bytes)`. Independent witness nodes periodically cosign the Merkle root digest (`RFC 9162`).
- **RESIDUAL RISK**: Attacks detected after the fact; system enters a halted dispute state.
- **VERIFICATION STATUS**: `CONFIRMED` (Verified in `tests/security/test_core_integrity.py`).
- **RECOMMENDED IMPROVEMENT**: Continuous multi-witness gossiping protocol for instant tampering alerts.

---

### Threat 16: Checkpoint Equivocation (Split-View Attacks)
- **THREAT NAME**: Checkpoint Inconsistency / Split-View Attacks
- **THREAT CLASSIFICATION**: Man-in-the-Middle / State Forking
- **ATTACK SCENARIO**: A malicious server shows one version of the Merkle tree to the public and a different version containing falsified votes to the audit verifier.
- **AFFECTED COMPONENTS**: `services/witness`, Verification Clients.
- **POTENTIAL IMPACT**: Verifier validates a false ledger while voters observe a different state.
- **CURRENT MITIGATION**: EVM Smart Contract Anchoring (`HimVoteAnchor.sol`). Checkpoint roots must be committed monotonically to the blockchain. An adversary cannot equivocate two different roots for the same checkpoint sequence number on-chain.
- **RESIDUAL RISK**: Chain reorganizations on weak networks could temporarily obscure finalized state.
- **VERIFICATION STATUS**: `CONFIRMED` (Foundry test suite `chain_foundry.json` verifies monotonicity and anti-rollback enforcement).
- **RECOMMENDED IMPROVEMENT**: Multi-chain dual-anchoring (e.g., Ethereum Mainnet + Arbitrum/Polygon).

---

### Threat 17: External Voting Engine Compromise
- **THREAT NAME**: External Voting Engine Compromise
- **THREAT CLASSIFICATION**: Cryptographic Dependency / Engine Flaw
- **ATTACK SCENARIO**: A zero-day vulnerability in the ElectionGuard or Belenios encryption routine allows an attacker to decrypt ballots without trustee keys or forge zero-knowledge proofs of validity.
- **AFFECTED COMPONENTS**: `packages/test_vectors/`, `services/election_engine`.
- **POTENTIAL IMPACT**: Loss of ballot privacy or unverified ballot insertion.
- **CURRENT MITIGATION**: Standardized test vector compliance checks (`PHASE0_VECTOR_AGREEMENT`) validating mathematical proofs against reference implementations.
- **RESIDUAL RISK**: Upstream mathematical zero-days in cryptographic libraries.
- **VERIFICATION STATUS**: `CONFIRMED` (Vector agreement verified in `phase0_vector_agreement.json`).
- **RECOMMENDED IMPROVEMENT**: Support pluggable dual-engine verification (e.g., ElectionGuard + Belenios cross-verification).

---

### Threat 18: Blockchain Reorganization and Finality Failures
- **THREAT NAME**: Blockchain Reorganization and Finality Failures
- **THREAT CLASSIFICATION**: Consensus Failure / External Dependency
- **ATTACK SCENARIO**: The underlying EVM network experiences a deep consensus reorganization, dropping the block that contained the election finality checkpoint anchor.
- **AFFECTED COMPONENTS**: `services/anchor_relayer`, EVM Smart Contract.
- **POTENTIAL IMPACT**: Invalidation of on-chain evidence transaction hashes.
- **CURRENT MITIGATION**: The anchor relayer monitors confirmation depth (minimum 64 blocks on PoS Ethereum) before declaring a checkpoint finalized.
- **RESIDUAL RISK**: Complete network halt or catastrophic long-range attack on testnet.
- **VERIFICATION STATUS**: `PARTIALLY VERIFIED` (Confirmation logic tested in local Anvil harness; public mainnet testing required for production).
- **RECOMMENDED IMPROVEMENT**: Anchor checkpoints to Bitcoin (via OpenTimestamps) in addition to Ethereum.

---

### Threat 19: Administrative Privilege Abuse
- **THREAT NAME**: Administrative Privilege Abuse
- **THREAT CLASSIFICATION**: Insider Threat / Authorization Escalation
- **ATTACK SCENARIO**: A system administrator uses administrative APIs to prematurely open or close an election, change election metadata, or reset election states.
- **AFFECTED COMPONENTS**: `services/admin_api`, Administrative UI.
- **POTENTIAL IMPACT**: Premature poll closure; suppression of voter turnout.
- **CURRENT MITIGATION**: Strict finite state machine (`DRAFT -> PUBLISHED -> OPEN -> CLOSED -> TALLIED -> FINALIZED`). Transitions are irreversible and require signed dual-authorization for state changes.
- **RESIDUAL RISK**: Compromised administrative credentials can trigger premature closure, though they cannot modify previously cast ballots.
- **VERIFICATION STATUS**: `CONFIRMED` (State machine lifecycle guards verified in `docs/elections/STATE_MACHINE.md` and admin tests).
- **RECOMMENDED IMPROVEMENT**: Enforce multi-party threshold approvals (M-of-N keys) for election close actions.
