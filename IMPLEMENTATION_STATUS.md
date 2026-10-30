# Implementation status

Date: 2026 10 30

Status values are `IMPLEMENTED`, `TESTED`, `BLOCKED`, `LIMITED`, `NOT_IMPLEMENTED`, and `NOT_BUILT`.

| Component | Status | Evidence |
| --- | --- | --- |
| Source inventory | TESTED | `tools/source_audit.py`, 2 unit tests |
| Canonical JSON and Merkle vectors | TESTED | `python3 packages/test_vectors/verify_vectors.py` |
| Identity authentication and Argon2id | LIMITED | Local identity tests pass. Production identity provider and hardware key custody are not proven. |
| MFA and session revocation | LIMITED | TOTP, logout, local recovery reset, replay rejection, and session revocation tests pass. WebAuthn and production recovery delivery remain absent. |
| Governance invitations and approvals | LIMITED | Local tests pass. Full endpoint scope enforcement needs an authenticated identity assertion. |
| Election lifecycle | TESTED | Admin lifecycle tests and acceptance fixtures pass locally. Production authorization is limited. |
| Atomic anonymous casting | TESTED | Casting tests cover locks, idempotence, nullifier uniqueness, and close races. |
| Merkle outbox and witness emulator | TESTED | Checkpoint and witness tests pass locally. Emulator is not an independent operator. |
| External witness operation | BLOCKED | Separate organization and out of band production keys are unavailable. |
| Solidity anchor | NOT_BUILT | Foundry is unavailable in this environment. |
| Standalone verifier | TESTED | Audit, attestation, parser safety, and inclusion tests pass locally. |
| External encrypted voting engine | BLOCKED | Profile VEEM is a development adapter. Required engine archives and official verifier are absent. |
| Next.js web | TESTED | Type check, 31 unit tests, production build, and browser smoke pass locally. |
| Android | TESTED | `./gradlew test` passes. Device instrumentation was not run. |
| iOS | NOT_BUILT | macOS and Xcode are unavailable. |
| Avalonia Linux | LIMITED | Source exists under `apps/desktop/HimVote.Linux`. Native build was not run because .NET is unavailable. |
| Windows desktop | LIMITED | Current client is WinUI 3, not the requested Avalonia Windows target. Native build was not run here. |
| Docker and local topology | LIMITED | Compose files exist. Full stack execution and production secret injection were not proven in this pass. |
| Production readiness | BLOCKED | External engine, independent operators, audits, DR, compliance, and institutional approval are absent. |

No row marked `LIMITED`, `BLOCKED`, `NOT_IMPLEMENTED`, or `NOT_BUILT` is presented as delivered production functionality.

