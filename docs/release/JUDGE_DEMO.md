# Judge Demonstration and Audit Guide

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Independent Evaluator Verification Script

## Step by Step Demonstration Walkthrough

Follow these steps to independently verify the core security claims of the platform:

### Step 1 Run Full Test Suite
Execute the unified test runner to verify all 271 cryptographic, service, and protocol tests:
```bash
python3 tools/run_all_tests.py
```
Expected output: All 11 suites pass with 271 passed tests and exit code 0.

### Step 2 Execute Institutional Election Simulation
Run the complete 10 stage synthetic election lifecycle:
```bash
python3 fixtures/simulate_election.py
```
Expected output:
* Stages 1 through 10 succeed.
* Audit report confirms PASS across all eleven properties.
* Evidence archive exported to `fixtures/simulation_run/export/`.

### Step 3 Execute Standalone Offline Verifier
Simulate an airgapped audit of the exported election package with servers offline:
```bash
python3 verifier/verify.py audit_evidence \
  --export-dir fixtures/simulation_run/export \
  --external-dir fixtures/simulation_run/external \
  --trust-pins fixtures/simulation_run/external/trust_pins.json \
  --output report_audit.json
```
Expected output: Return code 0, overall status PASS.

### Step 4 Verify Student Receipt Inclusion
Verify a student receipt inclusion proof against the witnessed Merkle root:
```bash
python3 verifier/verify.py verify_inclusion \
  --receipt-handle rcpt_0000000000000001 \
  --export-dir fixtures/simulation_run/export \
  --external-dir fixtures/simulation_run/external \
  --trust-pins fixtures/simulation_run/external/trust_pins.json
```
Expected output: Inclusion verified against witnessed Merkle root.

### Step 5 Verify Adversarial Attack Rejections
Execute the automated Question 07 adversarial test suite:
```bash
python3 tests/run_tests.py
```
Expected output:
* Duplicate cast rejected (Q7.1 PASS)
* Inserted ballot rejected (Q7.2 PASS)
* Deleted ballot detected (Q7.3 PASS)
* Modified ballot detected (Q7.4 PASS)
* Tally tampering detected (Q7.5 PASS)

### Step 6 Web Application and Native Platforms Inspection
Inspect the web application production build and test suites:
```bash
cd apps/web && npm test && npm run build
```
Inspect the native Linux inspector test suite:
```bash
pytest apps/linux/tests
```
Expected output: 42 web tests pass; 48 web routes compile cleanly; 55 Linux native tests pass.
