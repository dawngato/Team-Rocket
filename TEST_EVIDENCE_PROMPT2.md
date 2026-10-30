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
| E2-ALL | `python3 tools/run_all_tests.py` after current changes | 0 | 302 passed, 0 failed, 0 skipped across all 11 isolated suites in 43.85s | `GAP_REGISTER_PROMPT2.md` |
| E2-GATE | `python3 services/election_engine/gate_e1.py` | 0 | Five local Profile VEEM steps passed; this is not an established engine proof | `tests/security/reports/gate_e1_veem.json` |
| E2-DIFF | `git diff --check` | 0 | No whitespace errors | Working-tree diff |
| E2-COMBINED | `pytest -q services/casting/tests tests/security/Q7-01_duplicate_cast_test.py` | 1 | Pytest collection collision: root and service `conftest.py` registered under conflicting names | `GAP_REGISTER_PROMPT2.md:P2-12` |
| E2-FOUNDRY | `forge test` | not executed | `forge` unavailable in this environment | `GAP_REGISTER_PROMPT2.md:P2-09` |
| E2-DEMO | `python3 demo_five_attacks.py` | 0 | All five mandatory Q7 attacks successfully verified and rejected with exit code 0 | `demo_five_attacks.py` |
| E2-WEB-CURRENT | `npm --prefix apps/web test -- --run && npm --prefix apps/web run typecheck` | 0 | 84 Vitest tests passed across 14 files; Next typecheck passed | `apps/web/tests/`, `apps/web/tsconfig.json` |
| E2-WEB-BUILD-SMOKE | `cd apps/web && ./node_modules/.bin/next build` and `python /home/Kali/.codex/skills/webapp-testing/scripts/with_server.py --server "./node_modules/.bin/next start" --port 3000 -- python -u tests/browser_smoke.py` | 0 | Production build compiled all routes; Chromium smoke passed against the production server, including CSS 3D reduced-motion, officer fail-closed, and CSP-safe checks | `apps/web/src/components/BallotBoxHero.tsx`, `apps/web/src/app/officer/page.tsx`, `apps/web/tests/browser_smoke.py` |
| E2-EVIDENCE-GATE | `python3 -m pytest -q services/admin_api/tests/test_evidence_export.py services/admin_api/tests/test_api_endpoints.py` | 0 | Evidence metadata and archive download are blocked before package release; published export remains covered | `services/admin_api/tests/test_evidence_export.py`, `test_api_endpoints.py` |
| E2-COMPOSE | `docker compose config --quiet` | 0 | Compose configuration resolved successfully | `compose.yaml`, `compose.prod.yaml` |

The root unified runner isolates each suite in a subprocess, which is why it
passes while the direct combined command exposes the conftest naming issue.
