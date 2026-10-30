# Unimplemented and blocked features

This is the current source-grounded gap register for the synthetic educational
prototype. A feature is not marked complete because a screen or schema exists;
it must have an executable implementation and an observed test result.

## Blocked security gates

| Area | Current state | Why it remains blocked |
| --- | --- | --- |
| Established election engine | `BLOCKED` | `services/election_engine` is a development adapter. No Helios, Belenios, ElectionGuard, or other maintained engine has been integrated and independently verified. |
| Native encrypted tally proof | `NOT_SUPPORTED` | The standalone verifier can validate the repository's evidence format and integrity checks, but it cannot claim a protocol-native encrypted tally without the engine gate. |
| Strict one accepted cast under an external engine | `NOT_VERIFIED` | Local database and protocol tests cover replay and concurrency behavior, but compatibility with a maintained engine's credential and revote semantics is not proven. |
| Independent organization | `LIMITED` | The local witness, relayer, auditor configuration, and Anvil chain remain development infrastructure under one operator. |
| Production key custody | `LIMITED` | KMS/HSM custody, independent trust distribution, rotation ceremonies, and production mTLS are documented but not exercised in this checkout. |

## Partial product workflows

| Area | Source paths | Current state |
| --- | --- | --- |
| Admin teacher directory | `apps/web/src/app/admin/teachers`, `apps/web/src/lib/api_client.ts` | `PARTIAL`; the identity API has no teacher-directory contract, so the UI reports unavailable data instead of using fixtures. |
| Scoped teacher and super-admin administration | `apps/web/src/app/teacher`, `apps/web/src/app/super-admin` | `PARTIAL`; several pages remain presentation shells until corresponding scoped API contracts are implemented. |
| Auditor verification UI | `apps/web/src/app/auditor/verify`, `apps/web/src/app/auditor/evidence` | `PARTIAL`; the UI retrieves authoritative metadata and hands off to the offline CLI. It intentionally does not run a browser-side substitute verifier. |
| Native Android credential issuance | `apps/android/.../CredentialRepository.kt` | `BLOCKED`; it fails closed until the supported engine provides the blinded request and unblinding flow. |
| Android biometric login/attestation | `apps/android/app/src/main/java/com/himvote/ui/components/BiometricAuthFeedback.kt` | `NOT_CONNECTED`; synthetic success animation was removed from production routes. A real platform biometric/passkey protocol is not wired to identity authentication. |
| Native desktop runtime packaging | `apps/desktop` | `PARTIAL`; .NET tests pass, but signed Windows/Linux installers and runtime packaging are not produced here. |
| iOS build and simulator review | `apps/ios` | `NOT_EXECUTED`; this Linux host has no Xcode or iOS simulator. |

## Operational work still required for a stronger deployment profile

- Separate identity and casting PostgreSQL operators, backups, logs, and network
  credentials beyond the local development profile.
- Deploy a separately controlled witness and auditor, distribute trust pins out
  of band, and retain a history that the election operator cannot rewrite.
- Run Foundry contract tests and a finalized external-chain verification; local
  Anvil is a demonstration only.
- Complete notification delivery, MFA/passkey enrollment, recovery, rate
  limiting, secret storage, backup/restore drills, and production TLS/mTLS.
- Exercise accessibility and native UI tests on the target operating systems.

## Evidence currently available

- Python unified suites: 302 passed, 0 failed, 0 skipped in the latest run.
- Web Vitest suite: 78 passed; Next production build, typecheck, and browser
  smoke test pass on this host.
- Desktop .NET suite: 101 passed; Linux client tests: 84 passed.
- Android and iOS native builds are not claimed from this host. Android source
  checks are present, but the Gradle compile process was terminated by the local
  runner during KAPT before a complete build result was produced.

This register does not authorize real elections. The prototype remains
synthetic-data-only and requires independent security, privacy, protocol, and
operational review before any real use.
