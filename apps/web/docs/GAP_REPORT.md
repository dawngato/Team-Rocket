# SecureVote evidence-backed gap report

Scope: current web checkout only. This report records observed gaps; it does not prescribe a new implementation plan.

## Critical gaps

1. **P0 : No validated election engine or independent verifier.** `src/lib/casting_client.ts` only validates and forwards a typed handoff. `src/app/auditor/verify/page.tsx:24-60` returns limited fixture checks, and `src/app/auditor/sign/page.tsx:22-27` disables signing. There is no engine version, native proof verifier, tally proof, or standalone CLI in this checkout.

2. **P0 : Election state and results are browser-local.** `src/lib/api_client.ts:24-47,55-115` reads fixture data and writes `localStorage`. This cannot provide authoritative lifecycle transitions, signed/frozen rosters, durable ballots, or a publication gate.

3. **P0 : Credential issuance is simulated.** `src/app/student/elections/[id]/credential/page.tsx:19-24` uses `setTimeout` and `Math.random()` to display a token. It is not a reviewed blind-signature implementation and does not prove eligibility or idempotent issuance.

4. **P0 : Strict one-vote enforcement is unproven.** The web tree has no casting database, unique spent-authorization constraint, transaction, close lock, or 100-way replay test. The client idempotency key is not a server-side acceptance invariant.

5. **P0 : External trust is absent.** The auditor UI explicitly labels witness custody and chain finality as limited at `src/app/auditor/verify/page.tsx:37-58`. No witness service, signed final history, Solidity contract, or independent chain proof exists in this web checkout.

6. **P1 : The browser client has no configured authoritative API in the default checkout.** `src/lib/election_client.ts` and `src/lib/casting_client.ts` fail closed when their origins are absent. This is correct for security, but a full demo requires running identity/admin/casting services and configuring the origins.

7. **P1 : Inclusion helpers are narrower than the requirement.** `src/lib/crypto/merkle.ts` evaluates a supplied path, and the helper tests pass. The receipt route consumes live proof fields only when supplied by a witnessed casting response. That does not authenticate the final checkpoint, eligibility, ballot intent, secrecy, or tally.

8. **P1 : Native platform delivery is not evidenced.** No Android, iOS, or Avalonia project/build evidence exists in this web checkout. No native build claim is made.

## Verified strengths

- `npm test -- --run` passed 12 files and 76 tests.
- `npm run typecheck` passed.
- `NEXT_PRIVATE_BUILD_WORKER=1 npm run build` passed a clean production build with 48 routes.
- The production browser smoke suite passed with CSP hydration, fail-closed casting, fail-closed inclusion, and responsive navigation checks.
- `src/lib/casting_client.ts` strips authorization, cookie, proxy, API-key, session, and CSRF headers before the casting request; the behavior is covered by `tests/casting_client.test.ts`.
- `src/lib/crypto/jcs.ts` and `src/lib/crypto/merkle.ts` are exercised against local/shared vectors by `tests/vectors.test.ts` and `tests/offline_audit_and_inclusion.test.ts`.
- The UI communicates important limits, including the receipt boundary at `src/app/student/receipts/[handle]/page.tsx:101-103,185-189` and the disabled auditor signing flow.

## Release finding

The evidence supports a limited educational web prototype, not a complete Q07 election system. The engine, backend, strict one-vote invariant, independent verifier, witness, tally proof, chain finality, and native-platform gates remain blocked or unverified.
