# Admin approvals integration status

The admin approvals page is intentionally fail closed.

## Verified backend contract

The identity service currently exposes:

- `POST /v1/approvals/{id}/decision` for an already identified approval request.
- Server-side authentication, MFA, role checks, scope checks, self-approval rejection, and decision persistence.

## Missing contract

There is no authorized `GET` endpoint for listing or reading pending approval requests. The web page therefore must not create a queue from fixtures, browser state, audit events, or an untrusted identifier. It shows an explicit unavailable state and renders no approve or reject controls.

Once the service adds a scoped pending-approval list endpoint, the client can map its response into `RoleApproval` records and enable decisions only after the returned request is revalidated by the server. Until then, `ADMIN_APPROVAL_LIST_UNAVAILABLE` is the expected result.

## Evidence

- `apps/web/src/lib/admin_approvals.ts` contains the fail-closed list contract and the real decision endpoint client.
- `apps/web/src/app/admin/approvals/page.tsx` contains no seeded applicants and no local approval mutation.
- `apps/web/tests/admin_approvals.test.ts` covers unavailable queue behavior, authorized decision request shape, missing configuration, malformed responses, and regression checks against seeded state.
