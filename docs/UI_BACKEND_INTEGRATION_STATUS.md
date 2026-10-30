# UI backend integration status

| Feature | Client source | Backend contract | Status |
|---|---|---|---|
| Session-aware shell | `identity_client.ts`, `AppFrame.tsx` | `GET /v1/auth/me`, cookie or bearer session | TESTED_PASS |
| Login | `auth/login/page.tsx`, `identity_client.ts` | `POST /v1/auth/login` with MFA continuation | IMPLEMENTED_UNTESTED |
| Public elections/results/evidence | `election_client.ts`, `api_client.ts` | Public election/evidence contracts | TESTED_PASS |
| Student credential/casting/receipt | `identity_client.ts`, `casting_client.ts` | Engine-compatible issuance, cast and opaque receipt endpoints | IMPLEMENTED_UNTESTED |
| Officer lifecycle | `api_client.ts`, officer pages | Admin election lifecycle endpoints | IMPLEMENTED_UNTESTED |
| Admin approval queue | `admin_approvals.ts`, `admin/approvals/page.tsx` | Decision endpoint exists; scoped pending-list endpoint does not | TESTED_PASS fail-closed |
| Auditor verification | `auditor/verify/page.tsx`, verifier clients | Released evidence and independently supplied trust material | LIMITED until independent pins/evidence exist |

The approval page deliberately renders no seeded applicants and no local success state. It reports `ADMIN_APPROVAL_LIST_UNAVAILABLE` until the identity service exposes a properly scoped list endpoint.
