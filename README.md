# CAMPUS VAULT
## Secure University Election & Independent Verification Platform

> "Your Vote. Your Voice. Independently Verifiable."

Campus Vault is a full-stack, enterprise-grade electronic voting and university election management platform with cryptographic ballot integrity, strict voter privacy isolation, and independent verification capabilities.

---

## Highlights & Cryptographic Architecture

- **Strict Identity Decoupling (Voter Privacy):** Student authentication is separated from accepted ballot records. The `AcceptedBallot` database table stores NO student ID, user ID, or network IP address.
- **SHA-256 Merkle Tree:** Every accepted ballot is hashed with domain separation (`CV:LEAF:v1:`) and committed into an append-only Merkle tree.
- **Ed25519 Checkpoint Signatures:** Checkpoints containing sequence numbers, Merkle roots, and ballot counts are digitally signed by an independent auditor keypair.
- **Standalone Python 3 Auditor Script (`scripts/verify_election.py`):** Consumes exported JSON artifacts (`election_manifest.json`, `accepted_ballots.jsonl`, `signed_checkpoint.json`) and independently verifies digital signatures, Merkle roots, and recomputed tallies without contacting the web application.
- **Student Ballot Inclusion Verifier:** Voters receive an anonymous receipt tracking code and can inspect the mathematical Merkle path proof proving their ballot is counted in the official checkpoint.
- **Automated Security Test Suite (16/16 Passed):** Verifies duplicate voting rejection, racing concurrent transactions, illegal state machine transitions, tamper detection, and transaction atomicity.

---

## Demo Accounts & Role Switcher

Campus Vault includes pre-configured synthetic accounts switchable via the navigation bar:

| Role | Name | Student / Staff ID | Department |
| :--- | :--- | :--- | :--- |
| **Student** | Alex Chen | `STU-2026-001` | Computer Science & Engineering |
| **Student** | Maya Patel | `STU-2026-002` | School of Law |
| **Admin** | Dr. Aris Thorne | `ADM-001` | Electoral Board Secretariat |
| **Admin** | Prof. Sarah Jenkins | `ADM-002` | Office of Student Affairs |
| **Auditor** | Elena Rostova | `AUD-001` | Independent Civic Tech Audit Panel |

---

## Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Seed Synthetic Data
```bash
npx prisma db push
node scripts/seed.mjs
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Verification & Security Tests

### Standalone Python 3 Verifier
```bash
python scripts/verify_election.py \
  --manifest artifacts/elec-senate-2026-rep/election_manifest.json \
  --ballots artifacts/elec-senate-2026-rep/accepted_ballots.jsonl \
  --checkpoint artifacts/elec-senate-2026-rep/signed_checkpoint.json \
  --public-key artifacts/elec-senate-2026-rep/trusted_auditor_public_key.pem
```

### Automated Security Test Suite (All 16 Tests)
```bash
npm run test:security
# or: node scripts/run-security-tests.mjs
```

---

## Project Structure

```
Rocket_code/
├── app/                      # Next.js App Router (Pages & APIs)
│   ├── api/                  # Secure API routes (elections, ballots, verify, security)
│   ├── elections/            # Election registry, details, and certified results
│   ├── student/              # Student portal, voting booth, receipt inclusion checker
│   ├── admin/                # Election operations, candidate & eligibility manager, audit log
│   ├── auditor/              # Auditor lab, checkpoint chain, live test runner
│   ├── verify/               # Public standalone independent verification portal
│   └── security/             # Security specifications & threat model documentation
├── components/               # UI components (Navbar, StatusBadge, Footer)
├── lib/
│   ├── crypto/
│   │   ├── merkle.ts         # Merkle tree builder, proof generator & verifier
│   │   └── signatures.ts     # Ed25519 digital signature and checkpoint signing
│   ├── auth.ts               # Session management & demo role switcher
│   ├── prisma.ts             # Prisma ORM client instance
│   └── voting.ts             # Atomic ballot submission & transaction engine
├── prisma/
│   └── schema.prisma         # Normalized database models
├── scripts/
│   ├── seed.mjs              # Synthetic dataset seeder & artifact generator
│   ├── verify_election.py    # Independent Python 3 verification script
│   └── run-security-tests.mjs # 16 automated security tests runner
├── artifacts/                # Exported verifiable election bundles
├── keys/                     # Ed25519 auditor public/private key pairs
└── SECURITY.md               # Security documentation & known limitations
```
