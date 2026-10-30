# Platform build status

| Platform | Source | Evidence on 2026-10-31 | Status |
|---|---|---|---|
| Web | `apps/web` | Vitest 84 passed across 14 files; `npm run typecheck`, production build, and production Chromium smoke exit 0 | TESTED_PASS locally |
| Android | `apps/android` | `testDebugUnitTest --no-daemon --max-workers=1` completed successfully with 59 unit tests and 0 failures | TESTED_LIMITED; device and release APK validation not run |
| iOS | `apps/ios` | `swift test` could not start because `swift` is not installed; Xcode/macOS unavailable | BLOCKED; XCTest not claimed |
| Windows Avalonia | `apps/desktop/HimVote.Windows` | existing .NET test evidence in repository status docs; re-run required for this iteration | LIMITED |
| Linux Avalonia | `apps/desktop/HimVote.Linux` | source present; native packaging/runtime requires platform check | LIMITED |
| Linux inspection GUI | `apps/linux` | existing local pytest evidence in repository status docs | LIMITED auxiliary tool |
| Smart contract | `chain` | Foundry availability not established in this iteration | BLOCKED |

No unsupported native build claim should be shown in the product UI. Toolchain
absence is a status, not a success.

Additional repository-wide evidence: `python3 tools/run_all_tests.py` completed
with 302 passed, 0 failed, and 0 skipped. Android unit tests completed with 59
tests and 0 failures. This is `TESTED_PASS` for the unit-test task; device or
emulator UI validation is not claimed.
