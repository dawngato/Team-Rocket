# SecureVote specification conflicts

Audit date: 31 October 2026
Scope: `/home/Kali/Desktop/HPTU/Team-Rocket/apps/web`
Purpose: reconcile the supplied SecureVote specification with the checked-out web tree. This is a traceability record, not a security audit and not evidence that the application is suitable for a real election.

## Current-tree conclusion

This checkout is a Next.js web client named `@himvote/web`, not a complete SecureVote deployment. It contains UI routes, fixture data, browser-side state, a casting-origin client adapter, canonicalization/Merkle helpers, and unit tests. The current web tree does not contain a FastAPI service, PostgreSQL/Alembic migrations, a selected election engine, a standalone verifier, a witness service, Solidity/Foundry contracts, or Android/iOS/Avalonia source.

The source and tests therefore support a limited educational web prototype. They do not establish encrypted election secrecy, strict one-cast enforcement, independent tally verification, independent witness custody, blockchain finality, or native-platform delivery.

## Precedence used

1. The primary user instructions and Question 07 outcomes.
2. The actual checked-out source and executed tests.
3. The latest explicit platform decision: Next.js web, Kotlin Android, Swift iOS, and Avalonia Windows/Linux.
4. The supplied architecture, design, feature, work-plan, V11, and V12 documents.
5. Older or contradictory planning material.

The supplied reference documents are treated as requirements and design intent. They are not implementation evidence. The referenced `architecture.md`, `design.md`, `feature.md`, `work.md`, V11/V12 files, and source audit are not present in this web checkout, so claims from them were not treated as observed source behavior.

## Reconciled conflicts

| ID | Supplied conflict or decision | Actual current-tree evidence | Resolution and status |
|---|---|---|---|
| C-01 | The project is named SecureVote in the specification, while the web package and README use HimVote. | `package.json:2`; `README.md:1`. | Treat this as a repository/product naming difference. This report calls the checkout the SecureVote web client and does not infer completion from either name. |
| C-02 | The target web stack requires Next.js, React, TypeScript, Tailwind, and shadcn/ui. | `package.json:13-32` contains Next.js, React, TypeScript, Tailwind, Lucide, and Tailwind utilities. No shadcn dependency is listed. | Next.js/React/TypeScript/Tailwind are present. shadcn is not evidenced in this checkout and is not claimed. |
| C-03 | The specification requires FastAPI, PostgreSQL, Alembic, separate identity/casting origins, and server-authoritative state. | `src/lib/api_client.ts:24-47,55-115,127-181` uses browser `localStorage` and fixture fallbacks. The web tree has no backend, migration, or database source. | Client integration boundaries are present, but backend implementation is absent from this checkout. Status: BLOCKED for server-backed election behavior. |
| C-04 | The specification requires one established encrypted-election engine and forbids custom cryptography. | `src/lib/casting_client.ts:7-11,126-137` defines a typed `himvote.engine.ballot.v1` handoff and validates shape/base64 fields. No Helios, Belenios, ElectionGuard, engine binary, proof verifier, or engine version is present. | The adapter is only a handoff boundary. The engine gate is BLOCKED; no ballot secrecy or native tally-proof claim is made. |
| C-05 | Blind credential issuance must use a reviewed implementation with durable, idempotent issuance state. | `src/app/student/elections/[id]/credential/page.tsx:19-24` creates a `blind_sig_rsa4096_pss_` string with `Math.random()` after `setTimeout`; the page otherwise uses `INITIAL_ELECTIONS` at line 6 and 14. | Credential issuance is a UI simulation, not RFC 9474 or another reviewed issuer. Status: BLOCKED. |
| C-06 | Question 07 requires at most one accepted ballot per eligible student, including retries, concurrency, and close races. | `src/lib/casting_client.ts:276-390` is a browser HTTP client. The web tree has no authoritative cast database, unique nullifier constraint, transaction, close lock, or server implementation. | The client sends an idempotency key and has retry/error semantics, but strict acceptance is unproven. Status: BLOCKED pending a real casting service and concurrency tests. |
| C-07 | A separately controlled witness and final checkpoint are required; a local emulator is not independent. | `src/app/auditor/verify/page.tsx:24-60` returns fixture checks marked `LIMITED`. The page explicitly says independent custody is not established at lines 37-40. | The UI communicates the limitation. No independent witness is present in this web checkout. Status: LIMITED/SIMULATED. |
| C-08 | Blockchain may anchor authenticated checkpoints, but must not be treated as a voting engine or independent audit by itself. | The auditor verification preview at `src/app/auditor/verify/page.tsx:55-58` calls the local chain a demonstration. No Solidity or Foundry files are in the web tree. | No blockchain implementation or finality claim is made here. Status: NOT PRESENT in this checkout. |
| C-09 | A standalone verifier must consume untrusted evidence and out-of-band trust roots, and independently verify the native tally. | `src/app/auditor/verify/page.tsx:24-61` is a `setTimeout` fixture preview. `src/app/auditor/sign/page.tsx:22-27,40-42,117-124` explicitly disables signing. | Browser preview is not a standalone verifier. Status: BLOCKED. |
| C-10 | Publication requires final witnessed evidence, native tally verification, and an independent auditor attestation. | `src/lib/api_client.ts:99-104` changes local election state to `WITNESSED`; `src/app/auditor/sign/page.tsx:22-27` does not sign. | Local state changes are not a publication gate. Status: BLOCKED. |
| C-11 | The latest specification requires Android, iOS, and Avalonia Windows/Linux clients, with honest build evidence. | The checked-out web tree contains no native client directories or project files. Sibling directories are outside this web checkout and were not used as evidence for this report. | Native delivery is NOT PRESENT/NOT EXECUTED from this repository. |
| C-12 | Inclusion should be checkable without revealing the vote, but a Merkle proof alone does not prove eligibility, intent, secrecy, or tally correctness. | `src/lib/crypto/merkle.ts` evaluates a supplied inclusion path. `src/app/student/receipts/[handle]/inclusion/page.tsx` consumes only live receipt evidence and fails closed when leaf, root, tree size, or path data is absent. | Hash/inclusion helpers and receipt rendering are tested locally. The casting service now exposes proof inputs only after a witnessed acknowledgement, but no independent trust root is present in this web checkout. Status: LIMITED. |
| C-13 | The supplied documents call themselves plans, not evidence. | The current web tree initially had no `docs/` directory and no requested traceability files. | This audit creates only the requested documentation. The files do not promote planned features to implemented controls. |

## Evidence commands and final observations

| Command | Observation |
|---|---|
| `git status --short` | Worktree contains source edits from the implementation pass and generated Android Gradle artifacts; no push was run. |
| `npm test -- --run` | Exit 0; 12 test files and 76 tests passed. |
| `npm run typecheck` | Exit 0; Next route type generation and `tsc --noEmit` passed. |
| `NEXT_PRIVATE_BUILD_WORKER=1 npm run build` | Exit 0; clean production build compiled 48 application routes. |
| `with_server.py ... npm run start ... tests/browser_smoke.py` | Exit 0; production browser smoke passed, including CSP hydration and fail-closed casting/inclusion paths. |

No destructive command was run. No git push was run.
