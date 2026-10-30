# Security Recommendations and Future Improvements

**Document Revision**: 2026.10  
**Classification**: Continuous Hardening & Security Backlog  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Recommendations Summary Matrix

| ID | Title | Priority | Category | Implementation Effort |
| :--- | :--- | :--- | :--- | :--- |
| **REC-01** | Multi-Witness Gossip & Split-View Real-Time Alerting | **CRITICAL** | Protocol / Distributed Consensus | High (Code Changes Required) |
| **REC-02** | Hardware Security Module (HSM) Witness Key Enforcement | **HIGH** | Key Management / Custody | Medium (Operational & Infra) |
| **REC-03** | Automated Client-Side Random Timing Jitter | **HIGH** | Voter Privacy / Traffic Analysis | Low (Client Code Change) |
| **REC-04** | Dual-Chain Anchor Multi-Relay (Ethereum + Bitcoin/Polygon) | **MEDIUM** | Finality / Anti-Censorship | Medium (Contract & Relayer) |
| **REC-05** | Tor / Onion Routing Support for Client Booths | **MEDIUM** | Network Anonymity | Medium (Infrastructure) |
| **REC-06** | Hardware-Bound WebAuthn/FIDO2 Issuance Enforcement | **LOW** | Authentication Hardening | Low (Configuration Change) |
| **REC-07** | Automated Dependency Vulnerability Scanning in CI | **INFORMATIONAL** | DevSecOps / Supply Chain | Low (GitHub Actions Config) |

---

## 2. Detailed Technical Recommendations

### REC-01: Multi-Witness Gossip & Real-Time Split-View Alerting
- **Severity**: **CRITICAL**
- **Protects Against**: Malicious cloud providers or compromised gateway operators presenting divergent Merkle trees to different observer groups (split-view equivocation).
- **Does NOT Protect Against**: Compromise of a supermajority (>66%) of all witness private keys.
- **Proposed Improvement**: Implement a decentralized peer-to-peer gossiping protocol among witness nodes using libp2p. Every signed checkpoint must be shared directly between witness peers before anchoring.
- **Verification Strategy**: Spin up a simulated adversarial gateway presenting conflicting roots; verify that witness nodes sound an immediate network alarm.
- **Implementation Status**: `NOT VERIFIED` (Requires new p2p networking module).

---

### REC-02: Hardware Security Module (HSM) Key Custody
- **Severity**: **HIGH**
- **Protects Against**: Exfiltration of witness and issuer signing keys via server memory dumps, container escapes, or unauthorized file access.
- **Does NOT Protect Against**: Authorized API calls executed by compromised microservice daemons.
- **Proposed Improvement**: Migrate all Ed25519 witness signing keys and RSA blind issuance private keys to AWS KMS, Google Cloud HSM, or YubiHSM2 hardware tokens with non-exportable key policies.
- **Verification Strategy**: Audit PKCS#11 integration tests confirming key non-extractability.
- **Implementation Status**: `PARTIALLY VERIFIED` (Local PKCS#11 mock verified; hardware HSM deployment pending production staging).

---

### REC-03: Client-Side Random Timing Jitter
- **Severity**: **HIGH**
- **Protects Against**: Passive network eavesdroppers correlating the millisecond an identity token was issued with the subsequent ballot casting packet.
- **Does NOT Protect Against**: Persistent eavesdropping on voters who cast during completely dead hours with zero other active participants.
- **Proposed Improvement**: Inject an enforced client-side delay timer (random float between 10.0 and 45.0 seconds) between blind token unblinding and ballot submission in `apps/web/src/app/student/elections/[id]/cast/page.tsx`.
- **Verification Strategy**: Measure dispatch timestamp distribution in automated Playwright E2E suites.
- **Implementation Status**: `PARTIALLY VERIFIED` (Optional holding delay in documentation; mandatory UI countdown timer pending).

---

### REC-04: Dual-Chain Anchor Multi-Relay
- **Severity**: **MEDIUM**
- **Protects Against**: Extended outages, catastrophic gas fee spikes, or deep reorganizations on a single blockchain network.
- **Does NOT Protect Against**: Systematic bugs in the EVM smart contract logic itself.
- **Proposed Improvement**: Modify `services/anchor_relayer` to commit checkpoint hashes concurrently to Ethereum Sepolia and a secondary Layer-2 network (e.g., Arbitrum One) or Bitcoin via OpenTimestamps.
- **Verification Strategy**: Simulate Ethereum testnet halt and verify that the independent verifier successfully falls back to the secondary anchor.
- **Implementation Status**: `NOT VERIFIED` (Single Sepolia/Anvil relayer currently active).

---

### REC-05: Tor / Onion Routing Support for Client Booths
- **Severity**: **MEDIUM**
- **Protects Against**: Campus network administrators monitoring IP addresses connecting to the casting gateway.
- **Does NOT Protect Against**: Browser fingerprinting or local operating system malware.
- **Proposed Improvement**: Host a dedicated `.onion` Hidden Service endpoint for the casting gateway and bundle Tor proxy configuration into the Linux client.
- **Verification Strategy**: Route test voting traffic through the Tor SOCKS5 proxy and verify successful Merkle leaf inclusion without IP leakage.
- **Implementation Status**: `NOT VERIFIED` (Standard HTTPS currently implemented).
