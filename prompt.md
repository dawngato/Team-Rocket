# HimVote: Production Build Prompt and Full Specification

Product name: **HimVote**
Type: Production grade institutional election platform for universities and colleges
Platforms: Web, Android, iOS, Windows desktop
Version of this prompt: 2.0 (30 October 2026)
Source documents: work.md v7.0, feature.md v3.0, design.md v7.0, architecture.md v7.0. All earlier SecureVote names are replaced by HimVote.

This file is the single instruction set for whoever writes the code, whether a developer, a team or an AI coding assistant. It states what to build, in which folder, in which language, how each part must behave, how it is deployed and operated, and how every claim is proven. Read all of it before writing code. If this file and an older document disagree, this file wins.

---

## 0. How to use this prompt

1. Work phase by phase using Section 20. Do not pass a gate until its tests are green.
2. Every folder in Section 2 has a README.md. Replace each with a real README as the folder gets real code.
3. Never mark work done without an automated test, an evidence artifact and a written list of limits.
4. Real institutional data is processed in production. Treat every record as personal data from the first line of code.
5. Every release goes through development, staging and production. Production receives only artifacts that passed staging.

### 0.1 Hard rules

1. No custom cryptography. Use reviewed libraries only: RSA blind signatures per RFC 9474, Merkle log per RFC 9162, JSON canonicalization per RFC 8785, Argon2id for passwords, Ed25519 or ECDSA from a reviewed library for signatures.
2. The server is the only authority for eligibility, timing and one vote enforcement. Clients never decide these.
3. Android, iOS, web and desktop never implement their own ballot encryption. They use the supported booth or API of the vetted voting engine chosen at Gate E1 (Section 9).
4. Identity data and ballot data live in two separate PostgreSQL clusters with separate credentials, networks, backups and operators. No table, log or export joins a student to a ballot.
5. No private key for issuer, witness, auditor, trustees or relayer is stored in a repository, image, client or export. Production keys live in an HSM or cloud KMS, or in a vault with hardware backing.
6. A voter never sees a success state before the matching proof exists. Submitted, accepted, witnessed and anchored are four different states.
7. No unqualified claims such as "unhackable", "completely anonymous" or "100 percent secure" in any UI, document or message. Show exactly the properties the independent verifier confirmed.
8. No live election may open until the production readiness gate in Section 19 is signed off, including an independent security assessment.
9. No secrets, tokens or personal data in logs, metrics, traces, crash reports or analytics.

---

## 1. Technology decisions (fixed)

| Area | Choice |
|---|---|
| Web | Next.js 15, React 19, TypeScript, TanStack Query, Vitest, Playwright |
| Android | Kotlin, Jetpack Compose, Material 3, ViewModel, coroutines and Flow, OkHttp, Hilt |
| iOS | Swift 6, SwiftUI, async and await, URLSession, Keychain (macOS and Xcode required) |
| Windows desktop | C#, .NET 8, WinUI 3 (Windows App SDK), CommunityToolkit.Mvvm, MSIX packaging |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, argon2-cffi |
| Databases | PostgreSQL 16, two independent clusters: identity and casting |
| Cache and queue | Redis, never authoritative |
| Edge | Nginx or a managed load balancer with WAF, TLS 1.3 |
| Chain | Solidity 0.8.x, OpenZeppelin AccessControl, Foundry |
| Verifier | Python CLI in /verifier |
| Infrastructure | Docker, Kubernetes, Terraform, Helm |
| Observability | OpenTelemetry with redaction, Prometheus, Grafana, Loki |
| API contract | One OpenAPI 3.1 file, generated clients for Kotlin, Swift, TypeScript and C# |

---

## 2. Directory structure

```text
HimVote/
├── prompt.md                     <- this file
├── README.md
├── .env.example                  <- variable names only, no secrets
├── compose.yaml                  <- shared service definitions for local development
├── compose.dev.yaml              <- local development overrides
├── compose.prod.yaml             <- single host production style profile
├── apps/
│   ├── android/                  <- Kotlin, Jetpack Compose
│   │   └── app/src/main/java/com/himvote/
│   ├── ios/                      <- Swift, SwiftUI
│   │   ├── HimVote/
│   │   └── HimVoteTests/
│   ├── web/                      <- Next.js, TypeScript
│   │   ├── src/app/
│   │   ├── src/lib/
│   │   └── tests/
│   └── desktop/                  <- Windows thick client, C# and WinUI 3
│       ├── HimVote.Windows/
│       │   ├── Views/
│       │   ├── ViewModels/
│       │   └── Services/
│       └── HimVote.Windows.Tests/
├── services/
│   ├── admin_api/                <- users, roles, elections, approvals, publication gate
│   ├── identity_issuer/          <- login, MFA, roster, blind credential issuer
│   ├── casting/                  <- separate origin, anonymous cast, outbox
│   ├── election_engine/          <- adapter to the vetted voting engine
│   ├── checkpoint_worker/        <- ordered Merkle log publisher
│   └── anchor_relayer/           <- sends witnessed digests to the chain
├── chain/
│   ├── contracts/                <- HimVoteAnchor.sol
│   ├── script/                   <- deployment scripts
│   └── test/                     <- Foundry tests
├── witness/                      <- witness service, operated by an independent organization in production
├── verifier/                     <- standalone auditor CLI
├── packages/
│   ├── openapi/                  <- himvote.openapi.yaml and generator configs
│   └── test_vectors/             <- shared canonical JSON, hashes, proofs
├── infrastructure/
│   ├── nginx/
│   ├── kubernetes/               <- Helm charts, network policies, pod security
│   ├── terraform/                <- cloud resources, KMS, networks, databases
│   ├── observability/            <- dashboards, alerts, redaction rules
│   └── migrations/
│       ├── identity/
│       └── casting/
├── ops/
│   ├── runbooks/                 <- incident, failover, key rotation, restore
│   └── compliance/               <- data protection, retention, DPIA, audit records
├── tests/
│   ├── security/
│   ├── integration/
│   └── load/
├── docs/                         <- threat model, assumptions, limits, test results
│   └── adr/                      <- architecture decision records
└── fixtures/                     <- test and CI data only, never loaded in production
```

---

## 3. Roles and permissions

Authorization is role plus scope plus explicit permission plus allowed state transition. A role never grants unrelated powers. Every endpoint checks this on the server. Hiding a button is not a control.

| Role | Created by | Can do | Must never do |
|---|---|---|---|
| Super Administrator | One time secured bootstrap | Set up the institution, invite administrators with scopes, set policy | See any vote choice, change a tally, sign an audit |
| Administrator | Invitation approved by another person | Manage teachers and students in scope, approve registrations, run reports | Promote self, create Super Admin, rewrite a frozen roster, appoint auditors alone |
| Election Officer | Election scoped delegation with approval | Draft election, candidates, dates, request freeze, open, close, request publication | Edit a frozen manifest, issue extra credentials, touch accepted ballots |
| Teacher | Admin invitation or staff registry | Verify students in own department or class, suggest roster corrections | Read other departments, see ballots |
| Student | Registration matched to the institution roster | See own eligibility, get one credential, vote, check receipt | Any admin action, second credential |
| Roster Approver | Separate delegation, independent of the importer | Sign roster digest and count | Edit the roster |
| Independent Auditor | Appointed outside the admin tree | Fetch evidence, run verifier, sign attestation with own key | Hold keys in the HimVote system |
| Public Observer | No account | View published results and the public audit package | See identity data or unreleased evidence |

Audit signing sits outside the role graph. The audit key is never on any HimVote server.

### 3.1 Account lifecycle

States: INVITED, PENDING_VERIFICATION, PENDING_APPROVAL, ACTIVE, SUSPENDED, LOCKED, DEACTIVATED, ARCHIVED.

1. Bootstrap: the flag BOOTSTRAP_ALLOWED is read at first installation only. A random one use invitation for the Super Admin is delivered through the secure channel chosen by the deployer, requires MFA enrollment, then the flag is permanently disabled in the database and the endpoint returns 403.
2. Admin creation: CREATE_ADMIN_REQUEST, permission check, scope and risk check, approval by a different authorized person, invitation with short expiry, invitee sets a password and enrolls MFA, activation, append only audit event. Creators can never approve their own request.
3. Teachers arrive by Administrator invitation or import from the institution staff registry, then map to departments and classes.
4. Students register with their institution student ID and institutional email, or arrive from the Student Information System import. Status starts at PENDING_VERIFICATION. A teacher or administrator matches the record to the approved enrollment source. Login alone gives no election eligibility.
5. Initial passwords are never emailed or placed in a file. Use short lived single use enrollment links, or federate with the institution identity provider through OIDC or SAML.
6. Recovery uses short lived single use tokens, identity checks and a notification to all registered contacts. Recovery, MFA reset, duplicate registration and suspension never reset an issued or spent voting credential.
7. Passwords use Argon2id with recorded parameters. Rate limiting and lockouts apply. Privileged roles require MFA (TOTP or WebAuthn).

---

## 4. Election lifecycle

Server enforced and transactional:

```text
DRAFT -> REVIEW -> APPROVED -> FROZEN -> SCHEDULED -> ISSUING -> ISSUANCE_CLOSED
 -> OPEN -> CLOSING -> CLOSED_PENDING_WITNESS -> FINAL_WITNESSED
 -> ANCHOR_FINALIZED -> AUDIT_PASSED -> AUDITOR_ATTESTED -> PUBLISHED
Exceptions: PAUSED, CANCELLED (signed reason), DISPUTED, AUDIT_FAILED, UNVERIFIABLE
```

1. Freeze creates an immutable signed manifest: election ID, contest, candidate IDs, selection rule, roster version and commitment, public eligible count, issuer key ID, engine name and version, trustees, log key ID, witness keys, auditor key fingerprint, issuance start and cutoff, open and close times in UTC, minimum anonymity policy, verifier version and anchor policy (anchor required before publication).
2. A Roster Approver who is a different person from the importer signs the roster. After freeze there is no candidate or eligibility change. A correction needs a new manifest and a new election ID.
3. Credential issuance finishes before casting opens.
4. Close takes the same row lock as casting, moves to CLOSING and records final_tree_size equal to next_leaf_index. No cast is accepted after that lock.
5. Publication needs a passed audit, an independent final witness checkpoint, an anchor at finality on chain, and an auditor signature that the server verifies but never creates.
6. Elections are never reopened. Committed evidence is never deleted. Cancellation is a signed record that keeps all evidence.

---

## 5. Data model

### 5.1 Identity cluster (no ballots, no nullifiers, no choices)

Tables: tenants, campuses, departments, staff_profiles, student_profiles, users, role_definitions, permissions, role_assignments, invitations, approval_requests, approval_decisions, enrollment_sources, student_verifications, sessions, mfa_credentials, recovery_requests, admin_audit_events, election_roster_snapshots, roster_members, credential_issuance_records, issuance_events.

- roster_members primary key (election_id, roster_version, student_id).
- credential_issuance_records unique (election_id, student_id). Columns: blinded_request, request_digest, blind_signature_response, status (RESERVED, SIGNING, SIGNED, DELIVERED), issuer_key_id, roster_version.
- admin_audit_events is append only: revoke UPDATE and DELETE and add triggers that raise errors. Ship the events to write once storage.
- Eligibility comes from the signed roster snapshot, never from an active flag on the user.
- Encrypt personal data columns at rest and apply row level security by tenant and department.

### 5.2 Casting cluster (no student ID, no session, no login data)

Tables: elections, manifest_versions, contests, candidates, accepted_encrypted_ballots (the source of the log leaves, with the nullifier in the same row), checkpoint_outbox, witness_acknowledgements, tally_proofs, published_results, election_events.

- UNIQUE (election_id, credential_nullifier) and UNIQUE (election_id, leaf_index).
- election_state holds state, manifest_digest, opens_at_utc, closes_at_utc, issuance_cutoff_utc, state_version, next_leaf_index, last_witnessed_tree_size, final_tree_size, transition_digest.
- The cast role may INSERT through one database function only. No UPDATE or DELETE on ballot rows. Immutable row triggers fail closed.

### 5.3 Canonical ballot evidence record (himvote.ballot-evidence.v1)

Fields: schema, election_id, manifest_digest, ballot_id, leaf_index, credential_nullifier, credential_proof_b64url, engine_ballot_b64url, engine_proofs_b64url, engine_record_version.

Strict UTF 8, RFC 8785 canonical JSON, no duplicate keys, no floats, known field whitelist, reject unknown mandatory versions. Leaf hash is SHA256(0x00 || leaf_bytes), node hash SHA256(0x01 || left || right) as in RFC 9162. No personal data and no plaintext choice ever appears in a leaf. Golden vectors live in /packages/test_vectors and Python, Kotlin, Swift, TypeScript and C# must all match them.

### 5.4 Checkpoint record (himvote.checkpoint.v1)

Fields: election_id, manifest_digest, tree_size, merkle_root, previous_checkpoint_digest, last_leaf_index, last_leaf_digest, issued_count, issuance_ledger_digest, roster_commitment, protocol_version, checkpoint_kind (INCREMENTAL or FINAL), checkpoint_sequence. The witness signature binds the canonical bytes, the previous witness sequence and the election ID.

---

## 6. Services

### 6.1 services/identity_issuer (identity origin)

Endpoints under /v1:
- POST /auth/login, POST /auth/logout, POST /auth/recover
- POST /bootstrap/claim (one time)
- POST /admin/invitations, POST /admin/role-grant-requests, POST /approvals/{id}/decision, GET /admin/audit-events
- POST /students/register, POST /students/import, POST /students/{id}/verify
- GET /roster/me (own eligibility and frozen status only)
- POST /credentials/issue (blinded request, one slot per election and student)
- GET /credentials/issuance-status (no secrets)

Issuance algorithm:
1. Check session, MFA where required, membership in the frozen roster snapshot, and an open issuance window.
2. In one transaction insert the slot as RESERVED with the exact blinded request. The unique key blocks a second slot.
3. Mark SIGNING, call the reviewed RFC 9474 library with the issuer key held in the KMS or HSM, store the response, mark SIGNED, return it and mark DELIVERED.
4. A retry with the identical blinded request returns the stored response. A different blinded request is rejected. After a crash, reprocess only the persisted request, otherwise fail closed and open an incident. Never issue a second signature.
5. The issuer never sees the unblinded secret or serial.
6. Log only IDs and states.

### 6.2 services/admin_api

Election CRUD while DRAFT, candidate management, roster submit and approve, freeze, open, close, request publication, the state machine engine, audit event writer, and the publication gate that verifies the auditor signature against the pinned auditor public key. GET evidence and GET results (results only when PUBLISHED).

### 6.3 services/casting (separate origin, no identity cookie)

Endpoints: POST /v1/cast/{election_id}/ballots and GET receipt status by unguessable handle.

1. Reject any request carrying identity cookies or the identity Authorization header. Strip and never log them.
2. Validate schema and size, verify the engine ballot and proofs, verify the anonymous credential proof for this election and manifest, derive the nullifier.
3. Transaction: lock the election row, check state OPEN and database UTC inside the window, check manifest digest, look up the nullifier. Same request digest returns the earlier outcome. A different request with the same nullifier is rejected. Otherwise insert the ballot row at next_leaf_index, insert the outbox row, increment next_leaf_index, commit. No witness network call inside the transaction.
4. Return COMMITTED_PENDING_WITNESS and an opaque handle. The status becomes WITNESSED only after the signed witness acknowledgement exists.
5. If the unwitnessed backlog exceeds the configured limit, pause accepting and show a clear message.

### 6.4 services/election_engine

Adapter functions: validate_ballot, verify_credential, export_ballots, verify_tally, verify_inclusion, get_protocol_version. Implement only what the chosen engine genuinely supports. An unsupported function is a release blocker, never a function to invent.

### 6.5 services/checkpoint_worker

One writer per election. Reads outbox rows in leaf index order, never skips a gap, builds the RFC 9162 tree, produces checkpoints, sends them to the witness, retries idempotently, resumes from the last acknowledged tree size. A duplicate leaf index with a different hash is a hard fault and sets the election to DISPUTED.

### 6.6 witness

Endpoints: POST /checkpoints, POST /elections/{id}/final, GET /elections/{id}/final.

Verifies election ID, manifest digest, pinned writer key, previous acknowledgement, consistency proof and monotonic tree size. Writes its own append only record before returning its signature. Refuses a gap, a wrong election, a second incompatible FINAL and any checkpoint after FINAL.

Production requirement: the witness is deployed and operated by a separate organization, with its own infrastructure, keys in its own HSM or KMS, its own access controls and its own audit history. HimVote administrators have no access to it. Plan at least two independent witnesses, with the manifest naming them.

### 6.7 chain and services/anchor_relayer

Contract HimVoteAnchor.sol stores commitments only, never votes:
- OpenZeppelin AccessControl. Only the relayer role can anchor.
- anchorCheckpoint(electionCommitment, sequence, digest, previousDigest, isFinal): sequence equals previous plus one, digest nonzero, previous digest matches, nothing changes after a final. Emits an event.
- Nothing on chain identifies a student, tracker, nullifier or ciphertext.
- Production deploys to a public EVM network or an institution consortium network with independent validators, using an audited contract and a multisig admin. Contract and ABI are pinned outside the election export.

Relayer: takes a witnessed digest from a transactional outbox, submits one transaction, reconciles unknown outcomes from contract state, waits for the configured confirmations or finality, records block hash and receipt. A transaction hash alone is never proof of finality. On a reorg the state returns to ANCHOR_PENDING. Relayer key lives in the KMS with spending limits.

Foundry tests: unauthorized relayer, skipped or repeated sequence, wrong previous digest, wrong election, second final, replacement attempt, paused state, reentrancy and gas bounds.

### 6.8 verifier (standalone CLI)

```bash
python verifier/verify.py audit-evidence --export <dir> --trust <pins.json> --final <witness final> --roster <roster approval> --issuance <issuer closure> --chain <chain pins> --report <unsigned report.json>
python verifier/verify.py verify-attestation --report <report.json> --attestation <auditor signature> --trust <pins.json>
```

Checks in order:
1. Load pinned trust from outside the export. Reject keys supplied inside the export.
2. Verify manifest, roster approval and issuance closure.
3. Obtain the final checkpoint from the witness or an independently archived copy, never from the export.
4. Check checkpoint history with no fork or rollback, tree size N, leaves 0 to N minus 1 with no gap.
5. Recompute canonical bytes and Merkle root and compare with the witness final.
6. Verify every credential proof, nullifier uniqueness and election binding.
7. Verify engine ballot proofs, run the engine tally verification, compare totals with the proposed result.
8. Verify chain ID, contract address, code hash, that the anchored digest equals the witness final, and that the block is finalized and canonical.
9. Emit an unsigned report with file hashes, versions and a status per property.
10. Parser safety: reject path traversal, symlinks, duplicate JSON keys, oversize archives and unknown versions.

Exit codes: 0 all mandatory checks pass, 2 cryptographic or authorization failure, 3 unverifiable (missing, stale or untrusted material), 4 bad archive or unsupported version.

Properties reported: RECORD_INTEGRITY, CREDENTIAL_UNIQUENESS, ROSTER_ATTESTATION, TALLY_PROOF, ANCHOR_FINALITY, BALLOT_SECRECY_ASSUMPTIONS, CAST_AS_INTENDED, RECEIPT_FREENESS, COMPROMISED_ENDPOINT_RESISTANCE, INDEPENDENT_OPERATORS, REAL_WORLD_ELIGIBILITY. Each is PASS, FAIL, LIMITED, ASSUMED, NOT_SUPPORTED or UNVERIFIABLE. Exit 0 never means the election is flawless.

---

## 7. Shared API rules

- One OpenAPI file at packages/openapi/himvote.openapi.yaml. Generate Kotlin, Swift, TypeScript and C# clients from it. CI fails if any client drifts.
- Stable typed error codes, rate limits, strict CORS, TLS 1.3 everywhere, mTLS between services, CSRF protection where cookies are used, body size limits, input normalization, parameterized SQL.
- Two public origins: identity origin and casting origin. The edge strips cookies, authorization headers and trace IDs on the casting route and never logs bodies there.
- No trackers or tokens in URLs. No third party scripts on credential or casting pages.
- Idempotency keys on all state changing calls that can be retried.

---

## 8. Client applications

All four clients share flows, labels and error texts from the OpenAPI contract. They share design tokens by value, not code.

### 8.1 Design system

| Token | Value | Use |
|---|---|---|
| navy900 | #10233F | Navigation, headings |
| teal600 | #157E92 | Primary action, focus |
| green600 | #15805D | Cryptographically verified only |
| amber600 | #AA6C0B | Pending witness or finality |
| red600 | #C23C45 | Invalid proof, blocked action |
| surface | #F3F6FA | Background |
| white | #FFFFFF | Cards |
| text | #17233B | Body |

8 point spacing, touch targets of at least 44 points, WCAG 2.2 AA contrast, light and dark themes, never color alone, screen reader support, text scaling, reduced motion. Localization ready with English and Hindi at launch.

### 8.2 Visible state labels

DRAFT, FROZEN, OPEN, PENDING_WITNESS, WITNESSED, ANCHOR_PENDING, ANCHOR_FINALIZED, AUDIT_PASSED, AUDITOR_ATTESTED, FAILED or DISPUTED. Green appears only for properties the verifier confirmed.

### 8.3 Screens per role

Public: Home, Election list, How verification works, Results, Public audit, Accessibility, Security limits.
Student: Sign up, Verify account, Login, My Elections, Candidates, Get credential, Cast ballot (review and confirm), Pending acceptance, My Receipt, Verify Inclusion, Results, Help.
Teacher: My Classes, Student Verification Queue, Roster Corrections, Published Elections.
Administrator: Overview, Teachers, Students, Invitations, Approvals, Roster Imports, Election Assignments, Activity.
Super Administrator: Overview, Institutions, Departments, Administrators, Role Requests, Policies, Security, System Audit.
Election Officer: My Elections, Create Election, Candidates, Roster Review, Schedule, Freeze Manifest, Open and Close, Publication Requests.
Auditor: Trusted pins, Fetch final witness, Fetch chain anchor, Import export, Verify, Sign report (signing uses the auditor own key or hardware token, never the server).

### 8.4 apps/web

- Next.js App Router. Server rendered public pages, client side authenticated areas.
- HttpOnly, Secure, SameSite cookies on the identity origin only. CSRF token on state changing calls. Strict CSP, no inline scripts, no third party CDN for voting code, Subresource Integrity on any static asset.
- Folders: src/app (routes per role), src/lib (generated API client, auth, strings, formatting), tests (Vitest unit tests, Playwright end to end including keyboard only voting).
- The vote screen hands off to the engine booth and returns to a receipt screen. It never encrypts ballots itself.
- Responsive admin tables. Dates always show the time zone.
- Output: container image served behind the edge.

### 8.5 apps/android

- Single activity, Navigation Compose, ViewModel with StateFlow, Hilt, generated Kotlin client on OkHttp with certificate pinning.
- Session and credential in the Android Keystore backed encrypted storage, excluded from backups and device transfer.
- Booth handoff through Custom Tabs with verified app link return and state check. No WebView voting unless the engine documents support.
- Release builds are HTTPS only. Debug builds may use the emulator host alias 10.0.2.2 to reach a local stack.
- TalkBack labels, large text support. Play Integrity check on sensitive actions where policy requires.
- Tests: JUnit view models, instrumented UI flow from login to receipt, shared vector contract test.
- Distribution: signed AAB, Play Console staged rollout, mapping files stored for crash symbolication.

### 8.6 apps/ios

- NavigationStack, async and await, @Observable view models, generated Swift client with URLSession and certificate pinning.
- Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly for session and credential. Universal Links for booth return. ASWebAuthenticationSession or SFSafariViewController for the booth.
- VoiceOver, Dynamic Type, Reduce Motion. App Attest on sensitive actions where policy requires.
- Tests: XCTest view models, XCUITest main flow, shared vector test.
- Distribution: TestFlight then App Store phased release. Requires macOS and Xcode. An iOS pass is claimed only after a real Xcode run.

### 8.7 apps/desktop (Windows thick client, C# and WinUI 3)

A native installed application, not a web wrapper. Targets Windows 10 1809 and later and Windows 11. Packaged as MSIX.

Layout:
- HimVote.Windows/Views: LoginPage, ElectionsPage, CandidatesPage, ReceiptPage, AdminPage, AuditExplorerPage, EvidenceImportPage, SettingsPage.
- HimVote.Windows/ViewModels: MVVM classes using CommunityToolkit.Mvvm.
- HimVote.Windows/Services: ApiClient (generated C# client), SecureStore (DPAPI or Credential Locker), VerifierRunner, TrustPinStore, ReportExporter, EvidenceImporter, UpdateService.
- HimVote.Windows.Tests: xUnit tests.

Required features:
1. Sign in as student, administrator or election officer through the identity origin. Session stored with DPAPI.
2. Elections, candidates, receipt tracking and state labels identical to other clients. Casting through the supported booth in the default browser with a return callback.
3. Administrator workflows for authorized roles: election drafts, freeze, open, close, publication requests.
4. Offline audit explorer, the main thick client capability:
   - Import an evidence archive by file picker or drag and drop with safe extraction (no path traversal, no symlinks, size and file count limits).
   - Import trust pins from a separate file chosen by the user. Never read pins from inside the archive.
   - Run the bundled verifier (the Python CLI with an embedded interpreter, or a signed frozen executable) as a child process with no network access. Check its SHA256 before every run.
   - Show each property with PASS, FAIL, LIMITED, ASSUMED, NOT_SUPPORTED or UNVERIFIABLE and failure codes BAD_SIGNATURE, TRUNCATED, WRONG_CHAIN, INVALID_TALLY, MISSING_FINAL, STALE_CHECKPOINT.
   - Side by side published root and tally versus computed root and tally.
   - Export a deterministic JSON and text report containing the verifier SHA256.
5. Works with the election API unreachable.
6. Code signed installer, signed updates through the Microsoft Store or an enterprise MSIX channel, version and verifier version shown in Settings. No private keys in the package.

---

## 9. Voting engine gate

### 9.1 Gate E1 (first development block)

All of the following must succeed with the chosen vetted engine:
1. Create one real encrypted ballot and cast it once.
2. Export all native proof artifacts.
3. Run the engine independent verifier and get a clean pass.
4. Alter one byte of the ballot and confirm the verifier fails.
5. Confirm the engine can be restricted to one accepted cast with no revoting. Some engines, Belenios for example, accept revoting by default, so a UI block is not enough.
6. Confirm a supported web booth exists that the native apps can launch.

Check package, version, license, maintenance status and API before choosing. Evaluate Belenios and ElectionGuard. Neither is assumed to be a drop in library.

### 9.2 Outcome

Pass: profile VEEM with encrypted ballots, native proofs and native tally verification. Ballot secrecy language is allowed only here and always with its limits.

Fail: no live election may open. Resolve the engine problem, select another vetted engine, or limit the release to non secret voting use cases and label them with a permanent notice that individual ballot secrecy is not provided. Record the decision in docs/adr and docs/crypto_engine_review.md.

---

## 10. Privacy, data protection and logging

1. Issuance finishes before casting opens to reduce timing links.
2. Separate gateway routes, cookies, session stores and log stores for the two origins. Separate DBA accounts, backups and encryption keys.
3. No raw credentials, blinded values, plaintext ballots, passwords, trackers, or IP plus identity pairs in logs, metrics or traces. Test this with automated log scans.
4. Public exports hold ciphertext, proofs and verified totals, never plaintext individual selections and never per student timestamps.
5. Minimum anonymity policy in the manifest. Below the configured turnout threshold the result is marked PRIVACY_LIMITED and detail is suppressed.
6. Data protection program in ops/compliance: lawful basis and consent notices, data protection impact assessment, retention and deletion schedule, breach notification procedure, data subject request process. Align with the Digital Personal Data Protection Act 2023 and the Information Technology Act of India, and with GDPR or FERPA where the institution requires it.
7. Document in docs/privacy_limitations.md what the system does not solve: coercion, receipt freeness, compromised devices, network timing correlation, collusion of all authorities, very small electorates, and stolen credentials.

---

## 11. Environments and deployment

| Environment | Purpose | Notes |
|---|---|---|
| Local | Developer machines | compose.yaml plus compose.dev.yaml with local stand ins for witness and chain, clearly labelled non independent, never reachable from outside |
| CI | Automated tests | Ephemeral stack, fixtures only |
| Staging | Pre release validation | Production topology, separate keys, test tenant, independent witness test instance |
| Production | Live elections | Kubernetes, managed PostgreSQL clusters (two), KMS or HSM, independent witness, public or consortium chain |

Local development services: gateway, web, admin_api, identity_issuer, casting, election_engine, identity_db, casting_db, checkpoint_worker, witness stand in, local chain node, anchor_relayer, optional redis, seeding job. The stand ins exist only in local and CI and the production build refuses to start if it is configured with one.

Production requirements:
- Kubernetes with namespaces per trust domain, network policies denying all by default, pod security restricted, non root read only containers, signed images, admission policy that only allows signed images.
- Terraform for networks, two database clusters in separate accounts or projects, KMS keys per purpose, load balancer with WAF and DDoS protection, private endpoints.
- Databases: encrypted at rest, point in time recovery, daily restores tested, separate backup buckets with separate keys and separate access for identity and casting.
- Secrets in a vault or the cloud secret manager. None in environment files committed to git.
- mTLS between services, TLS 1.3 at the edge, HSTS, strict security headers.
- Horizontal autoscaling for stateless APIs. Casting correctness stays on database constraints and the election row lock. Load test targets: documented per institution size, with p95 cast latency and zero duplicate acceptance under load.
- Observability: OpenTelemetry with redaction rules, dashboards for latency, error rates, outbox backlog, witness lag, anchor lag. Alerts page the on call engineer. Metrics never contain choices, trackers, nullifiers or identity pairs.
- Availability objectives: 99.9 percent during an open election window, recovery point objective under 5 minutes for casting data, recovery time objective under 1 hour, tested in drills.
- Disaster recovery: restore from backup must be reconciled against the independent witness checkpoint and chain anchor before an election reopens to casting.

Local network addresses for development:

| Client | API base |
|---|---|
| Web on same host | http://localhost:8080 |
| Windows desktop same machine | http://localhost:8080 |
| Android emulator | http://10.0.2.2:8080 |
| Physical devices | https://LAN_HOST with a trusted certificate |
| iOS simulator | http://localhost:8080 |

Release builds never allow cleartext HTTP.

---

## 12. Security tests (automated)

### 12.1 Core integrity tests

| ID | Action | Must see |
|---|---|---|
| Q7-01 Duplicate | One credential, 100 concurrent and repeated submissions from web, Android and Windows clients | Exactly one leaf and one nullifier. Safe retry returns the same outcome. A different ballot is rejected |
| Q7-02 Unauthorized insertion | Forged credential, wrong election credential, unapproved roster member, unsupported candidate, direct database write | All rejected. Direct write denied. Audit fails if issuer evidence is falsified |
| Q7-03 Deletion | 10 witnessed ballots, remove one from the export, or present an older truncated final | Verifier fails against the independently fetched FINAL and the chain anchor |
| Q7-04 Modification | Change ciphertext, proof, nullifier, leaf index, manifest or candidate metadata | Merkle or proof mismatch, verifier fails |
| Q7-05 Result manipulation | Keep ballots, change the announced total | Tally verifier or result digest fails |

### 12.2 Protocol tests

- Issuance: two different blinded requests at once, crash before sign, crash after sign, lost response replay, lost blinding secret (no reissue), wrong election credential, issuance after cutoff.
- Casting: close and cast race with 100 simultaneous requests, two writers on one leaf index, outbox crash and replay, network drop after commit.
- Witness: wrong election, gap in tree size, permanent outage (result must be UNVERIFIABLE), two incompatible finals.
- Verifier: fake pins inside the export, obsolete partial checkpoint, forged auditor signature, wrong purpose or revoked key, unsupported proof version, malformed Merkle proof, duplicate JSON keys, path traversal archive, oversize archive.
- Chain: wrong chain ID, wrong contract or code, unfinalized block, reorg, unauthorized relayer, repeated sequence, second final.
- Privacy: log scan for secrets, join attempt across the two databases, small electorate labelling.
- Restore: restoring the casting database from an old snapshot must fail reopening until reconciled with the witness.
- Cross platform: same credential tried from web, Android, iOS and Windows, only the first accepted.

### 12.3 Governance tests

- Unauthorized invitation request denied.
- Admin cannot create a Super Admin.
- Admin cannot approve their own elevated grant.
- Role grant beyond tenant, department or election scope denied.
- Teacher cannot read another department.
- Duplicate student ID or forged roster evidence denied or held for review.
- Active but ineligible account cannot get a credential.
- Roster change after freeze rejected with an audit event.
- Candidate added after freeze rejected.
- Publication of an unaudited or disputed election rejected.
- Super Admin cannot sign an audit attestation.
- Password reset, MFA reset, suspension and duplicate registration cannot reset a spent credential.

### 12.4 Additional production tests

- Static analysis (SAST), dependency and container scanning, secret scanning, SBOM generation in CI. Critical findings block release.
- Dynamic scanning (DAST) against staging, OWASP ASVS level 2 checklist, OWASP API Security Top 10 review.
- Smart contract static analysis and fuzzing, plus an external contract audit before mainnet deployment.
- Load and soak tests, chaos tests for pod, node and database failover during an open election.
- Third party penetration test with all findings of high severity or above fixed and retested before go live.

Every test records test ID, seed, manifest digest, engine version, verifier SHA256, expected and actual result and database state summary. Tests assert postconditions, not only status codes. Reports go to docs/test_results.md and tests/*/reports.

---

## 13. Accessibility

WCAG 2.2 AA on all clients. Keyboard only completion of the ballot on web and desktop. Visible focus. Screen readers announce the selected option and the difference between pending and witnessed. Usable error summaries. The engine booth is tested for accessibility on its own, since wrapper compatibility is not enough. Publish an accessibility statement in the app.

---

## 14. Supply chain and release engineering

- Pin dependency versions and checksums. Reproducible builds where feasible. Provenance attestations (SLSA level 3 target) and signed container images.
- Sign Android, iOS and Windows releases with keys held in a managed signing service.
- CI stages: lint, unit tests, contract tests, Foundry tests, verifier vectors, web build and tests, Android build and tests, Windows build and tests on Windows runners, iOS build on macOS runners, security scans, image build and sign, staging deploy, smoke tests, manual approval, production deploy.
- Staged rollouts with feature flags and instant rollback. Database migrations are backward compatible for one release.
- A platform whose build or tests fail is reported as not delivered, never as done.

---

## 15. Key management

Distinct election scoped keys for roster approver, issuer, log writer, witness, auditor, relayer and trustees. Lifecycle states CREATED, ACTIVE, ROTATED, REVOKED, COMPROMISED, each change signed by a trust authority. Fingerprints are pinned through a channel separate from the export (printed QR, separately signed manifest, separate auditor configuration). A suspected compromise freezes publication until reviewed. Production private keys are generated in the HSM or KMS and never exported. Trustee key ceremonies are scripted, witnessed and recorded in ops/runbooks. Development keys exist only in fixtures and are rejected by production builds.

---

## 16. Operations and incident response

- Runbooks in ops/runbooks: deployment, rollback, key rotation, witness outage, chain outage, database failover, backup restore and reconciliation, suspected compromise, dispute handling, election cancellation.
- On call rotation, severity levels, communication templates, post incident reviews within five working days.
- Election day war room checklist: freeze of non essential deployments, extra capacity, live backlog and finality dashboards.
- Support process for voters, with canned answers that never ask a voter to reveal their choice or credential.
- Dispute process: a voter submits a tracker, the auditor classifies it as NEVER_COMMITTED, COMMITTED_PENDING_WITNESS, WITNESSED_MISSING_FROM_FINAL, FINAL_INCLUDED or UNDETERMINED. A credible witnessed but missing case blocks publication.

---

## 17. Documentation to maintain (docs/ and ops/)

threat_model.md, security_assumptions.md, data_flows.md, crypto_engine_review.md, privacy_limitations.md, test_results.md, key_management.md, witness_deployment_guide.md, runbook_local.md, accessibility_statement.md, architecture decision records under docs/adr, and compliance files under ops/compliance. Every security claim links to the test that supports it.

---

## 18. Product launch scenario for acceptance

Acceptance run on staging, repeated on production before the first live election:
1. Administrator drafts the election, a Roster Approver signs the roster, the Election Officer freezes the manifest.
2. Students receive their credential, vote through the booth, see PENDING_WITNESS then WITNESSED.
3. A repeat attempt from another platform is rejected and the tree size is unchanged.
4. Close, final witness checkpoint from the independent witness, chain anchor at finality.
5. The auditor runs the verifier on the Windows client offline, signs the attestation, results are published.
6. Tamper drills: flip a ciphertext byte, delete a leaf, change a total. The verifier fails each one.

---

## 19. Production readiness gate

No live election opens until every item is signed off with evidence:
1. Gate E1 passed and recorded.
2. All tests in Section 12 pass on staging.
3. Independent penetration test and independent cryptographic and protocol review completed, high severity findings fixed and retested.
4. Smart contract external audit completed and deployed to the production network with a multisig admin.
5. Independent witness operational under a separate organization, with pinned keys distributed out of band.
6. Auditor appointed outside the administration, with their own key.
7. Disaster recovery restore and reconciliation drill completed.
8. Data protection assessment approved, privacy notices published, retention schedule set.
9. Accessibility audit passed on web, Android, iOS and Windows.
10. Runbooks reviewed, on call staffed, load test at the expected peak with a safety margin.
11. Written approval from the institution election authority.

---

## 20. Build order with gates

| Phase | Deliver | Gate |
|---|---|---|
| 0 | Repository, CI skeleton, OpenAPI skeleton, golden vectors, local stack | Vectors agree across Python and one other language |
| 1 | Gate E1 engine test | Pass, or stop and resolve per Section 9.2 |
| 2 | identity_issuer: auth, MFA, roles, invitations, roster, snapshots, audit events | Governance tests pass |
| 3 | Blind issuance with crash tests | No second signature in any crash case |
| 4 | casting service, atomic transaction, outbox | Q7-01 passes at 100 parallel requests |
| 5 | checkpoint_worker and witness, FINAL, anti truncation | Q7-03 and Q7-04 pass |
| 6 | Solidity anchor, Foundry tests, relayer, finality logic | All chain negative tests pass |
| 7 | verifier CLI with exit codes | Q7-05 and all verifier negatives pass |
| 8 | Web client full flows | Playwright voting flow and keyboard flow pass |
| 9 | Windows desktop client with offline audit | Offline audit works with API stopped |
| 10 | Android client | Instrumented flow passes |
| 11 | iOS client | Build and flow pass on macOS |
| 12 | Kubernetes, Terraform, observability, backups, DR drill | Staging passes load and failover tests |
| 13 | Security assessments, accessibility audit, compliance sign off | Section 19 complete |

If time is limited, deliver phases 0 to 7 first, then web, then Windows, then Android, then iOS. A smaller correct system is better than a larger unproven one.

---

## 21. Definition of done

A feature is done only when the code is merged, an automated test proves it, an evidence artifact exists, limitations are documented, monitoring and alerts exist, and the UI shows only states that are actually confirmed. A platform is not claimed delivered without a real build and a passing test run on that platform.
