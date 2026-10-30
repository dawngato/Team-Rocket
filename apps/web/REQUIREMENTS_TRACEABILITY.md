# SecureVote requirements traceability

Audit scope: `/home/Kali/Desktop/HPTU/Team-Rocket/apps/web`
Audit date: 31 October 2026
Evidence rule: a source path or passing frontend test proves only the behavior exercised by that source/test. It does not prove a missing backend, engine, independent operator, or production security property.

## Status vocabulary

- `TESTED`: the cited local behavior was executed successfully.
- `PARTIAL`: some application behavior exists, but the Question 07 outcome is incomplete.
- `LIMITED`: a local demonstration exists with explicit security or trust limitations.
- `BLOCKED`: the required component or evidence is absent from this checkout.
- `NOT_CHECKED`: no executable evidence was run for the requirement.
- `NOT_PRESENT`: the required source/toolchain is absent from this checkout.

## Question 07 traceability

| ID | Requirement | Current implementation paths | Tests/evidence | Status and gap |
|---|---|---|---|---|
| Q07-01 | Authorized election administration: create elections, candidates, roster, open/close, and publish only after verification. | `src/lib/api_client.ts:44-115` implements local election/results/evidence state. Role routes are under `src/app/admin/`, `src/app/officer/`, and `src/app/super-admin/`. | `tests/api_client.test.ts`; `tests/institutional_roles.test.ts`; `npm test -- --reporter=dot`. | `PARTIAL`. Role-shaped UI and local transitions exist, but no authenticated server authorization, database transaction, roster signature, or real publication gate exists. |
| Q07-02 | At most one accepted ballot per eligible student/election, including replay, concurrency, and close races. | `src/lib/casting_client.ts:93-137,276-390`; student cast flow under `src/app/student/elections/[id]/cast/`. | `tests/casting_client.test.ts` tests handoff validation, header stripping, response validation, and error mapping. | `BLOCKED`. The client can send a protocol-shaped request, but there is no authoritative casting service, nullifier constraint, issuance ledger, race test, or close transaction in this checkout. |
| Q07-03 | No direct student-to-choice record and clear privacy boundaries. | `src/lib/casting_client.ts:219-239` strips identity/session headers and `:106-115` builds an allowlisted payload. `src/app/student/receipts/[handle]/page.tsx:101-103,185-189` states receipt limits. | `tests/casting_client.test.ts`; receipt-flow tests in `tests/student_receipt_flow.test.ts`; local source inspection. | `LIMITED`. The browser boundary is tested, but localStorage fixtures, browser/session metadata, and the absent server/log/database boundary prevent a full separation claim. |
| Q07-04 | Tamper detection independent of the administrator database. | `src/lib/crypto/jcs.ts:42-112`; `src/lib/crypto/merkle.ts:36-165`; `src/app/auditor/evidence/` provides a browser evidence preview. | `tests/offline_audit_and_inclusion.test.ts`; `tests/vectors.test.ts`; shared fixtures under `../../../packages/test_vectors/`. | `LIMITED`. Canonicalization, digest, tree, and local mutation checks are tested. No external witness history, signed final checkpoint, consistency proof, or independent trust distribution is present. |
| Q07-05 | Standalone independent integrity and tally verification. | `src/app/auditor/verify/page.tsx:24-60,114-151` is a fixture preview. `src/app/auditor/sign/page.tsx:22-27,40-42,117-124` disables signing. | No standalone verifier command exists in the current web tree. Auditor preview checks are explicitly `LIMITED`. | `BLOCKED`. There is no native engine verifier, offline CLI/package, independently pinned trust bundle, or cryptographic tally proof. |
| Q07-06 | Students can check inclusion without revealing their selection. | `src/lib/crypto/merkle.ts` contains inclusion evaluation. `src/app/student/receipts/[handle]/page.tsx` links only when complete proof inputs exist. `src/app/student/receipts/[handle]/inclusion/page.tsx` consumes live casting-origin evidence and fails closed when proof data is incomplete. | `tests/offline_audit_and_inclusion.test.ts`; `tests/student_receipt_flow.test.ts`; `tests/browser_smoke.py`. | `LIMITED`. The helper, receipt messaging, and browser state are tested; independent checkpoint trust and native election-engine proof remain absent. |
| Q07-07 | Demonstrate duplicate, unauthorized insertion, deletion, modification, and tally tampering. | Hash helpers and client validators exist under `src/lib/crypto/` and `src/lib/casting_client.ts`. | `tests/offline_audit_and_inclusion.test.ts` covers local canonical/hash mutation cases. No end-to-end five-attack suite was run. | `BLOCKED/NOT_CHECKED`. The mandatory attacks are not proven against a real server, external checkpoint, native proof verifier, or published tally. |
| Q07-08 | Synthetic data, threat model, privacy limitations, and truthful release status. | `README.md`; `src/app/layout.tsx:30`; `src/app/page.tsx`; `src/app/how-it-works/page.tsx`; `src/app/security-limits/page.tsx`; `src/app/results/page.tsx`. | Source inspection plus this report and `docs/GAP_REPORT.md`. | `PARTIAL`. The UI contains unusually explicit development limitations, but the repository still lacks the complete threat/evidence package required by the supplied specification. |

## Supporting component matrix

| Component | Source evidence | Status |
|---|---|---|
| Web UI and route shell | `src/app/`, `src/app/components/`, `src/middleware.ts`, `package.json:5-32` | `TESTED`; unit tests, typecheck, clean production build, and browser smoke pass. |
| Local election/admin data layer | `src/lib/api_client.ts:24-181`, `src/lib/mock_data.ts` | `PARTIAL`; browser localStorage and fixture data, not a server. |
| Casting-origin client boundary | `src/lib/casting_client.ts:93-115,219-239,276-390` | `TESTED` as a client adapter; server semantics remain unproven. |
| Canonicalization/Merkle helpers | `src/lib/crypto/jcs.ts`, `src/lib/crypto/merkle.ts` | `TESTED` against local/shared vectors; not a complete evidence protocol. |
| Engine and native verifier | No engine or verifier source in this web tree | `BLOCKED`. |
| Identity/eligibility issuer | Credential UI only at `src/app/student/elections/[id]/credential/page.tsx:19-24` | `BLOCKED`. |
| Witness and auditor custody | `src/app/auditor/verify/page.tsx:37-58`; `src/app/auditor/sign/page.tsx:22-27` | `LIMITED/SIMULATED`; no independent service or signer in this web checkout. |
| Blockchain anchor | No Solidity/Foundry source in this web tree; auditor UI calls the local chain a demonstration at `src/app/auditor/verify/page.tsx:55-58` | `NOT_PRESENT`. |
| Android/iOS/Avalonia clients | No native source in this web tree | `NOT_PRESENT/NOT_EXECUTED`. |

## Executed test evidence

| Command | Result | What it establishes |
|---|---|---|
| `npm test -- --run` | Exit 0; 12 files, 76 tests passed | Local UI/client/helper behavior in the Vitest suite. |
| `npm run typecheck` | Exit 0 | TypeScript and generated Next route types compile for the current snapshot. |
| `NEXT_PRIVATE_BUILD_WORKER=1 npm run build` | Exit 0 | Clean production Next build compiled 48 application routes. |
| `with_server.py ... npm run start ... tests/browser_smoke.py` | Exit 0 | Browser smoke verified hydration under CSP, public explanation, fail-closed casting, fail-closed inclusion, and responsive navigation. |
| Backend, engine, verifier, Foundry, Android, iOS, Avalonia commands | Not available or not run in this web checkout | No result claimed. |

## Property boundary

Passing the local tests does establish deterministic helper and client-boundary behavior for their fixtures. It does not establish voter eligibility, secrecy, strict one-vote acceptance, cast-as-intended, coercion resistance, independent witnessing, tally correctness, chain finality, or real-election readiness.
