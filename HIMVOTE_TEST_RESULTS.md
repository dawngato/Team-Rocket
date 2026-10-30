# HIMVOTE — Test Results & Evidence Log

**Date:** 2026-10-31  
**Target Environment:** Linux x86_64 / Python 3.14.7 / Node.js v20.18.0 / Next.js 15.5.7  
**Branch:** `repair-master-hardening`

---

## 1. Unified Backend Test Runner Execution

**Command:**
```bash
/home/sujal/Team-Rocket/.venv/bin/python tools/run_all_tests.py
```

**Output Log:**
```
============================================================================
HimVote Platform Unified Test Suite Runner
============================================================================
Running suite: packages/himvote_crypto ...
  PASS in 1.61s (36 passed)
Running suite: packages/test_vectors ...
  PASS in 0.46s (1 passed)
Running suite: services/identity_issuer ...
  PASS in 5.11s (24 passed)
Running suite: services/casting ...
  PASS in 3.06s (34 passed)
Running suite: services/admin_api ...
  PASS in 1.93s (24 passed)
Running suite: services/election_engine ...
  PASS in 13.09s (22 passed)
Running suite: services/checkpoint_worker ...
  PASS in 1.14s (34 passed)
witness                          PASS           28        0        0    1.50s
services/anchor_relayer          PASS           31        0        0    1.51s
verifier                         PASS           12        0        0    0.44s
tests                            PASS           54        0        0    4.39s
============================================================================
TOTAL                            PASS          300        0        0   34.25s
============================================================================

ALL TEST SUITES PASSED SUCCESSFULLY
```

---

## 2. Five Mandatory Q7 Attack Tests

**Command:**
```bash
/home/sujal/Team-Rocket/.venv/bin/python demo_five_attacks.py
```

**Output Log:**
```
========================================================================
  Running 5 Q7 Attacks via Test Harness (tests/harness)
========================================================================
  Delegating to: python3 -m pytest tests/security/test_core_integrity.py -v

tests/security/test_core_integrity.py::test_q7_01_duplicate_submission PASSED [ 20%]
tests/security/test_core_integrity.py::test_q7_02_unauthorized_insertion PASSED [ 40%]
tests/security/test_core_integrity.py::test_q7_03_deletion PASSED        [ 60%]
tests/security/test_core_integrity.py::test_q7_04_modification PASSED    [ 80%]
tests/security/test_core_integrity.py::test_q7_05_result_manipulation PASSED [100%]

============================== 5 passed in 0.12s ===============================

========================================================================
  Summary
========================================================================
  [PASS] Attack 1 Duplicate Submission
  [PASS] Attack 2 Unauthorized Insertion
  [PASS] Attack 3 Log Deletion
  [PASS] Attack 4 Record Modification
  [PASS] Attack 5 Result Manipulation

  [PASS] All five attacks correctly rejected / detected
```

---

## 3. Cryptographic Gate E1 Verification

**Command:**
```bash
/home/sujal/Team-Rocket/.venv/bin/python services/election_engine/gate_e1.py
```

**Output Log:**
```
Executing HimVote Gate E1 Verification Block...
Gate E1 Results:
* 1_create_and_cast_ballot: PASS
* 2_export_proof_artifacts: PASS
* 3_run_independent_verifier: PASS
* 4_tamper_detection: PASS
* 5_single_cast_enforcement: PASS
GATE_E1_PASSED: Profile VEEM verified
```

---

## 4. Frontend Vitest Test Suite

**Command:**
```bash
cd apps/web && ./node_modules/.bin/vitest run
```

**Output Log:**
```
 Test Files  12 passed (12)
      Tests  76 passed (76)
   Start at  01:49:22
   Duration  1.29s

✓ tests/api_client.test.ts (2)
✓ tests/button.test.ts (9)
✓ tests/casting_client.test.ts (10)
✓ tests/design_tokens.test.ts (5)
✓ tests/dialog_focus_trap.test.ts (17)
✓ tests/dialog_spring_enter.test.ts (2)
✓ tests/election_client.test.ts (8)
✓ tests/institutional_roles.test.ts (6)
✓ tests/offline_audit_and_inclusion.test.ts (5)
✓ tests/page.test.ts (2)
✓ tests/student_receipt_flow.test.ts (4)
✓ tests/vectors.test.ts (6)
```

---

## 5. Web TypeScript & Production Build Verification

**Commands:**
```bash
cd apps/web && ./node_modules/.bin/tsc --noEmit
cd apps/web && ./node_modules/.bin/next build
```

**Output Log:**
```
✓ Linting and checking validity of types 
✓ Collecting page data 
✓ Generating static pages (2/2)
✓ Collecting build traces 
✓ Finalizing page optimization 

Compiled successfully (60 routes compiled with 0 errors).
```
