# SecureVote and HimVote test matrix

| Area | Current evidence | Status |
| --- | --- | --- |
| Python protocol and security tests | Root pytest suite and saved reports | PASS locally, 50 passed and 1 skipped |
| Acceptance, integration, load, security, and unit tests | `tests/acceptance tests/integration tests/load tests/security tests/unit` | PASS locally, 23 passed and 1 skipped |
| Web TypeScript and unit tests | `npm run typecheck` and Vitest suite | PASS locally, 42 tests passed across 7 files |
| Web browser smoke | Playwright desktop and mobile flow | PASS locally after selector update |
| Linux desktop | Tkinter client tests and Xvfb window smoke | PASS locally, 55 passed |
| Android | `./gradlew test` | PASS locally, build and unit tests completed |
| iOS | Swift package and tests present | BLOCKED without macOS and Xcode |
| Windows | WinUI source and test project present | BLOCKED without .NET and Windows |
| SecureVote external source audit | `tools/source_audit.py` | INCOMPLETE because inputs are missing |
| Production engine integration | Profile VEEM development adapter only | BLOCKED and NOT PRODUCTION READY |

No blocked platform is reported as delivered. No missing source archive is reported as inspected.
