# HimVote test results

Execution date: 2026 10 30

This file records commands actually run in the current Linux workspace. A passing result proves only the tested development behavior. It does not establish production readiness or approval for real elections.

## Protocol and security suite

Command:

```text
python3 tests/run_tests.py
```

Observed result: 50 passed and 1 skipped.

The suite completed successfully. It covers the repository protocol, security, integration, and concurrency fixtures that are included in `tests/`.

## Canonical vectors

Command:

```text
python3 packages/test_vectors/verify_vectors.py
```

Observed result: ballot evidence, Merkle tree, blind signature, and checkpoint vectors passed.

## Python service suites

The following commands were run from the repository root:

```text
python3 -m pytest services/identity_issuer/tests -q
python3 -m pytest services/admin_api/tests -q
python3 -m pytest services/casting/tests -q
python3 -m pytest services/checkpoint_worker/tests -q
python3 -m pytest services/anchor_relayer/tests -q
python3 -m pytest services/election_engine/tests -q
python3 -m pytest witness/tests -q
python3 -m pytest verifier/test_verifier.py -q
```

Observed results:

| Suite | Result |
| --- | --- |
| Identity issuer | 22 passed |
| Admin API | 21 passed |
| Casting | 28 passed |
| Checkpoint worker | 34 passed |
| Anchor relayer | 23 passed |
| Election engine adapter | 22 passed |
| Witness | 27 passed |
| Standalone verifier unit tests | 7 passed |

## Web application

Commands:

```text
npx tsc --noEmit
npm test -- --run
npm run build
python3 tests/browser_smoke.py
```

Observed result: TypeScript check passed. Vitest passed 42 tests across 7 files. The production Next.js build generated 48 routes successfully. Browser smoke passed against the local development server at `http://127.0.0.1:3000`.

The browser smoke script checks the home page, responsive navigation, receipt state content, mobile layout, and absence of horizontal overflow at the tested widths.

## Linux client

Command:

```text
xvfb-run -a python3 -m pytest apps/linux/tests -q
```

Observed result: 55 passed.

The Linux client is a native Tkinter demonstration client. It uses the API boundary for connected behavior and does not implement ballot encryption itself.

The Avalonia Linux source is also present under `apps/desktop/HimVote.Linux`. Its native build was not run because the .NET SDK is unavailable in this workspace.

## Android client

Command:

```text
./gradlew test
```

Observed result: Android build and unit test tasks completed successfully. The run produced compiler warnings only. Device and emulator instrumentation was not run in this workspace.

## Not run or blocked

Foundry is not installed in this environment, so the Solidity tests were not run here. Run `forge test -vvv` on a Foundry runner before claiming chain test completion.

The iOS build was not run because macOS and Xcode are required and are not installed.

The Windows build was not run because the .NET SDK and Windows App SDK runner are not installed. The current Windows source is not a Linux native build.

The SecureVote reference documents and source archives are absent. The external engine integration gate therefore remains blocked. Profile VEEM is a development stand in and does not establish a production voting engine claim.

## Security test interpretation

The current passing tests do not prove coercion resistance, complete anonymity, resistance to compromised clients, independent witness operation, external chain finality, or suitability for a live election. Those properties remain documented limitations and require independent review.

