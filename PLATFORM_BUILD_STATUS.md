# Platform build status

| Platform | Source | Evidence on 2026-10-31 | Status |
|---|---|---|---|
| Web | `apps/web` | Vitest 77 passed; `npm run typecheck` exit 0 | TESTED_PASS locally |
| Android | `apps/android` | `testDebugUnitTest` terminated with exit 137 during KAPT/resource-constrained compilation | TESTED_FAIL / no pass claim |
| iOS | `apps/ios` | `swift test` could not start because `swift` is not installed; Xcode/macOS unavailable | BLOCKED; XCTest not claimed |
| Windows Avalonia | `apps/desktop/HimVote.Windows` | existing .NET test evidence in repository status docs; re-run required for this iteration | LIMITED |
| Linux Avalonia | `apps/desktop/HimVote.Linux` | source present; native packaging/runtime requires platform check | LIMITED |
| Linux inspection GUI | `apps/linux` | existing local pytest evidence in repository status docs | LIMITED auxiliary tool |
| Smart contract | `chain` | Foundry availability not established in this iteration | BLOCKED |

No unsupported native build claim should be shown in the product UI. Toolchain
absence is a status, not a success.

Additional repository-wide evidence: `python3 tools/run_all_tests.py` completed
with 301 passed, 0 failed, and 0 skipped. Android remains `TESTED_FAIL` for this
iteration because Gradle was terminated before producing the unit-test report.
