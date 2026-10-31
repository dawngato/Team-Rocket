# HimVote

HimVote is an institutional election platform prototype for university and campus elections. It combines role-based administration, authoritative enrollment workflows, privacy-preserving credential issuance, encrypted ballot casting, append-only evidence, witness checkpoints, independent verification tooling, and public result publication.

This repository is designed for synthetic data, local development, security testing, and controlled demonstrations. It is not currently approved for a real election.

The most important limitation is the voting engine. The repository includes Profile VEEM, a custom development adapter used to exercise ballot formats, proof validation, tally behavior, and attack resistance. Profile VEEM is not Helios, Belenios, ElectionGuard, or another independently reviewed election protocol. The established-engine release gate remains blocked until a supported upstream engine, its native booth or client protocol, its key ceremony, its ballot format, and its independent verifier are integrated and reviewed.

The second major limitation is evidence independence. The checked-in witness and local chain can demonstrate tamper detection in development, but a local Compose stack controlled by one operator does not prove independent witness custody, independent key custody, or administrator-independent history.

Read [FEATURE_STATUS.md](FEATURE_STATUS.md) for the current finding-by-finding status. It is the authoritative project status register for this checkout.

## Table of contents

- [Project status](#project-status)
- [What HimVote provides](#what-himvote-provides)
- [What HimVote does not yet prove](#what-himvote-does-not-yet-prove)
- [System architecture](#system-architecture)
- [Repository layout](#repository-layout)
- [Service responsibilities](#service-responsibilities)
- [Trust boundaries and data separation](#trust-boundaries-and-data-separation)
- [Election lifecycle](#election-lifecycle)
- [Student voting workflow](#student-voting-workflow)
- [Identity and account lifecycle](#identity-and-account-lifecycle)
- [Roles and permissions](#roles-and-permissions)
- [Security controls](#security-controls)
- [Evidence and verification model](#evidence-and-verification-model)
- [Known limitations and release blockers](#known-limitations-and-release-blockers)
- [Repository prerequisites](#repository-prerequisites)
- [Quick start](#quick-start)
- [Local web development](#local-web-development)
- [Local Compose development](#local-compose-development)
- [Environment configuration](#environment-configuration)
- [Network ports](#network-ports)
- [Database and migration rules](#database-and-migration-rules)
- [API overview](#api-overview)
- [Testing and verification](#testing-and-verification)
- [Synthetic demonstrations](#synthetic-demonstrations)
- [Production deployment guidance](#production-deployment-guidance)
- [Operational runbooks](#operational-runbooks)
- [Native clients](#native-clients)
- [Accessibility and UI guidance](#accessibility-and-ui-guidance)
- [Privacy and threat model](#privacy-and-threat-model)
- [Incident and failure behavior](#incident-and-failure-behavior)
- [Contribution workflow](#contribution-workflow)
- [Documentation map](#documentation-map)
- [License and responsible use](#license-and-responsible-use)

## Project status

### Current release classification

| Area | Current status | Meaning |
| --- | --- | --- |
| Public web experience | Implemented and locally tested | Public pages fail closed when authoritative election or result services are unavailable. |
| Role-aware navigation | Implemented and locally tested | Guests see public navigation only. Authenticated workspaces are derived from server-granted roles. |
| Server-side workspace protection | Implemented and locally tested | Next.js middleware validates sessions and role access before private workspace rendering. Backend authorization remains authoritative. |
| Election administration APIs | Implemented with scoped policies | Operations check role, MFA, election or institution scope, and lifecycle state. Deployment integration remains to be verified. |
| Student activation | Implemented with one-time activation flow | Production delivery requires a configured notification provider. |
| Staff invitations | Implemented with one-time invitation flow | Reusable default staff passwords are not supported. Production delivery requires a configured provider. |
| Redis-backed throttling | Implemented in service code | A multi-worker production deployment must still be exercised. |
| Anonymous casting boundary | Implemented in the current development adapter | The browser flow depends on the current custom engine and is not a production protocol claim. |
| Merkle evidence | Implemented and tested locally | Local witness custody is not independent custody. |
| Public results publication | Server and attestation gated | Publication requires the configured attestation and lifecycle prerequisites. Established-engine tally verification is still blocked. |
| Established voting engine | Blocked | Profile VEEM is explicitly classified as custom development and unverified. |
| Independent witness operation | Blocked | Separate operator, separate key custody, out-of-band pins, and retained history are not established by this repository alone. |
| Native platform release | Partially implemented | Android, iOS, Windows, Linux, and desktop sources exist; all supported toolchains have not been executed in this environment. |
| Real election readiness | Not ready | Use synthetic elections only until every release gate has independent evidence and institutional approval. |

### Current local verification baseline

The current checkout has been verified with the following local checks. These results demonstrate repository behavior on the verification host; they do not certify a deployed institution, a real election, or an independently operated trust domain.

- 71 targeted Admin API and Identity Issuer tests passed.
- 58 root regression and security tests passed with one duplicate-ZIP-entry warning.
- 1 load/concurrency test passed.
- 98 web Vitest tests passed across 17 test files.
- Web typecheck passed.
- Web lint passed.
- Next.js production build passed.
- Browser smoke passed against the production build.

The exact commands are in [FEATURE_STATUS.md](FEATURE_STATUS.md). Always rerun the commands in the environment being evaluated; historical reports are not substitutes for current logs.

## What HimVote provides

HimVote is organized around several security and product principles:

1. **The server is authoritative.** The browser cannot create a valid election, freeze a manifest, approve a roster, publish results, or decide eligibility merely by changing local state.
2. **Public pages fail closed.** If an authoritative service is unavailable, live routes show an error or an honest empty state. They do not invent active elections, candidate lists, results, turnout, manifests, or verification badges.
3. **Authentication and authorization are separate.** A valid session proves identity only. Each sensitive operation also checks role, MFA state, institution or election scope, object ownership where applicable, and lifecycle state.
4. **Role navigation is a view of permission, not a permission system.** Hiding a sidebar item improves user experience, but every backend operation repeats authorization checks.
5. **Eligibility and ballot casting are separate boundaries.** The identity service handles institutional eligibility and credential issuance. The casting service handles anonymous protocol-formatted ballots and nullifiers.
6. **Evidence has calibrated statuses.** A local Merkle calculation is not the same as an independently witnessed checkpoint. A receipt is not the same as a final tally proof.
7. **Prototype limitations are visible.** The current custom engine, local witness, local chain, notification delivery, and native build limitations are documented instead of being presented as completed production guarantees.

## What HimVote does not yet prove

The following claims must not be made for the current repository:

- Complete ballot secrecy against every deployment operator, gateway, log, timing, or endpoint-correlation threat.
- Coercion resistance, receipt-freeness, or protection against compelled disclosure.
- Production suitability of Profile VEEM.
- Independent trustee key custody or a production key ceremony.
- Administrator-independent witness history when all services run in one local Compose project.
- Independently verified results from a completed election using an established upstream engine.
- Production notification delivery until an approved provider is configured and monitored.
- Cross-platform release readiness until the supported Android, iOS, Windows, and Linux toolchains have produced and smoke-tested artifacts.
- Institutional, legal, accessibility, privacy, or election-authority approval.

## System architecture

The intended development topology is a set of service boundaries connected through an edge gateway. Identity and casting are deliberately separated into different data and network domains.

```text
                         Public browser and native clients
                                      |
                                      v
                         +---------------------------+
                         | Nginx gateway             |
                         | HTTP 8080 / HTTPS 8443    |
                         +-------------+-------------+
                                       |
             +-------------------------+-------------------------+
             |                                                   |
             v                                                   v
  +---------------------------+                         +---------------------------+
  | Identity origin           |                         | Casting origin            |
  | Identity Issuer :8081     |                         | Casting service :8082     |
  | Accounts, MFA, roster,    |                         | Encrypted ballots,        |
  | credentials, sessions     |                         | nullifiers, receipts      |
  +-------------+-------------+                         +-------------+-------------+
                |                                                       |
                v                                                       v
  +---------------------------+                         +---------------------------+
  | Identity PostgreSQL       |                         | Casting PostgreSQL        |
  | Users and enrollment     |                         | Ballots and checkpoints   |
  +---------------------------+                         +-------------+-------------+
                                                                        |
                                                                        v
                                                           +---------------------------+
                                                           | Checkpoint worker :8085   |
                                                           | Ordered Merkle leaves     |
                                                           +-------------+-------------+
                                                                        |
                                                                        v
                                                           +---------------------------+
                                                           | Witness :8086             |
                                                           | Local development witness |
                                                           +-------------+-------------+
                                                                        |
                                                                        v
                                                           +---------------------------+
                                                           | Anchor relayer :8087      |
                                                           | Local EVM chain :8545     |
                                                           +---------------------------+

  +---------------------------+
  | Admin API :8083           |
  | Election state, roles,    |
  | candidates, publication   |
  +---------------------------+

  +---------------------------+
  | Election engine :8084     |
  | Current provider:         |
  | custom_development_       |
  | unverified                |
  +---------------------------+
```

The diagram describes service responsibilities, not an assertion that every local container is independently operated. In the local profile, the same developer controls the gateway, databases, witness, relayer, chain, and keys unless an external deployment is deliberately introduced.

### Request flow summary

```text
Guest request
  -> public web route
  -> authoritative public election or result API
  -> public data only

Authenticated workspace request
  -> session cookie or validated bearer context
  -> Next.js middleware session validation
  -> server-granted roles and scopes
  -> workspace shell
  -> backend operation policy
  -> authoritative service read or mutation

Student ballot request
  -> authenticated identity and eligibility checks
  -> credential issuance through the identity origin
  -> protocol client or supported booth
  -> encrypted ballot and proof validation
  -> anonymous casting origin
  -> nullifier uniqueness check
  -> durable ballot and outbox commit
  -> receipt
  -> ordered checkpoint
  -> witness status
  -> final tally and publication gate
```

## Repository layout

```text
.
├── apps/
│   ├── web/                    Next.js web application
│   ├── android/                Android Jetpack Compose client source
│   ├── ios/                    iOS SwiftUI client source
│   ├── desktop/                Windows WinUI and Linux Avalonia clients
│   └── linux/                  Auxiliary Linux Tkinter demonstration
├── services/
│   ├── identity_issuer/        Accounts, sessions, MFA, roster and credentials
│   ├── casting/                Anonymous ballot acceptance and receipts
│   ├── admin_api/              Election operations and publication gate
│   ├── election_engine/        Current custom development adapter
│   ├── checkpoint_worker/      Ordered Merkle checkpoint processing
│   └── anchor_relayer/         Witness to EVM anchor relay
├── packages/
│   └── himvote_crypto/         Shared canonicalization, Merkle and signature code
├── verifier/                   Standalone offline evidence verifier
├── witness/                    Local witness service and storage
├── chain/                      Solidity anchor contract and Foundry files
├── infrastructure/
│   ├── nginx/                  Gateway configuration and certificates directory
│   └── migrations/             Database initialization and migration SQL
├── tests/
│   ├── security/               Security regression and attack fixtures
│   ├── integration/            Protocol and service integration tests
│   ├── load/                   Concurrency and load tests
│   ├── harness/                In-memory synthetic election harness
│   └── browser_smoke.py        Production web browser smoke flow
├── docs/                       Architecture, security, release and UI documentation
├── fixtures/                   Explicitly labeled development fixtures
├── compose.yaml                Local Compose topology
├── compose.dev.yaml            Local development overrides
├── compose.prod.yaml           Production hardening overrides
├── Makefile                    Root developer commands
├── .env.example                Environment variable template
├── FEATURE_STATUS.md            Current finding and verification register
└── README.md                   This guide
```

## Service responsibilities

### Web application: `apps/web`

The web application is a Next.js 15, React 19, and TypeScript application. It contains public routes, authenticated role workspaces, the student election workflow, administration screens, auditor screens, and public evidence views.

Important web rules:

- Public navigation contains public pages and Sign In only.
- The public header does not contain a role selector.
- Workspace navigation is derived from `/me` role data and scope data.
- Middleware validates the session before protected route content is rendered.
- The backend remains the final authorization boundary.
- Election, result, candidate, roster, credential, and evidence pages use authoritative API data or show a failure state.
- Local browser storage is not an election authority.
- Decorative visualizations must not be interpreted as evidence verification.

Common web routes include:

| Route group | Purpose |
| --- | --- |
| `/` | Public landing page with honest capability and limitation language. |
| `/elections` | Public released-election directory. |
| `/results` | Public published results returned by the authoritative service. |
| `/audit` | Public evidence and verification entry point. |
| `/how-it-works` | Architecture and workflow explanation. |
| `/security-limits` | Security assumptions and known limitations. |
| `/auth/*` | Login, registration, activation, invitation, recovery, and MFA flows. |
| `/student/*` | Student eligibility, elections, casting, receipts, and published results. |
| `/teacher/*` | Teacher classes, verification, roster corrections, and authorized elections. |
| `/officer/*` | Assigned elections, builder, candidates, roster, lifecycle, schedule, and publication operations. |
| `/admin/*` | Scoped student, staff, invitation, approval, roster, candidate, and audit administration. |
| `/super-admin/*` | Institution governance, administrator access, policy, and security oversight. |
| `/auditor/*` | Evidence, trusted pins, checkpoints, attestation import, and verification workflows. |

### Identity Issuer: `services/identity_issuer`

The Identity Issuer owns authenticated identity and enrollment-side state. It is responsible for:

- Account creation, login, logout, session validation, and recovery.
- Argon2id password hashing through the configured password policy.
- MFA setup and MFA verification for privileged roles.
- Shared rate limiting through Redis-backed controls in production.
- Student registration as a pending activation flow.
- One-time, expiring account activation tokens.
- Staff invitations and one-time invitation redemption.
- Teacher role assignments with department scope.
- Institutional roster import and student profile verification.
- Department and class scope checks for roster correction requests.
- Credential issuance status and the issuer public key.
- Role grants and two-person approval workflows.
- Identity-side audit events.

The identity service must not receive or store a voter's ballot choice. The exact privacy property achieved by the complete deployment depends on the protocol, gateway, logs, operator behavior, and configuration.

### Casting service: `services/casting`

The Casting service is the anonymous ballot boundary. It is responsible for:

- Receiving protocol-formatted encrypted ballots.
- Verifying election and manifest binding.
- Verifying credential proofs against the trusted issuer public key.
- Rejecting malformed, forged, expired, wrong-election, or wrong-manifest credentials.
- Deriving and enforcing unique election-scoped nullifiers.
- Enforcing the election open and close window.
- Persisting accepted ballot evidence without student identity fields.
- Writing checkpoint outbox entries atomically with accepted ballots.
- Returning an opaque receipt handle and calibrated receipt status.

The casting service must not trust a browser-provided student ID or client-side “already voted” flag. A local device flag may prevent accidental repeat actions, but only the server-side nullifier reservation enforces one accepted credential per election.

### Admin API: `services/admin_api`

The Admin API owns election management and lifecycle operations. It is responsible for:

- Election creation and scoped election reads.
- Candidate registration while a manifest remains mutable.
- Roster submission and independent roster approval.
- Manifest freezing and digest creation.
- Lifecycle transitions such as open, close, pause, and cancel.
- Publication requests and signed-attestation checks.
- Published result and evidence retrieval.
- Administrative audit event access.

Every sensitive operation must check:

1. A validated identity session or gateway assertion.
2. An allowed role for that named operation.
3. MFA where required.
4. Institution, department, or election scope.
5. Current election lifecycle state.
6. Separation-of-duties rules where approval or publication is involved.

Caller-supplied actor headers are only supported in an isolated loopback development profile. Production disables them and requires the identity service bridge.

### Election Engine Adapter: `services/election_engine`

The adapter boundary is intended to isolate the application from a selected election protocol. The current checked-in implementation is Profile VEEM, a custom development engine.

The current adapter provides development behavior for:

- Encrypted ballot construction.
- Candidate-choice proof validation.
- Sum proof validation.
- Credential proof validation.
- Nullifier derivation.
- Merkle evidence export.
- Development tally verification.
- Tamper detection and single-cast regression checks.

The adapter is explicitly not an established production engine. The production Compose profile requires an explicitly configured provider and sets `REQUIRE_ESTABLISHED_ENGINE=true` or equivalent release gates. A custom provider must not be renamed to make it appear vetted.

### Checkpoint worker: `services/checkpoint_worker`

The checkpoint worker consumes accepted ballot outbox rows in order. It is responsible for:

- Preserving sequential leaf ordering.
- Recomputing canonical leaf bytes.
- Building RFC 9162-style domain-separated Merkle hashes.
- Tracking tree size and checkpoint sequence.
- Producing incremental and final checkpoint records.
- Sending checkpoint material to the witness service.
- Detecting gaps, duplicate sequence numbers, rollback attempts, and inconsistent final checkpoints.

The checkpoint worker does not by itself make evidence independent. Independence depends on who operates the witness, who controls the signing key, how the root is pinned, and whether history is retained outside the main operator's control.

### Witness service: `witness`

The repository witness is a local development witness service. It validates checkpoint structure and signs acknowledgements using local development storage.

For an independent deployment, the witness must be operated separately with:

- A different operator or organizational trust domain.
- A separately generated private signing key.
- Public key distribution through an out-of-band trusted process.
- Append-only retained checkpoint history.
- Monitoring and alerting for gaps, rollbacks, equivocation, and key changes.
- A documented recovery and key rotation procedure.

### Anchor relayer and chain: `services/anchor_relayer` and `chain`

The anchor relayer can submit final checkpoint commitments to the development EVM node and `HimVoteAnchor.sol` contract. The local chain is useful for reproducible demonstrations, but a local Anvil node is not an independent public trust anchor.

Production use would require an externally operated or independently governed chain environment, audited contract deployment, key custody, chain identity pinning, finality policy, transaction monitoring, and recovery procedures.

### Standalone verifier: `verifier`

The verifier is an offline-oriented Python tool that can inspect an evidence archive and trusted pins. It is intended to validate properties such as:

- Archive structure and path safety.
- Manifest canonicalization and digest binding.
- Roster and issuance closure evidence.
- Ballot record integrity.
- Credential and nullifier uniqueness.
- Merkle leaf and inclusion paths.
- Witness checkpoint signatures and monotonicity.
- Final checkpoint and chain receipt evidence where configured.
- Tally consistency and available proof evidence.

The verifier must receive trusted pins from outside the untrusted archive. If the archive supplies both the evidence and the trust root, the verification result is only an internal consistency result, not independent verification.

## Trust boundaries and data separation

### Identity domain

The identity domain contains:

- User records.
- Password hashes and MFA state.
- Session records.
- Role assignments and scopes.
- Student enrollment profiles.
- Staff profiles.
- Roster correction records.
- Invitation and activation token hashes.
- Credential issuance records and issuer material.

It should not contain ballot choices or accepted encrypted ballot payloads.

### Casting domain

The casting domain contains:

- Election and manifest identifiers needed for ballot validation.
- Encrypted ballot payloads and proof material.
- Credential nullifiers.
- Receipt handles or receipt hashes.
- Outbox rows for checkpointing.
- Checkpoint and evidence metadata.

It should not contain student names, student IDs, login email addresses, or identity session tokens.

### Administrative domain

The Admin API manages election metadata, lifecycle, candidate records, roster snapshots, and publication metadata. It must use its own database principal and must not silently fall back to the casting database or to a temporary in-memory database in production.

### Network separation

The local Compose file defines separate frontend, identity, and casting networks. Production should expose only the gateway to the public network. Internal databases, Redis, witness, chain, engine, and service ports should remain private.

Network separation reduces accidental linkage and blast radius; it does not prove privacy against a single operator who controls all networks, logs, hosts, and keys.

## Election lifecycle

The election state machine is authoritative. UI state, local arrays, browser storage, and URL parameters cannot advance an election.

The conceptual lifecycle is:

```text
DRAFT
  -> REVIEW or APPROVED
  -> FROZEN
  -> SCHEDULED
  -> ISSUING
  -> ISSUANCE_CLOSED
  -> OPEN
  -> CLOSING
  -> CLOSED_PENDING_WITNESS
  -> FINAL_WITNESSED
  -> ANCHOR_FINALIZED
  -> AUDIT_PASSED or AUDITOR_ATTESTED
  -> PUBLISHED
```

Possible controlled outcomes include `PAUSED`, `CANCELLED`, `AUDIT_FAILED`, `DISPUTED`, and `UNVERIFIABLE`. Exact transitions are defined in the Admin API state machine and must be tested whenever the lifecycle is changed.

### Draft stage

An authorized officer or administrator creates the election with:

- Title and contest information.
- Selection rule.
- Opening, closing, and issuance cutoff timestamps in UTC.
- Institution or delegated scope.
- Minimum anonymity or turnout policy where applicable.

The server assigns the election ID. The browser must not select a persistent election identifier or create a release-level manifest locally.

### Candidate stage

Candidates are persisted through scoped Admin API operations. Candidate identifiers are allocated or validated by the server. Candidate changes are allowed only while the election is mutable.

Once the manifest is frozen, candidate mutations must fail with a conflict or require a separately approved amendment process. A browser refresh must show the server's candidate set, not a locally cached substitute.

### Roster stage

Roster records are submitted by an authorized importer or officer and approved by an independent authorized approver. The approver must not be the importer. Roster records are committed with a version and commitment so that eligibility is bound to the frozen election configuration.

Teacher corrections are scoped to the teacher's authoritative department or class assignment. A browser-supplied department is not trusted as proof of the student's actual department; the student's enrollment record is resolved first.

### Freeze stage

Freezing creates a manifest digest binding the election configuration. The manifest should include, at minimum:

- Election ID.
- Candidate IDs and display mapping.
- Contest and selection rule.
- Issuer key identifier.
- Engine name and protocol version.
- Public encryption parameters or engine public key reference.
- Trustee or key ceremony references.
- Roster commitment.
- Witness key identifiers.
- Auditor key fingerprint.
- Verifier version.
- Election windows and privacy thresholds.

After freeze, the server rejects changes that would invalidate the digest.

### Open and close stages

Opening is allowed only after required issuance and freeze prerequisites. Closing prevents new ballots after the authoritative close boundary and starts final evidence processing. Client clocks are not trusted for lifecycle decisions.

### Publication stage

Publication requires the server-side lifecycle prerequisites and an attestation that binds the election, manifest digest, final checkpoint, tally, and available anchor evidence. The UI must show success only after a successful server response and authoritative readback.

## Student voting workflow

The supported conceptual browser workflow is:

1. The student signs in through the identity service.
2. The server returns the student's roles, enrollment status, and election eligibility state.
3. The student opens an election that is genuinely available to that identity and scope.
4. The browser obtains the authentic frozen election manifest, candidate mapping, digest, election state, and engine parameters.
5. The identity service issues or confirms an election-bound credential through the configured credential protocol.
6. The client or selected engine booth creates a protocol-formatted encrypted ballot.
7. The ballot carries the required election, manifest, credential, encryption, and proof bindings.
8. The casting service verifies the credential signature and proof, election and manifest binding, proof variant, time window, ballot proofs, and nullifier uniqueness.
9. The casting service atomically commits the ballot and checkpoint outbox entry.
10. The student receives an opaque receipt handle.
11. The checkpoint worker includes the accepted record in the ordered evidence tree.
12. The witness acknowledges the checkpoint where a configured witness is available.
13. After closure, final evidence and tally verification are performed.
14. Results are published only after the publication gate succeeds.

### Voting failure behavior

Voting must stop if any authoritative prerequisite is unavailable or inconsistent. In particular, the client must not:

- Construct a fake open election.
- Construct a fake candidate list.
- Invent a manifest digest.
- Use a stale candidate mapping after manifest freeze.
- Accept a credential without issuer verification.
- Treat browser storage as proof that a vote was spent.
- Display a successful receipt before the casting service confirms acceptance.

### Receipt status language

Receipt UI should distinguish:

| Status | Meaning |
| --- | --- |
| `SUBMITTED` | The client submitted data; server acceptance is not yet proven. |
| `COMMITTED_PENDING_WITNESS` | The casting service durably accepted the ballot, but witness acknowledgement is pending. |
| `WITNESSED` | A configured witness acknowledged the checkpoint. |
| `INCLUDED_FINAL` | The final evidence tree includes the receipt and has completed the required finalization. |
| `TALLY_VERIFIED` | The independent verifier validated the published tally evidence. |
| `LIMITED` | A local or partial check passed, but the required independent trust root or evidence is missing. |
| `FAIL` | Verification detected a contradiction, invalid signature, invalid proof, tamper, gap, rollback, or other failure. |
| `NOT_CHECKED` | No verification has been performed. |

## Identity and account lifecycle

### Student registration

Student self-registration creates a pending account and does not silently activate login. The flow must:

1. Validate the requested identity fields.
2. Reject duplicate student ID and email records.
3. Create the account in a pending status.
4. Create a single-use, expiring activation record containing only a token hash.
5. Deliver the activation message through a configured notification provider.
6. Expose a development token only in an explicit development delivery mode.
7. Verify the authoritative enrollment record through the approved institutional workflow.
8. Let the student establish a password through the activation flow.
9. Require MFA enrollment where policy requires it.
10. Activate login only after the required checks complete.

If notification delivery is unavailable in production, the service fails closed. It must not claim that an email was sent.

### Teacher and staff provisioning

Privileged staff accounts must not receive a predictable shared password or a reusable password displayed to an administrator. The supported design is:

- Create a pending or invited identity.
- Assign the requested role and department scope only after authorization.
- Store the invitation token as a hash.
- Deliver a single-use, expiring invitation through a configured provider.
- Let the invitee choose a password.
- Require MFA enrollment for privileged roles.
- Audit the issuer, scope, delivery state, redemption, expiry, and revocation.

### Sessions

Production sessions should use secure, HttpOnly cookies through a same-origin or controlled BFF flow. Browser JavaScript should not receive long-lived bearer secrets. Every `/me` response must be treated as authoritative for current roles and scopes; revocation must invalidate access on the next protected request.

### Password recovery

Recovery tokens are single-use and time-limited. Recovery delivery must fail closed when no approved notification adapter is configured. Error messages should not reveal whether an email or student ID exists.

## Roles and permissions

The system uses capabilities and scope rather than a simple numeric hierarchy. A Super Admin is not automatically an Auditor, Trustee, or Student voter. A user with multiple approved roles receives the union of expressly granted capabilities, subject to separation-of-duties rules.

| Capability | Guest | Student | Teacher | Election Officer | Admin | Super Admin | Auditor |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public homepage, public elections, released results | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Own dashboard | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Own eligibility and credential state | No | Yes | Only if separately eligible | Only if separately eligible | Only if separately eligible | Only if separately eligible | No by default |
| Student ballot | No | If eligible | Only if separately eligible | Only if separately eligible | Only if separately eligible | Only if separately eligible | Only if separately eligible |
| Own opaque receipts | No | Yes | If cast as student | If cast as student | If cast as student | If cast as student | If cast as student |
| Department students | No | No | Assigned scope | Explicit grant only | Assigned scope | Authorized institution | Generally no |
| Verify student | No | No | Assigned scope | Explicit grant only | Assigned scope | Authorized institution | No |
| Create election | No | No | No | Assigned scope | Delegated scope | Explicit grant only | No |
| Candidate management | No | No | No | Assigned election | Delegated scope | Explicit grant only | No |
| Open and close election | No | No | No | Assigned election | Delegated scope | Explicit grant only | No |
| Internal audit logs | No | No | Limited records | Assigned election | Assigned scope | Authorized institution | Approved evidence |
| Administrator grants | No | No | No | No | Limited requests | Controlled governance | No |
| Independent attestation signing | No | No | No | No | No | No by default | Auditor key only |
| View a private vote choice | No | No | No | No | No | No | No |

### Workspace navigation

The public header contains:

- Home.
- Elections.
- How It Works.
- Results.
- Public Verification.
- Security Limits.
- Sign In when signed out.

The authenticated shell derives available groups from server-provided roles and scopes. A client-side role switcher is not a security feature and is not present in the public application.

## Security controls

### Authentication and authorization

- Production Admin API requests require an identity session or gateway assertion.
- Caller-supplied actor headers are disabled in production.
- Development actor headers are loopback restricted and must remain isolated.
- Administrative operations require explicit operation policies.
- MFA is required for privileged operations where configured.
- Election and institution scope is checked at the operation boundary.
- Public queries cannot request unpublished states by changing a query parameter.
- Internal election reads require the appropriate role and scope.
- Audit reads are role-restricted and scope-filtered.

### Rate limiting

The identity service applies shared rate limiting for login, MFA, registration, recovery, activation, invitation, and relevant staff-management paths. Redis is required for a consistent multi-worker limit in production. A production deployment must fail closed if the required rate limiter is unavailable rather than silently reverting to an unbounded local dictionary.

Rate limiting must be paired with:

- Privacy-safe error messages.
- No username enumeration.
- Bounded account lockout behavior.
- Recovery paths that do not allow denial-of-service against a target account.
- Monitoring for credential stuffing and invitation abuse.

### Credential verification

The casting boundary must verify a trusted issuer signature rather than merely parsing a credential or deriving a nullifier from arbitrary bytes. Required checks include:

- Trusted issuer public key.
- Credential proof variant and version.
- Election ID binding.
- Manifest digest binding.
- Expiration or issuance validity.
- Signature validity.
- Nullifier derivation and uniqueness.
- Rejection before database or outbox mutation.

### Election and manifest integrity

- Candidate changes are server-backed and draft-only.
- Candidate IDs are not trusted from the browser as persistent authority.
- Frozen manifests reject ordinary mutation.
- Lifecycle transitions are validated by the state machine.
- Results and evidence are read from the authoritative service.
- The browser never substitutes a demo election or sample tally after an API error.

### Database safety

Production database behavior must be fail closed:

- No fallback to in-memory SQLite after a production database failure.
- No implicit production `create_all` in place of migrations.
- Managed migration version checks at startup.
- Distinct identity, casting, and admin database principals.
- No admin principal access to raw casting ballot payloads unless a narrowly defined service API is explicitly approved.
- Encrypted backups, restore tests, retention policies, and access audit logs.

The local development Compose profile intentionally uses disposable settings and, in some services, development SQLite or defaulted development secrets. Do not expose it to the public Internet.

### CSRF and cookie handling

Cookie-authenticated mutation requests require a deliberate CSRF design. The implementation includes same-site origin checks and secure cookie configuration paths. A production deployment must verify:

- HTTPS-only cookie behavior.
- Correct `SameSite`, `Secure`, `HttpOnly`, `Domain`, and `Path` settings.
- Origin and `Sec-Fetch-*` checks.
- CSRF token behavior for cross-origin capable clients.
- No token or credential material in URL query strings.

### URL and log privacy

Credentials, ballot selections, proof artifacts, and identity tokens must not be placed in navigation URLs. Mobile and web handoff designs should use a back-channel or an opaque, short-lived, one-time authorization bound to the expected origin and election. Proxy, analytics, referrer, browser-history, and crash logs must be reviewed for secret leakage.

### Honest UI status

A green badge is not a cryptographic proof. UI status must identify:

- The property checked.
- The evidence source.
- The signer or witness.
- The trusted root or pin.
- The checkpoint tree size and timestamp where applicable.
- Whether the check is local, witnessed, independently pinned, or tally verified.

## Evidence and verification model

### Canonical data

Evidence records must use one canonical serialization contract. The repository contains shared canonicalization utilities and vectors for deterministic JSON representation. Any cross-language implementation must use compatible rules for:

- Unicode strings.
- Number representation.
- Object-key ordering.
- Duplicate keys.
- Rejected data types.
- Size and numeric limits.

Changing canonical leaf formats requires an explicit version and migration plan because existing Merkle roots depend on the exact bytes.

### Merkle log

The development evidence log uses domain-separated hashes conceptually equivalent to:

```text
leaf_hash = SHA256(0x00 || canonical_leaf_bytes)
node_hash = SHA256(0x01 || left_child_hash || right_child_hash)
```

The verifier can recompute a path from a leaf to a root. That proves mathematical consistency with the supplied root. It does not prove administrator-independent integrity unless the root is authenticated against an independently obtained trusted witness checkpoint.

### Witness levels

Use the following distinctions:

1. **Local consistency:** The service can recompute its own data and hashes.
2. **Committed:** The casting service durably accepted a ballot.
3. **Witnessed:** A configured witness signed a checkpoint.
4. **Independently pinned:** The witness public key and checkpoint history were obtained through a separate trust process.
5. **Tally verified:** A standalone verifier validated the final tally and all required engine evidence.

The local Compose witness normally provides levels 1 through 3 only. It must not be described as independent.

### Evidence archive

An evidence archive should include or reference:

- Frozen manifest.
- Manifest digest.
- Roster commitment and approval evidence.
- Issuance closure evidence.
- Accepted ballot evidence without identity fields.
- Final checkpoint.
- Witness signatures and key identifiers.
- Chain receipt and finality evidence where configured.
- Tally and proof artifacts.
- Verifier version and expected digest.
- A machine-readable report.

Trusted pins must live outside the archive being verified. The archive cannot choose its own trust roots.

## Known limitations and release blockers

### Established engine blocker

Profile VEEM is a local custom engine. Its mathematical regression tests are valuable but do not establish:

- Independent protocol review.
- Production key ceremony.
- Compatibility with a maintained upstream engine.
- Native ballot serialization compatibility.
- Independent upstream tally verification.
- Production booth and client handoff compatibility.

The release must select a supported established engine, document licensing and deployment requirements, integrate its native verification flow, and run a complete clean synthetic election through the upstream verifier.

### Independent witness blocker

The local witness, local database, relayer, and Anvil chain run within one operator-controlled topology. A production evidence claim requires separate custody and a pinned history outside that operator's control.

### Notification blocker

The code supports notification delivery adapters and fails closed when production delivery is not configured. Production onboarding and recovery cannot be declared complete until a real approved provider is configured, delivery status is durable, tokens are one-time and expiring, and delivery/retry monitoring is tested.

### Deployment blocker

The production Compose overlay requires managed URLs, secrets, TLS, migration versions, established-engine configuration, Redis, and internal service routing. The repository does not prove that an EC2 or other deployment has been configured correctly. Run the deployment preflight, port scan, backup/restore drill, and failover tests in the target environment.

### Native build blocker

Source exists for multiple native clients, but source presence is not a build result. Each platform requires its own supported toolchain, artifact, smoke test, signing or debug evidence, and API contract test.

### Accessibility blocker

The web application includes semantic labels, keyboard-oriented components, responsive layouts, and reduced-motion behavior. A complete WCAG audit, screen-reader matrix, zoom test, contrast audit, and native accessibility audit remain deployment evidence tasks.

## Repository prerequisites

For local Python and web development, install:

- Python 3.12 or newer compatible with the pinned project dependencies.
- `pip` and a virtual environment.
- Node.js and npm compatible with Next.js 15.
- Docker Engine and Docker Compose v2 for the container topology.
- Optional Foundry tools (`forge`, `anvil`, `cast`) for chain development.
- Optional Android Studio and SDK for Android.
- Optional Xcode for iOS.
- Optional .NET 8 SDK and platform workloads for desktop clients.

The repository may contain environment-specific lock files and service requirements. Install service dependencies in the service environment being tested; do not assume that a root Python environment contains every service dependency.

## Quick start

### 1. Clone and enter the repository

```bash
git clone https://github.com/dawngato/Team-Rocket.git
cd Team-Rocket
```

### 2. Create a Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

Install the dependencies required by the tests or service you are working on. The service-specific requirement files are located in `services/*/requirements.txt`; the checkpoint worker also has a `pyproject.toml`.

### 3. Validate the environment template

```bash
cp .env.example .env
python3 tools/env_loader.py check
```

Do not commit `.env`. Replace every `CHANGE_ME` value before using a deployment profile. Development secrets must not be reused in staging or production.

### 4. Run the local web application

```bash
cd apps/web
npm ci
npm run dev
```

Open `http://localhost:3000`. If the authoritative services are not running, public routes should display an honest unavailable state rather than fabricated elections or results.

### 5. Run the local Compose topology

From the repository root:

```bash
docker compose up --build
```

For background mode:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f gateway web identity_issuer casting admin_api
```

The local profile is for development only. It exposes several services on loopback ports and uses development defaults. It must not be bound to a public interface.

### 6. Stop the local topology

```bash
docker compose down
```

To remove disposable local volumes, inspect the target first and then use the explicit Compose volume command appropriate for the local environment. Do not remove production volumes as part of a development cleanup.

## Local web development

The web package is located at `apps/web`.

```bash
cd apps/web
npm ci
npm run dev
```

Available scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create the production Next.js build. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | Generate Next route types and run TypeScript checks. |
| `npm run lint` | Run ESLint over source and tests. |
| `npm run lint:fix` | Apply automatic ESLint fixes; review all changes afterward. |
| `npm test` | Run Vitest. |
| `npm run test:e2e` | Run configured Playwright tests. |

If the local environment resolves `node` to a Bun shim and Vitest's esbuild service stops, run Vitest with the installed system Node binary:

```bash
/usr/bin/node node_modules/vitest/vitest.mjs run
```

This is an environment workaround, not a production runtime requirement.

## Local Compose development

`compose.yaml` defines the development topology. `compose.dev.yaml` provides development overrides, and `compose.prod.yaml` overlays production settings.

### Development profile characteristics

- Gateway ports bind to loopback.
- Web binds to loopback port 3000.
- Identity, casting, engine, witness, chain, and Redis development ports bind to loopback where configured.
- Identity and casting databases use separate Postgres services and volumes.
- Redis is required for the identity rate limiter.
- The engine provider is `custom_development_unverified`.
- The witness is local development custody.
- Anvil is a local development chain.
- Development credentials and passwords must never be reused.

### Production overlay characteristics

The production overlay is intentionally fail closed and requires values such as:

- Managed identity and casting database URLs.
- Identity and Admin API service URLs.
- HTTPS trusted origins.
- Issuer public and private key material through secret management.
- Redis URL.
- Pinned auditor public key.
- Admin schema version.
- Established voting engine provider and key ceremony material.
- TLS certificates and gateway configuration.
- Internal control tokens where required.

Apply the overlay only after reviewing every variable and service dependency:

```bash
docker compose -f compose.yaml -f compose.prod.yaml config
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

`docker compose config` is a useful rendering check, but it is not a security approval. Inspect the rendered ports, networks, secrets, volumes, images, health checks, and environment values before starting.

## Environment configuration

`.env.example` is the source template. Important groups include:

| Group | Representative variables | Notes |
| --- | --- | --- |
| Runtime | `APP_ENV`, `APP_DEBUG`, `APP_VERSION` | Production must disable debug behavior. |
| Gateway | `GATEWAY_HOST`, `GATEWAY_PORT`, `GATEWAY_TLS_ENABLED`, certificate paths | Only the gateway should be public in production. |
| Origins | `CORS_ALLOWED_ORIGINS`, `IDENTITY_ALLOWED_ORIGINS`, `CASTING_ALLOWED_ORIGINS` | Use exact trusted HTTPS origins in production. |
| Identity database | `IDENTITY_DB_*`, `IDENTITY_DATABASE_URL` | Identity data only. Use TLS and managed credentials. |
| Casting database | `CASTING_DB_*`, `CASTING_DATABASE_URL` | Encrypted ballots and nullifiers only. |
| Admin database | `ADMIN_DB_URL`, `ADMIN_SCHEMA_VERSION` | Must fail closed on connection or migration mismatch. |
| Redis | `REDIS_URL`, `REDIS_HOST`, `REDIS_PASSWORD` | Shared rate limiting and queue support. |
| Issuer keys | `ISSUER_PRIVATE_KEY_PEM`, issuer public key variables | Use KMS or HSM in production. |
| Engine | `VOTING_ENGINE_PROVIDER`, `ENGINE_ESTABLISHED`, engine key variables | Custom development providers are release-blocked. |
| Witness | `WITNESS_BASE`, `WITNESS_PUBLIC_KEY`, `WITNESS_KEY_ID` | Pins must be delivered out of band for independent operation. |
| Chain | `CHAIN_RPC_URL`, `CHAIN_ID`, `CHAIN_CONTRACT_ADDRESS`, finality settings | Local Anvil is demonstration-only. |
| Notifications | Provider, sender, callback, and public URL settings in the identity service | Delivery must be configured before production onboarding. |
| Verifier | `TRUST_PINS_PATH`, `VERIFIER_PATH`, `VERIFIER_SHA256` | Keep trusted pins outside untrusted archives. |
| Web | `NEXT_PUBLIC_*`, `IDENTITY_SERVICE_URL` | Server-side identity validation must use an internal trusted URL in production. |
| Native clients | Android, iOS, and desktop signing variables | Never commit signing keys or provisioning secrets. |

Never put private keys, database passwords, Redis passwords, notification credentials, signing keys, or session secrets in Git, screenshots, browser storage, URL query parameters, or public logs.

## Network ports

The following are development defaults. Production should expose only ports 80 and 443 through the gateway, or the equivalent approved ingress.

| Port | Component | Development exposure |
| --- | --- | --- |
| 3000 | Next.js web | Loopback web development server. |
| 8080 | HTTP gateway | Loopback in `compose.yaml`; public only behind approved deployment controls. |
| 8443 | Local HTTPS gateway | Loopback development TLS endpoint. |
| 8081 | Identity Issuer | Loopback development port. |
| 8082 | Casting service | Loopback development port. |
| 8083 | Admin API | Usually internal; verify Compose and service configuration. |
| 8084 | Election Engine | Loopback development port. |
| 8085 | Checkpoint worker | Service endpoint or internal worker boundary. |
| 8086 | Witness | Loopback development port. |
| 8087 | Anchor relayer | Internal service boundary. |
| 8545 | Anvil or EVM node | Loopback development port. |
| 6379 | Redis | Loopback development port. |
| 5432 | Identity Postgres | Internal development database port. |
| 5433 | Casting Postgres | Optional host mapping depending on Compose file. |

Do not assume a port is private because it is not linked in the web UI. Verify Docker bindings, host firewall rules, security groups, reverse proxy routes, and cloud load balancer listeners.

## Database and migration rules

### Production rules

- Use managed PostgreSQL or an equivalently controlled persistent database.
- Use separate principals for identity, casting, and administration.
- Apply migrations before application startup or as a controlled deployment step.
- Validate the expected schema version at startup.
- Refuse to start if the database URL is wrong, unavailable, or incompatible.
- Do not call `create_all` in production as a replacement for migrations.
- Test backup restore and point-in-time recovery.
- Audit database administrator access.
- Do not export identity and casting tables into the same uncontrolled archive.

### Development rules

Local SQLite or disposable Postgres settings may be used only for isolated tests and development. Development fallback behavior must never be enabled in a public or production environment.

### Privacy rules

Before adding a column to the casting database, ask whether it can link a ballot to a person, session, device, IP address, stable tracing identifier, or identity-origin event. If the field is not necessary for protocol validation or evidence, do not store it.

## API overview

The gateway normally fronts the service APIs. Direct service ports are for local development and controlled internal calls.

### Identity and authentication routes

Representative routes under the Identity Issuer include:

```text
POST /v1/auth/login
GET  /v1/auth/me
POST /v1/auth/logout
POST /v1/auth/recover
POST /v1/auth/reset
POST /v1/auth/activate
POST /v1/auth/mfa/setup
POST /v1/auth/mfa/verify
POST /v1/auth/invitations/redeem
```

Authentication failures should not disclose whether a user exists. Mutations must enforce appropriate Origin or CSRF protections when cookie-authenticated.

### Roster and credential routes

```text
POST /v1/students/register
POST /v1/students/import
GET  /v1/students
POST /v1/students/{student_id}/verify
GET  /v1/roster/me
GET  /v1/roster/corrections
POST /v1/roster/corrections
POST /v1/roster/snapshots
POST /v1/roster/snapshots/{snapshot_id}/approve
POST /v1/roster/snapshots/{snapshot_id}/freeze
GET  /v1/credentials/public-key
POST /v1/credentials/issue
GET  /v1/credentials/issuance-status
```

The exact request and response schemas live in the service Pydantic models. Do not treat a browser-supplied department as authoritative; the service must resolve enrollment and scope from trusted records.

### Administration routes

```text
GET  /v1/admin/invitations
POST /v1/admin/invitations
GET  /v1/admin/approvals
POST /v1/admin/role-grant-requests
POST /v1/approvals/{approval_id}/decision
GET  /v1/admin/teachers
POST /v1/admin/teachers
GET  /v1/admin/audit-events
```

Admin endpoints require role, scope, MFA, separation-of-duties, and lifecycle checks as appropriate. A successful HTTP response must represent a durable server action, not a local React state change.

### Election routes

```text
GET    /v1/elections
POST   /v1/elections
GET    /v1/elections/{id}
PUT    /v1/elections/{id}
DELETE /v1/elections/{id}
GET    /v1/elections/{id}/candidates
POST   /v1/elections/{id}/candidates
POST   /v1/elections/{id}/roster
POST   /v1/elections/{id}/roster/approve
POST   /v1/elections/{id}/freeze
POST   /v1/elections/{id}/open
POST   /v1/elections/{id}/close
POST   /v1/elections/{id}/cancel
POST   /v1/elections/{id}/pause
POST   /v1/elections/{id}/publication-request
GET    /v1/elections/{id}/results
GET    /v1/elections/{id}/evidence
```

Public election reads return only released states. Internal reads require an explicit internal-read capability and election or institution scope.

### Casting routes

The Casting service exposes endpoints for protocol ballot submission, receipt lookup, checkpoint or internal control operations, and health checks. Read the route definitions in `services/casting/src/routes.py` and the schemas in `services/casting/src/schemas.py` before integrating a client; do not invent payload fields in a generic React component.

## Testing and verification

### Backend syntax and targeted service suites

```bash
python -m compileall -q services/admin_api/src services/identity_issuer
python -m pytest -q services/admin_api/tests services/identity_issuer/tests
```

This covers Admin API authentication and operation policy tests, election lifecycle tests, publication gates, identity authentication, invitation and approval flows, notification delivery behavior, roster scoping, and credential issuance behavior.

### Root regression and security suite

```bash
python -m pytest -q tests --ignore=tests/load
```

The root suite covers verifier behavior, archive safety, evidence checks, canonicalization, attack fixtures, and other repository-level regression tests.

### Load and concurrency suite

```bash
python -m pytest -q tests/load
```

Run this separately because it may require different timing, async, or database dependencies. The required acceptance property is not merely throughput; it includes exactly one accepted credential under concurrency, no duplicate leaf index, no lost outbox row, and deterministic rejection of competing requests.

### Web tests

```bash
cd apps/web
npm ci
/usr/bin/node node_modules/vitest/vitest.mjs run
npm run typecheck
npm run lint
npm run build
```

The web tests cover API clients, election state, casting and receipt behavior, admin approval flows, role navigation, dialogs, design tokens, teacher roster flows, offline audit behavior, and UI regressions.

### Browser smoke test

Build the app, then run the browser smoke helper:

```bash
cd apps/web
HIMVOTE_WEB_URL=http://127.0.0.1:3100 \
HIMVOTE_SCREENSHOT=/tmp/himvote-home.png \
python /home/Kali/.agents/skills/webapp-testing/scripts/with_server.py \
  --timeout 90 \
  --server "./node_modules/.bin/next start -p 3100" \
  --port 3100 \
  -- python -u tests/browser_smoke.py
```

The smoke test should verify the public home page, public navigation, absence of privileged role selectors, no fabricated public data, and the expected protected-route behavior defined by the test.

### Engine regression checks

```bash
python3 services/election_engine/gate_e1.py
python -m pytest -q services/election_engine/tests
```

These checks are development regression evidence for Profile VEEM. Passing them does not satisfy the established-engine release gate.

### Offline verifier checks

```bash
python verifier/verify.py --help
python -m pytest -q verifier
python -m pytest -q tests/test_verifier.py
```

Use trusted pins stored outside the archive. A verifier result should be retained with the input archive digest, trust-pin digest, verifier version, command, runtime version, and report output.

### Test evidence requirements

Every security-sensitive test report should record:

- Commit or source archive digest.
- Host and toolchain versions.
- Exact command.
- Expected status.
- Actual status.
- Relevant service configuration.
- Test fixture or synthetic election identifier.
- Evidence artifact paths and digests.
- Known limitations.

Do not change a failed test to make a dashboard green without first deciding whether the implementation or the test is wrong. If an acceptance requirement changes, update the test name, rationale, and status documentation together.

## Synthetic demonstrations

### End-to-end synthetic election demonstration

The repository contains `demo_e2e_election.py`, an in-memory synthetic demonstration covering a development election lifecycle. It exercises synthetic roster entries, development credential issuance, encrypted ballot construction, anonymous casting, duplicate rejection, Merkle evidence, local witness acknowledgement, local chain anchoring, and verifier behavior.

Run it from the repository root:

```bash
python3 demo_e2e_election.py
```

Treat its output as a development demonstration. It does not prove that the deployed web application can complete the same workflow with an established engine or independent witness.

### Five attack demonstration

The repository also contains `demo_five_attacks.py`, which builds synthetic archives and applies controlled tampering such as insertion, deletion, modification, root or evidence inconsistency, and related verifier attacks.

```bash
python3 demo_five_attacks.py
```

The expected result is fail-closed behavior. Preserve the output and generated reports when using this demonstration as submission or review evidence.

### Demonstration hygiene

- Use synthetic names, identifiers, emails, keys, and ballots only.
- Do not paste real student data into fixtures.
- Do not reuse development keys.
- Do not label local witness output as independent.
- Do not turn demonstration archives into production evidence without a trust review.
- Delete or securely store generated artifacts according to the environment's retention policy.

## Production deployment guidance

Production deployment is a separate engineering and governance activity. The Compose overlay is a deployment starting point, not an approval.

### Required production prerequisites

Before opening any real election, obtain evidence for:

1. An established voting engine and independent verifier.
2. A reviewed key ceremony and trustee custody model.
3. Independent witness operation and out-of-band trust pins.
4. Managed identity, casting, and admin databases.
5. Controlled migrations and a schema compatibility gate.
6. Approved notification delivery for activation, recovery, and invitations.
7. HTTPS certificates and secure origin configuration.
8. Shared Redis with monitoring and persistence policy.
9. Secrets in KMS, HSM, or an approved secret manager.
10. Database backup, restore, and disaster recovery evidence.
11. Rate-limit, lockout, monitoring, and alerting runbooks.
12. Production port and network exposure review.
13. Independent security and protocol review.
14. Institutional election authority approval.
15. Accessibility and privacy review for the target institution.

### Deployment sequence

The exact deployment process belongs in the environment runbook, but a safe sequence is:

1. Review the release commit and `FEATURE_STATUS.md`.
2. Build images from a clean checkout.
3. Scan dependencies and images.
4. Create or retrieve secrets through the approved manager.
5. Apply database migrations in a controlled transaction.
6. Validate schema versions and service readiness.
7. Start internal services on private networks.
8. Start the gateway with HTTPS and strict origin policies.
9. Run health, readiness, authorization, backup, and evidence checks.
10. Run a synthetic election in the staging topology.
11. Run offline verification using trust pins delivered independently.
12. Obtain sign-off from the election authority, security reviewer, and auditor.
13. Only then schedule or open an election.

### Production observability

Monitor:

- Identity and casting availability separately.
- Session validation failures.
- MFA failures and throttling.
- Credential issuance cutoff and error rates.
- Ballot acceptance, duplicate rejection, and proof rejection counts.
- Outbox lag and checkpoint gaps.
- Witness acknowledgement lag and key changes.
- Chain submission and finality.
- Publication prerequisites and failed attestations.
- Database connection, replication, backup, and migration state.
- Notification delivery status.

Logs must redact session tokens, credentials, proof secrets, ballot selections, email addresses where not necessary, and stable identity-casting correlation identifiers.

## Operational runbooks

The repository contains runbook and architecture documents under `docs/`, `infrastructure/`, `witness/`, `chain/`, and service directories. At minimum, an operator should maintain runbooks for:

- Deployment and rollback.
- Database migration and rollback compatibility.
- Key generation, storage, rotation, revocation, and recovery.
- Witness key replacement and history reconciliation.
- Engine provider changes.
- Election pause, cancellation, dispute, and unavailability.
- Notification provider outage.
- Redis outage and limiter recovery.
- Database backup restoration.
- Chain outage and finality delay.
- Evidence archive export and offline verification.
- Privacy incident and accidental correlation logging.
- Credential or session compromise.

Every runbook should name the responsible role, required approvals, safe commands, expected logs, rollback boundary, and evidence to retain.

## Native clients

The repository contains source for several client targets. They are not all one unified application framework.

### Android

The Android client uses Kotlin and Jetpack Compose. Build-variant configuration controls booth and return endpoints. Credential or proof material must not be put in URL query strings. Android App Links, HTTPS, state binding, return-host validation, and emulator or device behavior require device-level testing.

### iOS

The iOS client uses SwiftUI and authentication session APIs. Callback origin, scheme, state, election binding, and artifact handling require macOS/Xcode validation. Proof material should use a secure back-channel instead of navigation URL parameters.

### Windows

The Windows client uses WinUI 3 and the Windows App SDK in the current repository. Documentation must not describe it as Avalonia unless the implementation is migrated.

### Linux

The repository contains an Avalonia Linux client and an auxiliary Tkinter demonstration. The supported release choice must be documented for a deployment; the two paths must not silently diverge in security or verification behavior.

### Shared native requirements

Each native release should provide:

- A reproducible build command.
- A pinned dependency set.
- A debug or signed artifact.
- A supported OS and toolchain version.
- Contract tests against the service schemas.
- Secure storage review.
- URL and logging privacy review.
- Accessibility smoke testing.
- Offline verifier behavior where claimed.

## Accessibility and UI guidance

The UI is intended to be restrained, clear, and evidence-oriented rather than marketing-heavy. Security-sensitive actions should prioritize clarity over decoration.

### Public users

Unauthenticated users should see:

- HimVote branding.
- Public elections.
- How it works.
- Published results.
- Public verification.
- Security limitations.
- Sign In.

They should not see a chooser for Student, Teacher, Admin, Super Admin, Officer, or Auditor portals.

### Authenticated users

The authenticated shell should show only assigned workspaces and actions. Each page should support loading, empty, error, retry, success, conflict, and forbidden states.

### Accessibility checks

At minimum, test:

- Keyboard-only navigation.
- Visible focus states.
- Correct label and input association.
- Focus movement into dialogs and back to the trigger.
- Escape behavior for dialogs and drawers.
- Screen-reader names for icon buttons.
- 200% zoom and narrow viewports.
- Color contrast and non-color status cues.
- Reduced-motion preferences.
- Long error messages and translated strings.
- Mobile touch targets.

### Data honesty checks

When a server request fails, the UI must not:

- Clear the error and show a fixture.
- Set a success banner before a 2xx response.
- Show a fake candidate or result.
- Display a static operational count as live.
- Display `VERIFIED` without identifying the verification source.

## Privacy and threat model

### Assets

- Student identity and enrollment information.
- Passwords, MFA seeds, sessions, and invitation tokens.
- Issuer private keys and credential protocol secrets.
- Election manifests and candidate data before publication.
- Encrypted ballot payloads and proof artifacts.
- Credential nullifiers and receipt handles.
- Witness private keys and trusted pins.
- Auditor private keys and publication attestations.
- Database backups and audit logs.

### Threats addressed by code-level controls

- Forged or unsigned credentials.
- Wrong-election or wrong-manifest credential replay.
- Duplicate credential casting.
- Unauthenticated administrative mutation.
- Forged actor headers in production.
- Cross-role navigation and API use.
- Out-of-scope department or election access.
- Public requests for unpublished election states.
- Fake browser-side candidate and election changes.
- Fake result or turnout fallbacks.
- Account activation and invitation token replay.
- Missing notification delivery being presented as success.
- Merkle evidence tampering, deletion, insertion, and rollback.
- Unsafe archive extraction and malformed evidence packages.

### Threats requiring deployment or external review

- A malicious or curious common operator controlling identity, casting, gateway, logs, and witness.
- Timing and metadata correlation between login and casting.
- Coercion and vote buying.
- Endpoint compromise or malicious browser extensions.
- Key exfiltration from hosts or cloud accounts.
- Database administrator access and backup compromise.
- Compromise of the notification provider.
- Compromise of the upstream election engine or its trustee ceremony.
- Cloud, network, TLS, container, and supply-chain failures.

### Privacy design rule

Never infer a privacy guarantee from a UI badge, a route name, a separate Docker network, or a locally successful hash calculation. Describe the exact property, trust assumptions, and residual risk.

## Incident and failure behavior

### Identity service unavailable

Private workspaces fail closed. The web application should not render private content using stale client state. Administrative operations must not be attempted without a valid identity context.

### Election service unavailable

Public pages show an unavailable state and retry action. Student voting pages disable casting until the authentic election manifest is retrieved and validated.

### Casting service unavailable

The client must not show a committed receipt. A network timeout after submission requires an idempotent or receipt-recovery workflow; it must not automatically resubmit a credential without server-side duplicate protection.

### Witness unavailable

Accepted ballots may remain `COMMITTED_PENDING_WITNESS` according to policy. The UI must not promote them to independently verified status. If final evidence cannot be witnessed, publication must remain blocked or become explicitly unverifiable.

### Publication attestation invalid

The request fails with a clear error, no success banner, and no published result. The server records the failed attempt without treating it as publication.

### Database failure

Production services fail readiness or stop safely. They must not silently use a fresh temporary database or create an empty production schema.

### Key compromise

Stop the affected workflow, revoke or rotate the key according to the approved ceremony, preserve evidence, compare external pins and histories, and obtain an independent incident review before resuming.

## Contribution workflow

Before changing code:

1. Read the relevant service README and architecture documents.
2. Identify the trust boundary affected by the change.
3. Decide whether the change affects identity, casting, election authority, evidence, or UI claims.
4. Add positive and negative tests.
5. Avoid fixture fallbacks in production routes.
6. Preserve separation between identity and casting data.
7. Update the API contract or schema documentation when payloads change.
8. Update `FEATURE_STATUS.md` if a finding changes state.
9. Run the smallest relevant test first, then the full appropriate suite.
10. Record actual commands and results; never write historical results as current evidence.

### Code review checklist

- Does the endpoint authenticate the caller?
- Does it check the exact operation role?
- Does it check institution, department, election, class, or object scope?
- Does it require MFA or step-up confirmation where necessary?
- Does it preserve separation of duties?
- Does it fail closed when a dependency is unavailable?
- Does it mutate durable state before showing success?
- Does it use an idempotency strategy for retries?
- Does it avoid sensitive data in URLs and logs?
- Does it preserve immutable manifest and evidence behavior?
- Does the UI status correspond to an actual server or verifier result?
- Does the test cover both allowed and denied cases?

### Git and release hygiene

- Do not commit `.env`, private keys, database dumps, local witness keys, or generated personal data.
- Do not force-push shared branches.
- Use descriptive commit messages.
- Keep generated build directories ignored.
- Push only after local verification and review.
- Attach current test logs or CI references to a release package.

## Documentation map

| Document | Purpose |
| --- | --- |
| `FEATURE_STATUS.md` | Current status of TR-001 through TR-060 and latest critical findings. |
| `RELEASE_READINESS.md` | Production gate and current release limitations. |
| `Q07_REQUIREMENTS_TRACEABILITY.md` | Question 07 requirement mapping. |
| `ROLE_PERMISSION_MATRIX.md` | Role and capability expectations. |
| `TRUST_AND_KEY_CUSTODY.md` | Trust roots, key custody, and separation assumptions. |
| `CIA_THREAT_MODEL.md` | Confidentiality, integrity, and availability threats. |
| `VERIFIER_EVIDENCE_SPEC.md` | Evidence archive and verifier expectations. |
| `TEST_EVIDENCE_AND_ATTACK_DEMOS.md` | Test evidence and attack demonstration structure. |
| `docs/ARCHITECTURE_DECISIONS.md` | Architecture decision records. |
| `docs/NETWORK_AND_DATAFLOW.md` | Network and data-flow details. |
| `docs/SECURITY_LIMITATIONS.md` | Security limitations and residual risk. |
| `docs/production_readiness_gate.md` | Production release gate checklist. |
| `docs/runbook_local.md` | Local development runbook. |
| `docs/witness_deployment_guide.md` | Witness deployment and custody guidance. |
| `services/election_engine/README.md` | Profile VEEM development adapter limitations. |
| `services/casting/README.md` | Casting service boundary and data model. |
| `services/identity_issuer/README.md` | Identity, roster, and credential service behavior. |
| `services/admin_api/README.md` | Election management and publication API behavior. |
| `verifier/README.md` | Offline verifier usage and evidence rules. |
| `tests/README.md` | Test groups and acceptance expectations. |

When documents conflict, prefer the most specific service documentation for implementation details and `FEATURE_STATUS.md` for current verification status. A historical audit report does not override a current test result or release blocker.

## License and responsible use

The root package is marked `UNLICENSED` in the project metadata. Confirm the licensing terms of every dependency and any future upstream election engine before distribution.

HimVote must be used responsibly:

- Use synthetic data for development and demonstrations.
- Obtain institutional approval before processing real student information.
- Complete a privacy and legal review before deployment.
- Do not run a real election on the custom development engine.
- Do not advertise local witness output as independent evidence.
- Do not promise anonymity, coercion resistance, or tamper independence beyond the documented deployment evidence.
- Preserve voter dignity, accessibility, and the ability to report election problems.

The correct statement for the current repository is:

> HimVote is an educational institutional election prototype with implemented service boundaries, scoped administration, fail-closed public workflows, cryptographic development tests, and offline verification tooling. It is not yet a production-ready or independently certified voting system.
