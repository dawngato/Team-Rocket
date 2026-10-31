# HimVote feature status register

This file records the current checkout after the implementation pass against
TR-001 through TR-060. It is source and test evidence, not a cryptographic
audit or approval for a real election.

Allowed values are `MISSING`, `PARTIAL`, `FIXED_UNTESTED`, `TESTED_PASS`,
`BLOCKED`, and `NOT_CHECKED`.

## Release conclusion

The application now fails closed for unsigned credentials, production admin
database failures, unauthenticated administrative mutations, unverified
publication, and unsupported engine providers. The browser can create the
current custom engine's encrypted ballot handoff and submit it through the
casting client. That custom engine is explicitly unverified and is not a
replacement for Helios, Belenios, ElectionGuard, or another independently
reviewed election engine. Independent witness custody and native platform
verification remain blocked.

## Complete register

| Finding | Status | Current evidence and remaining boundary |
|---|---|---|
| TR-001 | `TESTED_PASS` | Casting verifies issuer RSA signatures, election binding, manifest binding, and rejects malformed or forged proofs before persistence. Covered by `services/casting/tests/test_credential_verification.py`. |
| TR-002 | `BLOCKED` | The repository contains only the custom Profile VEEM development engine. Gate E1 is an internal regression suite, not integration with Helios, Belenios, ElectionGuard, or another independently reviewed engine. Production startup and publication now fail closed. |
| TR-003 | `PARTIAL` | The admin API now rejects non-administrative roles and requires an MFA-authenticated identity session for mutations. Election/tenant scope is not yet enforced across every resource; production authorization remains incomplete. |
| TR-004 | `TESTED_PASS` | Admin database construction no longer falls back to memory after connection failure. Test SQLite is explicit and production requires `ADMIN_DB_URL` plus a migration version. |
| TR-005 | `FIXED_UNTESTED` | Credential and encrypted ballot browser handoffs are now produced and validated in the student pages. A fresh real service session is not proven because the current engine is unverified. |
| TR-006 | `FIXED_UNTESTED` | Approval and role decision screens call service clients and read back server state. Production identity, MFA and two-approver execution need a deployed integration run. |
| TR-007 | `BLOCKED` | Local witness and local chain are explicitly simulated. Independent operator custody, pinned roots and external history are not established. |
| TR-008 | `FIXED_UNTESTED` | Development actor headers are loopback restricted and production compose disables them. Deployment exposure tests remain to be run. |
| TR-009 | `FIXED_UNTESTED` | Removed the public role-preview switcher from desktop and mobile navigation in this checkout. Protected route and role-revocation behavior still needs live authorization testing. |
| TR-010 | `PARTIAL` | Production middleware redirects requests with no session cookie, but it does not validate the cookie or role. Backend authorization remains incomplete for scoped reads and writes. |
| TR-011 | `PARTIAL` | Casting strips identity, forwarding and tracing headers at the gateway, but identity and casting still share a gateway operator and residual timing/log correlation risk. |
| TR-012 | `FIXED_UNTESTED` | Admin uses its own configured database URL and no longer depends on casting credentials. Least-privilege database grants require deployment verification. |
| TR-013 | `TESTED_PASS` | Shared JCS implementation and canonicalization vectors pass the focused crypto suites. Cross-language golden vectors are not all executed here. |
| TR-014 | `PARTIAL` | Browser inclusion checks are live and fail closed without evidence, but the returned root is not independently trusted until a pinned external witness checkpoint verifies it. |
| TR-015 | `FIXED_UNTESTED` | Android no longer puts credential material in navigation URLs and requires configured HTTPS booth and return endpoints. Device and proxy log review is not run here. |
| TR-016 | `FIXED_UNTESTED` | iOS rejects credential and ballot artifacts in callback URLs and requires a secure back-channel. The native back-channel is not deployed or smoke-tested. |
| TR-017 | `FIXED_UNTESTED` | Public election list and detail routes filter draft and internal states; scoped officer/admin read behavior needs production authorization testing. |
| TR-018 | `FIXED_UNTESTED` | Login fetches `/me` and routes to the server-granted workspace. Role-specific live login runs are not available in this checkout. |
| TR-019 | `FIXED_UNTESTED` | Browser bearer tokens are memory-only; authentication uses credentialed cookies and production secure cookies. Reload and expiry need a deployed HTTPS run. |
| TR-020 | `FIXED_UNTESTED` | Identity login has bounded in-process failure throttling and audit events. Distributed gateway rate limits and account recovery monitoring need deployment verification. |
| TR-021 | `FIXED_UNTESTED` | Cookie mutation requests enforce same-site origin checks and secure cookie settings. Cross-site browser attack testing is not complete. |
| TR-022 | `FIXED_UNTESTED` | Compose secrets are required and internal services are loopback or unexposed; only the gateway is public in production. A deployed port scan is not run here. |
| TR-023 | `BLOCKED` | Gate E1 verifies only the custom development engine. Publication now fails closed unless an established upstream engine and its independent tally verifier are integrated; no such adapter exists in this checkout. |
| TR-024 | `FIXED_UNTESTED` | Officer candidate actions call the scoped replace endpoint and reload authoritative state. Persistence, concurrency and freeze rejection need a live admin run. |
| TR-025 | `FIXED_UNTESTED` | Publication no longer shows success before a successful response and requires an external attestation payload. Valid attestation verification is not completed end to end. |
| TR-026 | `FIXED_UNTESTED` | Lifecycle loads live election state and handles errors around open/close mutations. Production scope and step-up behavior need execution against the service. |
| TR-027 | `FIXED_UNTESTED` | Roster correction submission and reload use durable identity-service endpoints. Registrar review and cross-user scope need a live workflow run. |
| TR-028 | `FIXED_UNTESTED` | Invitation UI calls backend issuance and reloads durable records. Production delivery intentionally fails closed without an independent notification adapter. |
| TR-029 | `FIXED_UNTESTED` | Teacher provisioning and directory reads use identity-service endpoints. Department scope and duplicate-account behavior need live identity tests. |
| TR-030 | `FIXED_UNTESTED` | Super-admin requests call approval APIs rather than claiming local audit success. Distinct approvers, MFA and immutable audit verification need a live run. |
| TR-031 | `PARTIAL` | Auditor witness and chain screens consume live evidence clients and show limited status without a pin. Independent witness and chain receipt verification remain unavailable. |
| TR-032 | `FIXED_UNTESTED` | Auditor signing imports an externally signed attestation and verifies it before submission. A real offline signer and key custody are not present. |
| TR-033 | `FIXED_UNTESTED` | Hardcoded operational metrics were removed from the evidence illustration. Live verified data is not used in the decorative orbit. |
| TR-034 | `FIXED_UNTESTED` | Student dashboard reads issuance status and local opaque receipts instead of fixed receipt claims. Full personalized eligibility and witnessed stages need service integration. |
| TR-035 | `FIXED_UNTESTED` | Officer election, roster and schedule pages load typed API data and do not substitute fixtures on failure. Live authorization and reload tests remain. |
| TR-036 | `TESTED_PASS` | Casting and verifier credential semantics use the same issuer key and election/manifest checks; forged proof tests reject before commit. A complete external verifier run is still separate. |
| TR-037 | `FIXED_UNTESTED` | Production admin routing uses cookie or bearer identity context rather than caller actor headers. A production gateway administration run is not available. |
| TR-038 | `PARTIAL` | Auditor verification provides evidence download and explicit limited status. It does not run the standalone verifier in the browser. |
| TR-039 | `NOT_CHECKED` | WinUI 3 and Avalonia are deliberately documented as separate clients. Platform builds were not run on this host. |
| TR-040 | `PARTIAL` | The Tkinter client remains an auxiliary path beside Avalonia. Documentation identifies the supported strategy, but retirement or full parity is not complete. |
| TR-041 | `FIXED_UNTESTED` | Android booth and return URLs are build-variant configuration, not example domains. Android App Links were not executed on a device. |
| TR-042 | `FIXED_UNTESTED` | Server-side nullifier uniqueness remains authoritative; Android local storage is only a UX receipt cache. Cross-device duplicate testing is blocked by the async test runtime here. |
| TR-043 | `PARTIAL` | Shared workspace shell and protected navigation exist, but role layouts and all responsive keyboard behavior are not fully reviewed. |
| TR-044 | `PARTIAL` | Shared visual tokens and design tests exist, but several pages still contain literal utility colors and need full visual regression cleanup. |
| TR-045 | `FIXED_UNTESTED` | Landing copy now identifies the educational prototype and removes misleading live metrics. User comprehension testing is not run. |
| TR-046 | `FIXED_UNTESTED` | Login labels, IDs, autocomplete and OTP input semantics are connected. Axe and screen-reader execution are not complete. |
| TR-047 | `FIXED_UNTESTED` | Placeholder controls were disabled or connected to clients in the reviewed admin areas. A complete click matrix is not run. |
| TR-048 | `TESTED_PASS` | The dedicated `tests/security/Q7-01_duplicate_cast_test.py` passes, including 100 concurrent submissions for one credential. The root suite (`tests --ignore=tests/load`) passes 58 tests. Load tests are excluded. |
| TR-049 | `TESTED_PASS` | All per-service test suites clean and verified on this host: admin_api (26/26), casting (35/35), identity_issuer (28/28), election_engine (22/22), and web (91/91). |
| TR-050 | `FIXED_UNTESTED` | Web typecheck, ESLint, production build and 91 Vitest tests pass. Full viewport screenshot and axe matrix is still not archived. |
| TR-051 | `NOT_CHECKED` | Android, iOS, Windows and Linux native toolchains were not executed on their supported hosts. |
| TR-052 | `PARTIAL` | The 3D orbit is explicitly decorative and reduced-motion aware. It is not evidence verification and does not show live authenticated proof values. |
| TR-053 | `FIXED_UNTESTED` | Redundant web `app/lib` fixture shims were removed from reviewed production paths and TypeScript passes. A full import graph audit remains. |
| TR-054 | `FIXED_UNTESTED` | `local_vetted` was removed from the development Compose provider and the custom engine reports `established_protocol=false`; production rejects unverified configuration. |
| TR-055 | `PARTIAL` | Client and witness statuses distinguish limited versus verified evidence in reviewed screens. A single shared status model across every native and verifier surface is not complete. |
| TR-056 | `PARTIAL` | Evidence views expose provenance and trust limitations in reviewed paths. A complete signer, root, tree size and timestamp card on every surface remains. |
| TR-057 | `NOT_CHECKED` | OpenAPI-generated clients and complete cross-service contract CI were not implemented or run. |
| TR-058 | `FIXED_UNTESTED` | Production admin startup requires an existing migration table and exact schema version; nonproduction `create_all` is limited to explicit development/test profiles. Migration deployment was not run. |
| TR-059 | `FIXED_UNTESTED` | Admin production startup now refuses missing or mismatched schema migration state. Fresh Compose migration execution is not run here. |
| TR-060 | `FIXED_UNTESTED` | This register records current commands and limitations. A signed CI manifest containing every supported platform artifact is not available. |

## Executed verification

The following commands completed in this checkout:

```text
python -m compileall -q services packages verifier tests
  PASS

python -m pytest -q services/casting/tests/test_credential_verification.py services/election_engine/tests/test_crypto.py packages/himvote_crypto/tests/test_jcs.py
  19 passed

python -m pytest -q packages/himvote_crypto/tests
  36 passed

python -m pytest -q services/admin_api/tests/test_manifest_freeze.py services/admin_api/tests/test_publication_gate.py services/admin_api/tests/test_roster_approval.py services/admin_api/tests/test_state_machine.py
  21 passed

python -m pytest -q tests --ignore=tests/load
  58 passed, 1 warning

npm test (Vitest 5.0.5)
  16 files passed, 91 tests passed

npm run typecheck
  PASS

npm run lint
  PASS

npm run build
  PASS

/usr/bin/node node_modules/next/dist/bin/next build
  PASS

python /home/Kali/.codex/skills/webapp-testing/scripts/with_server.py --timeout 90 --server "/usr/bin/node node_modules/next/dist/bin/next start" --port 3000 -- python -u tests/browser_smoke.py
  PASS
```

The Q7 duplicate-cast concurrency test was run directly and passed. The web dependency audit reports zero production vulnerabilities; eleven moderate findings remain in development-only tooling, with no remaining high or critical findings.


npm audit --omit=dev --audit-level=low
  0 production vulnerabilities
