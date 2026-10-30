# HimVote Administrator and Election Lifecycle API

## Overview

The HimVote Administrator API service manages election governance, cryptographic manifest generation, independent roster approval, publication gates, and audit evidence packaging. It strictly enforces the election lifecycle defined in Section 4 and Section 6.2 of the HimVote system specification.

## Core Responsibilities

* Election definition and metadata management during draft state.
* Deterministic manifest computation and immutable manifest freezing.
* Independent roster approval verification ensuring strict separation between importer and approver.
* Complete lifecycle state machine management with immutable transition digests.
* Cryptographic publication gate verifying independent auditor attestations against pinned keys.
* Verifiable evidence bundle generation packaging canonical logs, witness signatures, and proofs.
* Append only administrative audit event logging.

## Election Lifecycle State Machine

The state machine transitions transactionally and deterministically across the following sequence:

1. DRAFT: Initial election setup where titles, contests, rules, and candidates can be modified.
2. REVIEW: Roster submitted and under verification by election authorities.
3. APPROVED: Independent Roster Approver has verified and signed the roster snapshot.
4. FROZEN: Immutable manifest created with deterministic SHA256 digest. All modifications rejected.
5. SCHEDULED: Election queued for upcoming issuance window.
6. ISSUING: Blind credential issuance window open for eligible students.
7. ISSUANCE_CLOSED: Issuance cutoff reached. Credential issuance strictly finishes before casting opens.
8. OPEN: Ballot casting origin active and accepting encrypted ballots.
9. CLOSING: Row lock acquired on casting cluster. final_tree_size recorded equal to next_leaf_index.
10. CLOSED_PENDING_WITNESS: Awaiting final witness acknowledgment.
11. FINAL_WITNESSED: Independent witness signed checkpoint at final tree size.
12. ANCHOR_FINALIZED: Smart contract transaction confirmed on chain at finality.
13. AUDIT_PASSED: Independent verifier completed audit verification.
14. AUDITOR_ATTESTED: Independent auditor signed attestation statement using external keypair.
15. PUBLISHED: Results and tally made public.

### Exception States

* PAUSED: Temporarily halts voting or issuance with audit reason recorded.
* CANCELLED: Terminates election with signed reason while permanently preserving all evidence.
* DISPUTED: Triggered if conflicting leaves, fork, or cryptographic divergence is discovered.
* AUDIT_FAILED: Verifier or tally validation fails during auditing.
* UNVERIFIABLE: Missing cryptographic proofs or broken witness chain prevents verification.

## Manifest Freezing Logic

Freezing creates an immutable signed manifest containing:
* Election identifier
* Contest and selection rules
* Candidate list sorted lexicographically by identifier
* Roster version and Merkle commitment
* Public eligible student count
* Key identifiers for issuer, log, witness, and pinned auditor fingerprint
* UTC timestamps for issuance cutoff, casting open, and casting close
* Turnout threshold for privacy policy
* Verifier version and anchor requirements

The manifest digest is computed by serializing the dictionary to canonical RFC 8785 JSON (sorted keys, strict UTF_8, no floats, no extra whitespace) and hashing with SHA256. Once frozen, candidates and election parameters cannot be updated or deleted.

## Independent Roster Approver Check

Eligibility is established by the signed roster snapshot:
* The importer submits roster records and derives the Merkle tree root commitment.
* An independent Roster Approver verifies the count and signs the commitment.
* The system enforces that the approver identifier differs from the submitter identifier.
* Self approval attempts are strictly blocked with HTTP 403 Forbidden.

## Publication Gate

The publication gate guards the release of election results:
* Requires election state to have reached ANCHOR_FINALIZED and FINAL_WITNESSED.
* Requires existence of an independent final witness checkpoint.
* Requires on chain anchor transaction hash.
* Cryptographically verifies the auditor Ed25519 signature over canonical attestation data.
* Enforces public key fingerprint matching against the configured pinned auditor key.
* Results endpoint rejects requests with HTTP 404 until the publication gate passes.

## Evidence Package Export

The evidence endpoint produces a verifiable ZIP archive containing:
* manifest.json: Canonical manifest definition.
* roster_commitment.json: Roster Merkle commitment and approver signature.
* leaves.jsonl: Canonical ballot evidence records in sequential leaf order.
* witness_signatures.json: Witness checkpoint acknowledgements and signatures.
* anchor_proof.json: On chain anchor transaction confirmation.
* tally_proofs.json: Homomorphic or verifiable tally proofs.
* auditor_attestation.json: Auditor attestation statement and signature.
* SHA256SUMS: Cryptographic SHA256 checksum for every file in the package.

## API Endpoints

* GET /v1/elections: List elections with optional state filter.
* POST /v1/elections: Create draft election.
* GET /v1/elections/{id}: Get election details.
* PUT /v1/elections/{id}: Update election parameters while in draft.
* DELETE /v1/elections/{id}: Delete election while in draft.
* GET /v1/elections/{id}/candidates: List registered candidates.
* POST /v1/elections/{id}/candidates: Add candidates to election prior to freeze.
* POST /v1/elections/{id}/roster: Submit student roster snapshot.
* POST /v1/elections/{id}/roster/approve: Independent Roster Approver signs roster.
* POST /v1/elections/{id}/freeze: Deterministically freeze election manifest.
* POST /v1/elections/{id}/open: Open election for ballot casting.
* POST /v1/elections/{id}/close: Close election and record final tree size.
* POST /v1/elections/{id}/publication_request: Verify auditor attestation and publish.
* GET /v1/elections/{id}/results: Retrieve tally (available only when published).
* GET /v1/elections/{id}/evidence: Download verifiable evidence ZIP package.
* POST /v1/elections/{id}/pause: Pause election with recorded reason.
* POST /v1/elections/{id}/cancel: Cancel election with signed justification.
* GET /v1/admin/audit_events: Query append only audit events log.
* GET /healthz: Service liveness probe.
* GET /ready: Service readiness probe.

## Verification and Testing

Execute the test suite using pytest:

```bash
pytest HimVote/services/admin_api/tests
```
