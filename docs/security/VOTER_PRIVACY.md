# Voter Privacy and Anonymity

**Document Revision**: 2026.10  
**Classification**: Anonymity Boundaries & Data Flow Analysis  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Voter Privacy Architecture

HimVote provides mathematical privacy for ballot choices through two distinct separation mechanisms:
1. **Cryptographic Unlinkability**: RFC 9474 RSA blind signatures prevent the identity service from recognizing the token when it is presented to the casting service.
2. **Architectural Isolation**: Physical and logical separation of database instances.

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Identity Issuer Domain      │           │     Casting Gateway Domain      │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ • Student Name                  │           │ • Blind Token Nullifier         │
│ • University ID / Email         │           │ • Leaf Sequence Index           │
│ • Password Hash (Argon2id)      │  NO JOIN  │ • Encrypted Ballot Ciphertext   │
│ • TOTP Secret                   │ ───────── │ • Tracking Handle Hash          │
│ • Credential Issuance Timestamp │           │ • Merkle Audit Proof Path       │
│ • Blinded Token (m')            │           │ • Unblinded Token (m, s)        │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

---

## 2. Verification Classifications

| Privacy Property | Implementation Reality | Assurance Level |
| :--- | :--- | :--- |
| **Token Unlinkability** | Mathematical blind signature blinding factor $r$ eliminates linkage | `CONFIRMED` |
| **Database Isolation** | Zero foreign keys or database linkages between Identity & Casting DBs | `CONFIRMED` |
| **IP Address Stripping** | Casting service does not log or persist client IP addresses | `CONFIRMED` |
| **Network Metadata Resistance** | Standard TLS 1.3 encryption; timing correlation remains possible | `PARTIALLY VERIFIED` |
| **Coercion Resistance** | Receipt handle hides candidate selection; shoulder-surfing not blocked | `PARTIALLY VERIFIED` |
| **Small Electorate Protection** | Threshold checks mark contests with low participation as `PRIVACY_LIMITED` | `CONFIRMED` |

---

## 3. Residual Privacy Risks

### 3.1 Network Timing and Traffic Correlation
- **Mechanism**: A passive network observer monitoring university Wi-Fi can record the timestamp when a student visits `identity.campus.edu` to acquire a token, and note a subsequent connection to `cast.campus.edu` 1.2 seconds later.
- **Residual Risk**: High in low-turnout intervals; reduced in high-concurrency peak voting hours.
- **Recommended User Behavior**: Students should obtain their blind credential, close the browser, and cast the ballot later from a different network or device.

### 3.2 Small Electorate Unanimity
- **Mechanism**: In a departmental election with 8 eligible voters where 8 ballots are cast, if Candidate A receives 8 votes (100%), every voter's choice is exposed with certainty.
- **Mitigation Implemented**: The verifier and results UI flag contests with small turnout as `PRIVACY_LIMITED`, suppressing individualized vote breakdowns where mathematically risky.
