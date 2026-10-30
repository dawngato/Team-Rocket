# Test evidence

The source audit command is:

```bash
python3 tools/source_audit.py --root . --output /tmp/himvote_source_audit.json
```

The command inventories the required specifications, archives, and code areas. It reads ZIP metadata only and never extracts or executes archive contents.

The current run is incomplete because the SecureVote specification files and the three referenced source ZIP files are not present in the repository. The absence is a limitation and not a passing result.

## Executed local evidence

```text
python3 tests/run_tests.py
50 passed and 1 skipped

python3 -m pytest tests/acceptance tests/integration tests/load tests/security tests/unit -q
23 passed and 1 skipped

python3 packages/test_vectors/verify_vectors.py
All ballot evidence, Merkle tree, blind signature, and checkpoint vectors passed

python3 tools/run_all_tests.py
274 passed and 1 skipped in isolated suite processes

apps/web npm run typecheck
Passed

apps/web npm test -- --run
42 tests passed across 7 files

apps/web npm run build
48 Next.js routes generated

xvfb-run -a python3 -m pytest apps/linux/tests -q
55 passed

apps/android ./gradlew test
Build and unit test tasks passed. Device instrumentation not run.

python3 tools/verify_integrations.py
79 integration checks passed with zero warnings and zero errors

python3 -m pytest tests/unit/test_source_audit.py tests/unit/test_verify_integrations.py -q
6 passed

python3 -m pytest verifier/test_verifier.py tests/test_verifier.py -q
37 passed and 1 warning from the intentional duplicate ZIP entry fixture

python3 -m pytest services/admin_api/tests -q
21 passed

python3 -m pytest services/identity_issuer/tests -q
22 passed

python3 -m pytest services/casting/tests -q
28 passed

python3 -m verifier verify --archive /tmp/missing-election.zip --trust /tmp/missing-trust.json --report /tmp/missing-report.json
Exit code 3 with explicit missing independent input message
```

The Android, iOS, Windows, and Foundry commands were not passed off as successful because their required runners or toolchains are not available in this workspace.
