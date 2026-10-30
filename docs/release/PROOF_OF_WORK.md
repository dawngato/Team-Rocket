# Proof of work

Document date: 30 October 2026

This record contains executed checks from the current HimVote workspace. It does not claim that the unavailable external engine, independent witness, iOS toolchain, .NET toolchain or Foundry toolchain has passed.

## Unified Python validation

Command:

```bash
python3 tools/run_all_tests.py
```

Result: exit code 0, 274 passed, 1 skipped.

The standalone verifier focused run also passed 37 tests. The strict command rejects the plaintext development fixture unless `--allow-development-profile` is supplied explicitly.

```bash
python3 -m pytest tests/test_verifier.py verifier/test_verifier.py -q
```

Result: exit code 0, 37 passed, 1 warning from the intentional duplicate ZIP entry fixture.

## Integration checks

Command:

```bash
python3 tools/verify_integrations.py
```

Result: exit code 0, 79 checks passed, with zero warnings and zero errors. These checks cover the repository's current development adapters and evidence workflows. They do not replace the external election engine gate.

## Web validation

Commands:

```bash
cd apps/web
npm test -- --run
npm run build
```

Observed result: 42 web tests passed and the production build generated 48 routes. The web pages display the educational prototype notice and do not claim production approval.

## Android and Linux validation

The Android Gradle unit test and debug build completed in the current environment. The Linux native test suite completed with 55 passed tests under Xvfb. The Linux application is a native Tkinter client and is separate from the Avalonia target.

## Unavailable platform toolchains

macOS and Xcode are not installed, so the iOS source is not claimed as built. The .NET SDK is not installed, so the Avalonia Windows and Linux source is not claimed as built. Foundry is not installed, so no Solidity test result is claimed. The source status and exact next steps are in `IMPLEMENTATION_STATUS.md`.

## Security evidence

The mutation reports under `tests/security/reports` cover duplicate submission, forged insertion, deletion, modification and tally manipulation. The verifier parser tests cover traversal, symlink, duplicate JSON key, duplicate archive entry and compression ratio defenses.

## Remaining release blockers

The Profile VEEM adapter is a development adapter. A vetted maintained election engine with a native independent verifier, an independently operated witness, external cryptographic and application security reviews, and the unavailable platform builds are required before any production or live election claim.
