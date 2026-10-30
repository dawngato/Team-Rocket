# Test evidence and attack demonstrations

## Executed suites

| Suite | Command | Result |
|---|---|---|
| Web | `npm --prefix apps/web test -- --run` | 78 passed |
| Web types | `npm --prefix apps/web run typecheck` | exit 0 |
| iOS unit and integration source | `swift test` from `apps/ios` | BLOCKED before compilation: `swift` is not installed |
| Casting/receipt/security | `python3 -m pytest services/casting/tests/test_receipt.py services/casting/tests/test_security.py services/casting/tests/test_idempotency_and_duplicates.py -q` | 14 passed |
| Verifier hardening | `python3 -m pytest verifier/test_verifier.py verifier/test_security_hardening.py tests/test_verifier.py -q` | 42 passed, 1 warning |
| Full repository runner | `python3 tools/run_all_tests.py` | 302 passed, 0 failed, 0 skipped |
| Q7 security runner | `python3 tests/run_tests.py` | 54 passed, 1 warning |
| Integrity API slice | `pytest -q apps/desktop/services/securevote_api/tests` | exit 0 |
| Standalone verifier | `pytest -q apps/desktop/verifier/tests` | 13 passed |
| Android baseline | `./gradlew test` | fail 1 on stale resource merge |
| Android rerun | `./gradlew testDebugUnitTest --no-daemon --max-workers=1` | terminated 143 before test report |

## Required attack matrix

| Attack | Controlled mutation | Expected evidence |
|---|---|---|
| Duplicate vote | same nullifier/concurrent submissions | one accepted leaf, replay returns same outcome or 409 |
| Unauthorized insertion | forged ballot/evidence row | proof/authorization/final checkpoint mismatch |
| Deletion | remove accepted record from copied archive | tree size/root/continuity failure |
| Modification | change ciphertext/proof/digest | canonical or signature mismatch |
| Tally manipulation | alter announced totals | tally digest/native proof mismatch |

The repository's `tests/security/`, `tests/integration/`, and verifier fixture
scenarios cover these locally. Re-run them with a preserved evidence directory,
exit code, timestamp, and independently supplied final checkpoint before calling
the result a release demonstration.

## Additional execution evidence from this implementation iteration

`python3 tools/run_all_tests.py` completed with **302 passed, 0 failed, 0
skipped**, exit code 0. The Android unit-test task also completed with **59
tests, 0 failures**, exit code 0 using:

`./gradlew testDebugUnitTest --no-daemon --max-workers=1 -Dorg.gradle.jvmargs='-Xmx512m -XX:MaxMetaspaceSize=256m -Dfile.encoding=UTF-8' --console=plain`

Device/emulator UI validation remains unclaimed.
