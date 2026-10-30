# Prompt2 test evidence

Commands below were executed against the shared worktree. Exit code and
observed result are recorded; skipped or unavailable toolchains are not called
passes.

| Evidence ID | Command | Exit | Observed result | Artifact or source |
|---|---|---:|---|---|
| E2-BASE | `python3 tools/run_all_tests.py` before patch | 0 | 276 passed, 0 failed, 0 skipped | `evidence/prompt2/PROMPT2_BASELINE.md` |
| E2-ENGINE-CLIENT | `pytest -q services/casting/tests/test_engine_client.py services/casting/tests/test_security.py services/casting/tests/test_casting_service.py` | 0 | 17 passed | `services/casting/tests/test_engine_client.py`, `test_security.py` |
| E2-CASTING | `pytest -q services/casting/tests` | 0 | 34 passed | `services/casting/tests/` |
| E2-Q7-DUP | `pytest -q tests/security/Q7-01_duplicate_cast_test.py` | 0 | 1 passed; in-process fallback exercised 100 concurrent submissions and safe retry | `tests/security/Q7-01_duplicate_cast_test.py` |
| E2-ALL | `python3 tools/run_all_tests.py` after patch | 0 | 299 passed, 0 failed, 0 skipped across all 11 suites in 153.81s | `GAP_REGISTER_PROMPT2.md` |
| E2-GATE | `python3 services/election_engine/gate_e1.py` | 0 | Five local Profile VEEM steps passed; this is not an established engine proof | `tests/security/reports/gate_e1_veem.json` |
| E2-DIFF | `git diff --check` | 0 | No whitespace errors | Working-tree diff |
| E2-COMBINED | `pytest -q services/casting/tests tests/security/Q7-01_duplicate_cast_test.py` | 1 | Pytest collection collision: root and service `conftest.py` registered under conflicting names | `GAP_REGISTER_PROMPT2.md:P2-12` |
| E2-FOUNDRY | `forge test` | not executed | `forge` unavailable in this environment | `GAP_REGISTER_PROMPT2.md:P2-09` |
| E2-DEMO | `python3 demo_five_attacks.py` | 0 | All five mandatory Q7 attacks successfully verified and rejected with exit code 0 | `demo_five_attacks.py` |

The root unified runner isolates each suite in a subprocess, which is why it
passes while the direct combined command exposes the conftest naming issue.
