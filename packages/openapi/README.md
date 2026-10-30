# HimVote OpenAPI Specification Package

## Overview
HimVote institutional election platform OpenAPI 3.1 specification contract located at packages/openapi/himvote.openapi.yaml.
This specification acts as the definitive contract for all HimVote services and client SDK generators.

## Origins and Network Architecture
The platform enforces strict physical separation of trust domains across independent network origins:
* Identity Origin: Handles authentication, user management, and blind credential issuance. Cookies and authorization headers are processed here.
* Casting Origin: Completely anonymous ballot submission. All cookies, identity tokens, and trace identifiers are stripped at the edge proxy prior to reaching the service.
* Witness Origin: Independent witness service run by an external organization. Collects Merkle tree log checkpoints and provides signed consistency assertions.
* Admin Origin: Administrative workflows, election configuration, roster approvals, and publication gates.
* Verifier Origin: Standalone verification endpoints and offline auditor verification tooling.

## Services and Endpoints Summary
* Authentication and Identity Issuer:
  * POST /v1/auth/login: User authentication returning session tokens
  * POST /v1/auth/logout: Session termination
  * POST /v1/auth/recover: Secure account recovery
  * POST /v1/bootstrap/claim: Single use super administrator bootstrap endpoint
  * POST /v1/admin/invitations: Scoped role invitations
  * POST /v1/admin/role_grant_requests: Privilege elevation workflow
  * POST /v1/approvals/{id}/decision: Two person rule approval decision
  * GET /v1/admin/audit_events: Append only administrative audit event log
  * POST /v1/students/register: Student registration
  * POST /v1/students/import: Bulk student import from registrar systems
  * POST /v1/students/{id}/verify: Identity verification by authorized staff
  * GET /v1/roster/me: Voter eligibility status lookup
  * POST /v1/credentials/issue: Blind signature issuance per RFC 9474
  * GET /v1/credentials/issuance_status: Issuance status polling

* Admin API:
  * GET /v1/admin/elections: List elections by scope
  * POST /v1/admin/elections: Create election draft
  * GET /v1/admin/elections/{election_id}: Fetch election details
  * PUT /v1/admin/elections/{election_id}: Update election draft parameters
  * GET /v1/admin/elections/{election_id}/candidates: Contest candidate list
  * POST /v1/admin/elections/{election_id}/candidates: Add contest candidate
  * PUT /v1/admin/elections/{election_id}/candidates/{candidate_id}: Modify candidate
  * DELETE /v1/admin/elections/{election_id}/candidates/{candidate_id}: Remove candidate
  * POST /v1/admin/elections/{election_id}/roster/submit: Submit roster snapshot
  * POST /v1/admin/elections/{election_id}/roster/approve: Independent roster approval
  * POST /v1/admin/elections/{election_id}/freeze: Freeze election manifest
  * POST /v1/admin/elections/{election_id}/open: Transition election to open status
  * POST /v1/admin/elections/{election_id}/close: Close casting and record final tree size
  * POST /v1/admin/elections/{election_id}/request_publication: Request publication
  * POST /v1/admin/elections/{election_id}/publish: Final publication gate
  * GET /v1/admin/elections/{election_id}/evidence: Download verifiable evidence package
  * GET /v1/elections/{election_id}/manifest: Public frozen manifest
  * GET /v1/elections/{election_id}/results: Public election results and tally proofs

* Casting Service:
  * POST /v1/cast/{election_id}/ballots: Anonymous ballot casting with proof and nullifier
  * GET /v1/cast/{election_id}/receipt/{handle}: Receipt confirmation polling
  * GET /v1/cast/{election_id}/status: Health and backlog monitoring

* Witness Service:
  * POST /v1/witness/checkpoints: Cosign incremental Merkle log checkpoint
  * POST /v1/witness/elections/{election_id}/final: Cosign final election checkpoint
  * GET /v1/witness/elections/{election_id}/final: Fetch independent final checkpoint
  * GET /v1/witness/elections/{election_id}/checkpoints: Checkpoint history log

* Verifier Service:
  * POST /v1/verifier/audit_evidence: Complete cryptographic audit validation
  * POST /v1/verifier/verify_attestation: Verification report signature check
  * GET /v1/verifier/properties: List verifiable election properties

## Security Schemes and Headers
* bearerAuth: Bearer JWT token header
* cookieAuth: Secure HttpOnly session cookie
* witnessAuth: Mutual TLS or token authentication for witness log submission
* auditorSignature: Detached cryptographic signature header
* Idempotency_Key: Client generated UUID header ensuring safe retry semantics

## Code Generation
This specification is the single contract source for client SDK generation across TypeScript, Kotlin, Swift, and C Sharp.
