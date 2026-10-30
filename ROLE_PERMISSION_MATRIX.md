# Role and visibility matrix

The server must deny by default. Client navigation is derived from server
claims and cannot grant access. The current service slices use explicit role
dependencies and scoped service tests; full session-backed scope enforcement is
still a release task.

| Capability | Public | Student | Teacher | Officer | Admin | Super Admin | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|
| Public election metadata | Y | Y | Y | Y | Y | Y | Y |
| Own eligibility | N | SELF | N | N | N | N | N |
| Own opaque receipt lookup | N | HOLDER TOKEN | N | N | N | N | Y |
| Assigned class review | N | N | SCOPE | N | SCOPE | SCOPE | N |
| Draft candidate editing | N | N | N | ELECTION | DELEGATED | N | N |
| Freeze/open/close | N | N | N | ELECTION | DELEGATED | N | N |
| Issue eligibility credential | N | SELF VIA ISSUER | N | N | N | N | N |
| Anonymous cast | N | OPAQUE PROOF ONLY | N | N | N | N | N |
| View accepted ballot ciphertext | N | N | N | N | N | N | ARCHIVE ONLY |
| Decrypt voter choice | N | N | N | N | N | N | N |
| Published verification | RELEASED | RELEASED | RELEASED | RELEASED | RELEASED | RELEASED | Y |
| Sign independent attestation | N | N | N | N | N | N | AUDITOR KEY |
| Approve own elevation | N | N | N | N | N | N | N |

## Enforced request rules

1. Authentication and authorization are separate checks; an account being active
   does not make it eligible for a particular election.
2. Scope is checked against tenant, department, election, object ownership, and
   lifecycle state for each sensitive request.
3. Anonymous casting rejects identity `Authorization`, `Cookie`, student, user,
   session, and identity-origin headers. Receipt lookup accepts only a holder
   supplied opaque handle and returns choice-free status/proof fields.
4. Frozen manifests, accepted ballot records, and witnessed evidence are not
   mutable through the UI or normal service API.
5. `401` means no authenticated session; `403` means a known principal lacks the
   capability; `404` may hide existence; `409` means state/conflict; `422` means
   schema/input failure; `503` means a required verifier/engine dependency is
   unavailable.

## Known gap

The small `apps/desktop/services/securevote_api` integrity-only slice retains a
student-to-credential table in its local database. It is explicitly documented
as privacy-limited and must not be presented as the production identity/casting
split. The main `services/casting` model contains no student ID, but independent
database credentials and operators still require deployment evidence.
