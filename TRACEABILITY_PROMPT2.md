# Prompt2 traceability

This matrix maps the Q07 outcomes to observed code, tests and evidence. A
passing local integrity test does not upgrade a blocked established-engine or
independence property.

| ID | Requirement | Code paths | Test/evidence | Status |
|---|---|---|---|---|
| Q07-01 | Authorized election administration | `services/admin_api/src/routers/elections.py`, `src/state_machine/lifecycle.py`, `services/identity_issuer/routers/admin.py` | `python3 tools/run_all_tests.py`, admin and identity suites; `GAP_REGISTER_PROMPT2.md:P2-05/P2-06` | TESTED_PASS locally |
| Q07-02 | At most one accepted ballot per eligible student/election | `services/casting/src/service.py:73-220`, `services/casting/src/models.py` | `pytest -q tests/security/Q7-01_duplicate_cast_test.py`; 100 concurrent retries; evidence reports under `tests/security/reports/` | TESTED_PASS locally |
| Q07-03 | No direct identity-to-choice record | `services/casting/src/security.py`, `src/models.py`, web casting client | `services/casting/tests/test_security.py`; origin headers are rejected/stripped; residual timing and operator risks remain | PARTIAL |
| Q07-04 | Tamper detection independent of administrator DB | `witness/`, `services/checkpoint_worker/`, `verifier/verify.py` | `python3 tools/run_all_tests.py`; Q7 mutation reports under `tests/security/reports/` | TESTED_PASS locally, independence limited |
| Q07-05 | Independent integrity and tally check | `verifier/verify.py:1207-1344`, `services/election_engine/gate_e1.py` | `python3 services/election_engine/gate_e1.py`; `tests/security/reports/gate_e1_veem.json` | BLOCKED for established engine; local profile only |
| Q07-06 | Student inclusion verification without choice disclosure | `services/casting/src/service.py` receipt evidence; `apps/web/src/app/student/receipts/[handle]/inclusion/page.tsx` | `services/casting/tests/test_receipt.py`; web vector and student receipt tests | TESTED_PASS for supplied evidence shape |
| Q07-07 | Duplicate, insertion, deletion, modification and tally attacks | `tests/security/`, `tests/integration/`, `verifier/verify.py` | `python3 tools/run_all_tests.py`; report files `Q7_01` through `Q7_05` | TESTED_PASS for local synthetic harness |
| Q07-08 | Assumptions and known limits documented | `IMPLEMENTATION_STATUS.md`, `services/election_engine/README.md`, `verifier/README.md` | This matrix, gap register, release readiness and existing limitation docs | TESTED_PASS as documentation |

| EXT-01 | Remote engine validation boundary | `services/casting/src/engine_client.py`, `src/service.py`, `compose.prod.yaml` | `services/casting/tests/test_engine_client.py`, production syntax-only negative test | TESTED_PASS |
| EXT-02 | Local witness and chain are not independent | `witness/`, `chain/`, `compose*.yaml` | Source review and status docs | LIMITED |
| EXT-03 | Avalonia desktop offline verification | `apps/desktop/` | Existing .NET test evidence in `IMPLEMENTATION_STATUS.md`; no new build here | IMPLEMENTED_UNTESTED in this pass |
