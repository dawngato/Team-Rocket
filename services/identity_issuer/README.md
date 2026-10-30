# HimVote Identity Issuer Service

## Overview
The identity issuer service manages institutional authentication, role delegations, roster freeze approvals, and RFC 9474 RSA blind signature credential issuance for the HimVote platform.

## Architectural Boundaries
This service operates exclusively on the identity origin. It holds personal data and institutional rosters. It never handles ballots, nullifiers, or vote choices. Ballot casting operates on an entirely distinct origin and database cluster.

## Database Models (SQLAlchemy 2)
The identity cluster schema includes the following models:
* tenants: Institutional tenant accounts and root domain configurations
* campuses: Individual university campuses linked to a tenant
* departments: Academic departments within campuses
* staff_profiles: Profiles for academic and administrative staff
* student_profiles: Institutional student identities
* users: Core account records with Argon2id hashes and MFA flags
* role_definitions: Canonical role types
* permissions: Granular access permissions
* role_assignments: Scoped role grants with optional expiration
* invitations: Administrator invitations with short lived single use tokens
* approval_requests: Two person approval requests for role grants and administrative actions
* approval_decisions: Recorded decisions by authorized approvers
* enrollment_sources: External registry sources such as SIS and CSV feeds
* student_verifications: Department matching records confirming student eligibility
* sessions: Stateful sessions storing SHA256 hashed session identifiers
* mfa_credentials: TOTP and WebAuthn multi factor credential secrets
* recovery_requests: Single use account recovery tokens
* admin_audit_events: Immutable append only security audit trail
* election_roster_snapshots: Frozen roster snapshots with cryptographic digests
* roster_members: Composite primary key records binding student to election roster
* credential_issuance_records: Unique election student slots tracking issuance state
* issuance_events: Granular issuance audit logs
* system_settings: Persistent cluster state including one time bootstrap claim flag

## Cryptographic Operations
* Password Hashing: Argon2id with 64 MB memory cost, 3 iterations, and 4 degrees of parallelism.
* Multi Factor Authentication: RFC 6238 TOTP using pyotp with standard time step windows.
* Blind Credential Issuance: RFC 9474 RSA Blind Signatures. The issuer signs blinded tokens without observing the underlying voter secret or serial number.

## Authentication and Account Lifecycle
* One time bootstrap claim: Endpoint POST /v1/bootstrap/claim enables the deployer to initialize the Super Administrator. Once executed, the bootstrap flag is permanently disabled in the database, and subsequent invocations return HTTP 403 Forbidden.
* Multi factor authentication: Privileged accounts require TOTP enrollment. Login returns mfa_required until confirmed by valid verification code.
* Role delegation: Role grant requests require independent approval. The creator of an approval request can never approve their own request.

## Roster Snapshotting and Independent Approval
1. Students register or import from external SIS feeds into PENDING_VERIFICATION state.
2. Academic staff verify records against approved enrollment sources.
3. Election administrators create a draft roster snapshot calculating a deterministic SHA256 digest across sorted eligible student identifiers.
4. An independent Roster Approver who is a different person from the snapshot creator signs and approves the snapshot.
5. The snapshot is frozen, locking eligibility permanently prior to election start.

## Blind Credential Issuance Algorithm
When a voter invokes POST /v1/credentials/issue:
1. The server confirms active authentication and membership in the frozen roster snapshot.
2. The server verifies that the current timestamp falls within the open issuance window.
3. In an atomic transaction, the slot is reserved with state RESERVED. The unique constraint prevents double issuance.
4. The state advances to SIGNING.
5. The server computes the blind signature per RFC 9474 using RSASP1 private key operations.
6. The signature response is stored, the state updates to SIGNED, then DELIVERED, and the base64url encoded blind signature is returned.
7. Replays with identical blinded requests return the stored signature idempotently. Replays with conflicting requests are rejected with HTTP 409 Conflict.

## Append Only Audit Logging
All administrative operations, logins, approvals, and issuance milestones record append only audit events in admin_audit_events. The database model explicitly forbids UPDATE and DELETE operations at both the database trigger level and the application ORM event layer.

## Verification and Testing
Execute the test suite with pytest:
pytest services/identity_issuer/tests
