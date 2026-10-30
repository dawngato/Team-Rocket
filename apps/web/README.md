# HimVote Web Client Application

Production grade web application for the HimVote institutional election system.

## Architectural Overview

The HimVote web client is developed with Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query, and Lucide icons. It implements dual origin security separation:
* Identity origin: handles student authentication, enrollment checks, and blind credential issuance.
* Casting origin: ingests encrypted ballots, validates zero knowledge proofs, and appends leaves to the Merkle tree.

## Design Tokens

Design values conform strictly to Section 8.1 of the specification:
* navy900: #10233F (Navigation headers and primary text)
* teal600: #157E92 (Primary action buttons and keyboard focus rings)
* green600: #15805D (Reserved exclusively for cryptographically confirmed states)
* amber600: #AA6C0B (Pending witness checkpoints and chain finality)
* red600: #C23C45 (Invalid proofs and blocked actions)
* surface: #F3F6FA (Page surface background)
* white: #FFFFFF (Elevated cards and modal surfaces)
* text: #17233B (Body prose)

## State Vocabulary

State badges follow the precise protocol requirements of Section 8.2:
* DRAFT: initial contest definition before manifest lock.
* FROZEN: immutable manifest digest locked prior to opening cutoff.
* OPEN: active voting booth receiving submissions.
* PENDING_WITNESS: ballot committed by casting gateway into append only outbox.
* WITNESSED: batch checkpoint signed by independent external witness nodes.
* ANCHOR_PENDING: relayed to EVM smart contract, awaiting confirmation blocks.
* ANCHOR_FINALIZED: reached full confirmation depth on public blockchain.
* AUDIT_PASSED: zero discrepancy verification confirmed against test vectors.
* AUDITOR_ATTESTED: independent auditor signature attached to certified report.
* FAILED: invalid proof or cryptographic invariant broken.
* DISPUTED: mismatch detected between parallel witness checkpoints.

## Supported Page Flows

### Public Flows
* Home: trust pillars, live featured elections, quick receipt inspector.
* Elections Directory: searchable list with state filters and date formatting.
* How Verification Works: six stage cryptographic pipeline walkthrough.
* Results: certified outcomes with turnout bars and manifest digests.
* Public Audit Explorer: client side verifier runner with detailed property table.
* Accessibility Statement: conformance with WCAG 2.2 AA and testing standards.
* Security Limits: clear transparency regarding what the system does and does not solve.

### Student Flows
* Registration, Account Verification, and Login.
* My Elections desk with eligibility indicators.
* Candidate Review with certified contestant platforms.
* Anonymous Credential Issuance using local blinding.
* Cast Ballot with confirmation dialog and engine handoff.
* Pending Acceptance outbox tracker.
* Voter Evidence Receipt with progression timeline.
* Merkle Tree Inclusion Proof verifier computing sibling hashes to root.
* Certified Results view.

### Teacher Flows
* Student Verification Queue with approve and reject actions.
* Roster Corrections desk for registrar reconciliation.
* Published Department Elections.

### Administrator Flows
* Overview with institutional metrics and security indicators.
* Students directory and Teachers directory.
* Admin and Officer Invitations generator.
* Role Grant Approvals gate.
* Batch Student Roster Import with deduplication.
* Append only Security and Audit Logs.

### Election Officer Flows
* Create Election with contest parameters and cutoff schedules.
* Candidate Management with post freeze immutability locks.
* Roster Review and eligibility verification.
* Timeline and Cutoffs enforcement.
* Freeze Manifest with canonical SHA256 digest calculation.
* Lifecycle Controls for opening and closing contests.
* Publication Requests to witness and auditor network.

### Auditor Flows
* Trusted Pins store for Ed25519 witness keys and EVM contracts.
* Fetch Final Witness checkpoint signatures directly from nodes.
* Chain Anchor verification checking block confirmation depth.
* Evidence Import and Export with safe archive extraction.
* Offline Audit Verifier Suite checking tallies and Merkle paths.
* Local Auditor Signing using client key or hardware token.

## Accessibility Guarantees

* Touch targets maintain a minimum dimension of 44 by 44 points.
* Keyboard only navigation verified with high contrast 3px focus rings.
* Status is never communicated by color alone.
* Full screen reader labels and ARIA live announcements.
* Reduced motion preferences respected across all components.

## Local Execution and Testing

To run the development server:
```bash
npm install
npm run dev
```

To run type checking and unit tests:
```bash
npm run typecheck
npm test
npm run build
```
