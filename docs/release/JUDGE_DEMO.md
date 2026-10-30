# HimVote judge demonstration

Document date: 30 October 2026

This is a synthetic data demonstration of the HimVote educational prototype. The local witness, local chain and Profile VEEM adapter are development components. They do not provide an independent production operator or a vetted secret ballot engine.

## 1. Run the verified Python suites

```bash
python3 tools/run_all_tests.py
python3 tools/verify_integrations.py
```

The recorded baseline is 273 passed and 1 skipped in the unified runner, followed by 79 integration checks. The exact output from the current run is recorded in `docs/TEST_EVIDENCE.md`.

## 2. Run the development election fixture

```bash
python3 fixtures/simulate_election.py
```

This command uses `--allow-development-profile` internally because the fixture is designed to exercise identity separation, acceptance, Merkle evidence, witness handling and mutation detection without a third party engine. Its report must not be presented as proof of an encrypted tally.

## 3. Run the strict standalone verifier

```bash
python3 -m verifier verify \
  --archive <evidence archive or directory> \
  --trust <external trust pins> \
  --final <independently obtained final checkpoint> \
  --roster <roster approval> \
  --issuance <issuer closure> \
  --chain <independently obtained chain record> \
  --report <output report>
```

The strict command returns exit code 3 for the current plaintext development profile. It returns exit code 0 only after a vetted engine supplies native ballot and tally evidence and all mandatory external checks pass.

For local fixture testing only, use the explicit opt in:

```bash
python3 verifier/verify.py audit_evidence \
  --export fixtures/simulation_run/export \
  --trust fixtures/simulation_run/external/trust_pins.json \
  --final fixtures/simulation_run/external/witness_final.json \
  --roster fixtures/simulation_run/external/roster_approval.json \
  --issuance fixtures/simulation_run/external/issuer_closure.json \
  --chain fixtures/simulation_run/external/chain_pins.json \
  --report fixtures/simulation_run/report.json \
  --allow-development-profile
```

## 4. Verify a receipt inclusion proof

```bash
python3 -m verifier verify \
  --archive <evidence archive or directory> \
  --trust <external trust pins> \
  --final <independently obtained final checkpoint> \
  --verify-inclusion <tracker JSON> \
  --report <output report>
```

Inclusion proves that a non choice revealing record is present under the supplied final root. It does not prove that a compromised endpoint captured the intended selection.

## 5. Run the web and Linux checks

```bash
cd apps/web
npm test -- --run
npm run build
cd ../..
xvfb-run -a python3 -m pytest apps/linux/tests -q
```

The current environment has the web and Linux checks available. Android unit tests are available through Gradle. iOS requires macOS and Xcode. The Avalonia and Windows builds require a .NET SDK, which is not installed in the current environment.

## 6. Mutation evidence

The five Question 07 mutation reports are under `tests/security/reports`. They cover duplicate submission, forged insertion, deletion, modification and tally manipulation. Each report must be read together with the verifier test and the limitations in `docs/security/CLAIMS_AND_LIMITATIONS.md`.

## 7. Honest trust boundary

The local witness and Anvil chain run under the same developer controlled environment. They are useful for repeatable tests, but they are not independent authorities. A production deployment would require a separately operated witness, separate key custody, a vetted election engine, an independent auditor and external reviews before any live election.
