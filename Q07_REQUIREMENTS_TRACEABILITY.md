# Question 07 requirements traceability

Audit date: 2026-10-31. Status values use the repository contract:
`NOT_STARTED`, `IMPLEMENTED_UNTESTED`, `TESTED_PASS`, `TESTED_FAIL`,
`LIMITED`, and `BLOCKED`.

| Q7 requirement | Source evidence | Test evidence | Status |
|---|---|---|---|
| Election administration | `services/admin_api/`, `services/election_engine/`, `apps/web/src/app/officer/` | admin API and lifecycle tests; web unit tests pass, typecheck currently blocked by generated auditor route import | LIMITED |
| One accepted ballot | `services/casting/src/service.py`, `services/casting/src/models.py` unique nullifier and leaf constraints | casting concurrency/idempotency/integration tests | TESTED_PASS locally, LIMITED for external engine |
| Privacy separation | `services/casting/src/security.py`, `services/casting/src/models.py`, web casting client | identity-header/cookie rejection and protocol tests | LIMITED: deployment/operator separation not proven |
| Tamper evidence | `services/checkpoint_worker/`, `witness/`, `verifier/` | verifier and attack fixtures | TESTED_PASS locally, LIMITED custody |
| Independent verification | `verifier/verify.py`, `apps/desktop/verifier/` | standalone verifier tests and failure fixtures | LIMITED; native tally is `NOT_CHECKED` |
| Five attacks | `tests/security/`, verifier fixture scenarios | `python3 tests/run_tests.py` in repository history/current test suites | LIMITED to local synthetic evidence |
| Assumptions/limitations | `docs/`, `README.md`, service/verifier READMEs | source audit and documentation review | TESTED_PASS for documentation presence |

## Scope notes

The API is not a production authentication system when it uses synthetic actor
headers or local fixtures. UI role selectors and fixture data are presentation
helpers, never authentication. Green status labels are only valid when backed
by the stated verifier result; local witness and local Anvil/chain records are
not independently operated trust authorities.
