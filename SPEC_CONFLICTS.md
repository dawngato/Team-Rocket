# SecureVote specification conflicts

Audit date: 30 October 2026
Repository: `/home/Kali/Desktop/HPTU/Team-Rocket`
Requested working directory: `/home/Kali/Desktop/HPTU/Team-Rocket/apps/desktop`

This file records conflicts between the supplied SecureVote requirements and the checked-out repository. It is an audit of the current source, not evidence that the requirements are implemented.

## Resolution order

The effective order used for this audit is:

1. The primary instructions in the user request.
2. The selected voting engine's actual protocol and verifier behavior.
3. The latest explicit platform decisions: Next.js web, FastAPI backend, Kotlin Android, Swift iOS, and Avalonia desktop for Windows and Linux.
4. Existing source, tests, and executed evidence.
5. Older design and planning documents only where they do not conflict with the items above.

The repository does not contain the referenced `architecture.md`, `design.md`, `feature.md`, or `work.md` files, nor the three referenced upstream archives. The supplied prompt text is therefore treated as requirements input, not as checked-out source evidence.

## Conflicts and decisions

| ID | Conflict observed | Resolution for this repository | Current consequence |
|---|---|---|---|
| C-01 | The requirements use the product name SecureVote, while the checked-out implementation is named HimVote. | Treat HimVote as the current repository implementation of the SecureVote specification. Do not infer feature completion from the name. | Documentation uses both names where needed. |
| C-02 | The target requires a real Next.js client and FastAPI services. The web client currently imports `apps/web/src/lib/mock_data.ts` and implements core reads/writes in browser `localStorage` through `apps/web/src/lib/api_client.ts`. | The target stack remains authoritative; the current web implementation is a mock/demo adapter until real API integration is shown. | Web election management, casting, receipts, and publication are not end-to-end proven. |
| C-03 | The target requires one established, externally vetted encrypted-election engine. The repository implements “Profile VEEM” in `services/election_engine`; its README explicitly says it is a development adapter and not Helios, Belenios, or ElectionGuard. | Keep Profile VEEM classified as a development adapter. Do not claim the engine gate is closed. | Full ballot secrecy, protocol-native tally proof, and external-engine compatibility remain blocked. |
| C-04 | The requirements mention Helios, Belenios, or another established engine, but no checked-in engine archive or pinned external verifier bundle is available. | Choose an engine only after a real external integration and verifier run. Until then, mark the external engine gate blocked. | `tools/source_audit.py` reports the three referenced archives as absent. |
| C-05 | Earlier desktop requirements mention WinUI 3 for Windows; the latest requirement supersedes that with Avalonia for Windows and Linux. The checkout contains a WinUI project at `apps/desktop/HimVote.Windows` and an Avalonia project at `apps/desktop/HimVote.Linux`. | The latest Avalonia target is authoritative for the product. The WinUI project is an existing legacy/parallel implementation and cannot be presented as the Avalonia deliverable. | Shared .NET tests/build pass through `/home/Kali/.dotnet/dotnet`; native Windows WinUI/MSIX execution was not run on Linux. |
| C-06 | The requirements call for a C# Avalonia thick client on Windows and Linux. The checkout also contains a separate Python/Tkinter client under `apps/linux`. | Treat `apps/linux` as a legacy or auxiliary offline tool, not as proof of the required Avalonia client. | Python Linux tests pass, but they do not establish the C# desktop requirement. |
| C-07 | The requirements call for an independently controlled witness and, optionally, an independent chain. The checkout contains witness code, witness storage, and a local Anvil-oriented chain under the same repository/operator boundary. | Label the local witness and local chain as simulated development infrastructure. Independence is not established by process or container separation. | Witness and blockchain integrity checks are local demonstrations with a trust-model limitation. |
| C-08 | The requirements distinguish accepted, witnessed, final-included, and tallied states. The desktop verifier tests explicitly enable `AllowDevelopmentProfile = true`, while the web receipt path can return local simulated statuses. | Keep the state distinctions in the specification, but require production-profile evidence before using “verified” or “tallied” language. | Desktop and web status displays do not currently prove an external final witness or engine tally. |
| C-09 | The target requires server-authoritative lifecycle and ballot state. The web client mutates election, receipt, and trusted-pin state in `localStorage`. | Server and casting APIs remain authoritative; local browser state is demo data only. | UI actions are not proof of backend authorization, persistence, or concurrency behavior. |
| C-10 | The target requires an encrypted ballot created by the supported engine. The web cast page sends placeholder base64 values and does not send the selected candidate as an engine-generated ballot. | Replace this flow with the supported engine booth/adapter before claiming a real cast. | The current web cast flow is not a cryptographic ballot integration. |
| C-11 | The target requires an independently runnable verifier with trusted keys and final checkpoint inputs obtained outside the export. The repository has `verifier/verify.py`, but strict verification rejects an archive when those independent inputs are absent. | Keep the CLI as the verifier implementation under test, but classify a complete external verification as blocked until a real engine archive and independent trust bundle are supplied. | `python3 -m verifier verify ...` returned exit 3 for missing independent inputs. |
| C-12 | The target treats blockchain anchoring as checkpoint evidence only; earlier project language risks presenting it as a voting or privacy mechanism. | The chain may store checkpoint commitments only. It must not be used as evidence of eligibility, secrecy, or tally correctness by itself. | Local contract source exists, but `forge` is unavailable and no chain test was executed here. |
| C-13 | Existing status documents report web, Android, Foundry, and desktop successes that do not match this audit's current commands and environment. | Current command output supersedes stale narrative counts. Each unavailable or failing command is recorded explicitly below. | Previous “verified operational” statements are not accepted as current evidence. |
| C-14 | The primary instructions require `SPEC_CONFLICTS.md`, traceability, and implementation status grounded in the actual repository. The repository's source audit marks several referenced documents and archives as absent. | Record missing inputs as a repository boundary, not as implemented requirements. | Engine and source-audit conclusions are limited by unavailable reference inputs. |
| C-15 | The OpenAPI file contains semantically overlapping route spellings, including underscore and hyphen variants for role grant requests and audit events. | Select one canonical route spelling during contract cleanup and add a breaking-change check. Do not treat both spellings as independent features. | Client generation and contract compatibility remain a cleanup gap. |

## Authoritative current interpretation

- The Q7 priority is a functional web election with real backend integration and an independently executable verifier.
- The current repository has meaningful Python services, evidence, verifier, chain, and client source, but source presence and local unit tests do not establish the full Q7 security properties.
- Profile VEEM is a development adapter. The external engine integration gate is **BLOCKED**.
- The desktop source is not a single resolved target: it includes WinUI Windows and Avalonia Linux projects. Shared tests/builds execute through `/home/Kali/.dotnet/dotnet`, but the required single Avalonia Windows/Linux target and native Windows packaging are still **BLOCKED/NOT EXECUTED**.
- The local witness and local Anvil chain are **SIMULATED**, not organizationally independent.
- No statement in this file authorizes real elections or changes the educational synthetic-data-only scope.

## Evidence commands used for conflict resolution

| Command | Result |
|---|---|
| `python3 tools/source_audit.py --root . --output /tmp/himvote_source_audit_agent1.json` | Exit 0; audit reports `input_status: INCOMPLETE`; referenced specification files and upstream archives are absent. |
| `python3 services/election_engine/gate_e1.py` | Exit 0; Profile VEEM development gate passes, but `tests/security/reports/gate_e1_veem.json` limits the result to a stand-in adapter. |
| `python3 tools/run_all_tests.py` | Exit 0; 274 passed, 1 skipped. This is local repository coverage, not proof of the external engine gate. |
| `/home/Kali/.dotnet/dotnet test HimVote.Windows.sln --no-restore` from `apps/desktop` | Exit 0; 101 passed, 0 failed, 0 skipped. |
| `/home/Kali/.dotnet/dotnet build HimVote.Windows.sln --no-restore` from `apps/desktop` | Exit 0; 0 warnings, 0 errors. Native Windows/MSIX execution remains untested. |
| `npm test` from `apps/web` | Exit 0; 53 passed. |
| `npm run typecheck` from `apps/web` | Exit 0. |
| `npm run build` from `apps/web` | Exit 0; Next.js production build completed. |
| `npm test && npm run typecheck && npm run build` from `apps/desktop/apps/web` | Exit 0; 3 Vitest tests passed and the demo Next.js build completed. |
| `forge --version` | Command not found; Foundry tests were not executed. |
