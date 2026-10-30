# Credential Issuance and Authentication Security

**Document Revision**: 2026.10  
**Classification**: Authentication & Token Security Lifecycle  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Complete Credential Lifecycle

```
[ Pre-Election Roster Freeze ]
             │  (Signed by Roster Approver Ed25519 Key)
             ▼
[ Student Authentication ] ──► (Argon2id Hash + TOTP MFA)
             │
             ▼
[ Blind Token Generation ] ──► (Client generates m, blinds with factor r -> m')
             │
             ▼
[ Issuance Ceremony ] ───────► (Identity Issuer signs m' -> s'; records in Issuance Journal)
             │
             ▼
[ Local Unblinding ] ────────► (Client unblinds s' -> s; stores token in memory)
             │
             ▼
[ Nullifier Derivation ] ────► (Nullifier = SHA-256("himvote:nullifier:" || m))
             │
             ▼
[ Casting Submission ] ──────► (Casting Gateway verifies s on public key; commits Nullifier)
             │
             ▼
[ Registry Retirement ] ─────► (Nullifier locked in database; duplicate attempts rejected)
```

---

## 2. Security Properties & Verifications

### 2.1 Pre-Election Roster Freeze Ceremony (`CONFIRMED`)
- **Protocol**: Before an election moves from `PUBLISHED` to `OPEN`, the list of eligible students (`student_id`, `email`, `department`) is compiled, canonicalized with RFC 8785, and hashed:
  $$\text{RosterDigest} = \text{SHA-256}(\text{JCS}(\text{RosterEntries}))$$
  An authorized institutional official signs this digest using an Ed25519 key.
- **Enforcement**: The `identity_issuer` service refuses to generate blind credentials for any account not present in the attested roster snapshot.

### 2.2 Blind Token Unforgeability (`CONFIRMED`)
- **Protocol**: Blind tokens are signed using a 3072-bit or 4096-bit RSA key pair adhering to RFC 9474 (RSABSSA).
- **Assurance**: Computational security against forgery reduces directly to the RSA problem.

### 2.3 Strict Single-Cast Guarantee (`CONFIRMED`)
- **Protocol**: When a token is cast, the Casting Gateway derives the deterministic nullifier:
  $$\text{Nullifier} = \text{SHA-256}(\text{UTF-8}("himvote:nullifier:" \parallel \text{TokenBytes}))$$
- **Enforcement**: The nullifier is inserted into the `nullifiers_to_leaf` table under an atomic `SERIALIZABLE` database transaction.
  - If the nullifier already exists and the submitted ballot ciphertext is identical, the service returns the existing receipt handle (safe idempotent retry).
  - If the nullifier already exists and the ballot differs, the request is unconditionally rejected with HTTP 409 Conflict.
- **Evidence**: Verified in automated stress test `tests/security/reports/Q7_01_duplicate_submission.json`.
