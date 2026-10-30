# Security Limits and Assumptions

**Document Revision**: 2026.10  
**Classification**: Threat Surface Boundaries  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Boundary Matrix

| Security Dimension | Theoretical Ideal | HimVote Operational Implementation | Residual Risk Level |
| :--- | :--- | :--- | :--- |
| **Voter Coercion** | Inability to prove how one voted under physical intimidation | Receipt handle hides candidate selection; but real-time shoulder surfing cannot be prevented | **HIGH** |
| **Endpoint Security** | Cryptographic execution isolated from host OS vulnerabilities | Web browser and desktop app rely on OS TLS stack and memory protections | **HIGH** |
| **Network Anonymity** | Complete decoupling of IP address, packet timing, and identity | HTTPS / TLS 1.3 encryption; timing correlation possible without external mixnets | **MEDIUM** |
| **Key Independence** | Physically segregated HSM custody across untrusted organizations | Multi-process microservice separation; local development shares Docker host | **MEDIUM** |
| **Consensus Finality** | Instant mathematical irrevocability | Probabilistic or BFT finality depending on target Ethereum/EVM consensus | **LOW** |

---

## 2. Exhaustive Boundary Analysis

### 2.1 Coercion Resistance and Receipt-Freeness
- **Implementation Reality**: HimVote receipts contain a cryptographic tracking handle (`handle`), a Merkle leaf index (`leaf_index`), and a checkpoint root hash (`merkle_root`). They do **not** contain the unencrypted plaintext ballot, candidate ID, or voter name.
- **Limitation**: If an intimidator demands that the voter vote on their personal device while being actively monitored, no client-side cryptography can protect the voter's choice. 
- **Assumption**: Voters possess access to an uncoerced environment during the ballot submission ceremony.

### 2.2 Client Endpoint and Browser Sandbox Limits
- **Implementation Reality**: The web application executes inside modern browsers enforcing Content Security Policy (CSP), subresource integrity, and HTTPS. The Linux desktop client executes inside a sandboxed Python runtime.
- **Limitation**:
  1. Operating-system-level keyloggers can capture keystrokes before encryption occurs in web memory.
  2. Malicious browser extensions with elevated permissions can inspect DOM input values before form submission.
- **Assumption**: The voter's personal device has not been compromised by kernel-level malware or active remote-access trojans (RATs).

### 2.3 Network Metadata and Timing Risks
- **Implementation Reality**: The `identity_issuer` and `casting` services expose separate HTTP hostnames or path prefixes. When a student authenticates, they receive a blind credential.
- **Limitation**: If a voter requests a blind credential at `14:02:11.200` and immediately casts a ballot at `14:02:11.450` from the identical public residential IP address, a passive network eavesdropper (or a colluding network admin) can correlate the identity with the ballot leaf index.
- **Mitigation Requirement**: Voters should decouple issuance from casting by a variable time window, or submit ballots over separate networks (e.g., mobile cellular data vs campus Wi-Fi).

### 2.4 Institutional Collusion Boundaries
- **Implementation Reality**:
  - `identity_issuer` maintains voter enrollment rosters and authentication tokens.
  - `casting` gateway maintains ballot logs and nullifier registries.
  - `witness` nodes verify append-only Merkle tree state transitions.
  - `anchor_relayer` commits state checkpoints to an EVM contract.
- **Limitation**: If all service administrators collude and share private keys, they could theoretically insert illegitimate ballots for abstainers, provided the witness nodes also collude to sign invalid checkpoints.
- **Mitigation Requirement**: Witness nodes must be operated by independent, legally and operationally distinct entities (e.g., student union representatives, external faculty auditors, independent non-profit observers).

### 2.5 External Voting Engine Dependency Limits
- **Implementation Reality**: HimVote interfaces with an external cryptographic voting engine (e.g., ElectionGuard or Belenios) via standardized JSON interfaces (`packages/test_vectors/`).
- **Limitation**: If the underlying cryptographic library contains an unpatched zero-day vulnerability in its zero-knowledge proof generation or Paillier homomorphic addition, HimVote's orchestration cannot compensate for underlying mathematical flaws.
- **Assumption**: The underlying engine implementation has undergone independent academic review and formal verification.

### 2.6 Blockchain Finality Assumptions
- **Implementation Reality**: Checkpoints are anchored to an EVM smart contract (`HimVoteAnchor.sol`).
- **Limitation**:
  - Testnet anchors (e.g., Sepolia) rely on testnet validators and can experience block reorganizations or service disruptions.
  - If a deep chain reorganization occurs, the anchor transaction hash in the evidence package may be invalidated on the fork.
- **Assumption**: The anchor network has achieved finality before final tally certification is executed.
