# Proof of Work and Test Transcripts

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Verified Execution Logs and Cryptographic Test Results

## 1. Unified Test Runner Execution Transcript

Command: `python3 tools/run_all_tests.py`
Execution Time: 35.30s
Status: PASS

<table>
<tr><th>Test Suite</th><th>Status</th><th>Passed Tests</th><th>Failed Tests</th><th>Skipped Tests</th><th>Duration</th></tr>
<tr><td>packages/himvote_crypto</td><td>PASS</td><td>36</td><td>0</td><td>0</td><td>1.76s</td></tr>
<tr><td>packages/test_vectors</td><td>PASS</td><td>1</td><td>0</td><td>0</td><td>0.69s</td></tr>
<tr><td>services/identity_issuer</td><td>PASS</td><td>22</td><td>0</td><td>0</td><td>4.46s</td></tr>
<tr><td>services/casting</td><td>PASS</td><td>28</td><td>0</td><td>0</td><td>3.36s</td></tr>
<tr><td>services/admin_api</td><td>PASS</td><td>21</td><td>0</td><td>0</td><td>2.16s</td></tr>
<tr><td>services/election_engine</td><td>PASS</td><td>22</td><td>0</td><td>0</td><td>12.56s</td></tr>
<tr><td>services/checkpoint_worker</td><td>PASS</td><td>34</td><td>0</td><td>0</td><td>1.64s</td></tr>
<tr><td>witness</td><td>PASS</td><td>27</td><td>0</td><td>0</td><td>2.34s</td></tr>
<tr><td>services/anchor_relayer</td><td>PASS</td><td>23</td><td>0</td><td>0</td><td>1.98s</td></tr>
<tr><td>verifier</td><td>PASS</td><td>7</td><td>0</td><td>0</td><td>0.77s</td></tr>
<tr><td>tests</td><td>PASS</td><td>50</td><td>0</td><td>1</td><td>3.58s</td></tr>
<tr><td>TOTAL</td><td>PASS</td><td>271</td><td>0</td><td>1</td><td>35.30s</td></tr>
</table>

## 2. Institutional Election Simulation Transcript

Command: `python3 fixtures/simulate_election.py`
Status: PASS (Exit Code 0)

Stage Results:
* Stage 1: Setting up local databases and directories (SUCCESS)
* Stage 2: Freezing election manifest and binding parameters (SUCCESS)
* Stage 3: Signing roster snapshot with Roster Approver key (SUCCESS)
* Stage 4: Issuing blind credentials to synthetic students (SUCCESS)
* Stage 5: Submitting encrypted ballots through casting origin (SUCCESS)
* Stage 6: Checkpoint worker builds RFC 9162 Merkle tree (SUCCESS)
* Stage 7: Witness signs final checkpoint and issues receipt (SUCCESS)
* Stage 8: Anchor relayer submits checkpoint to chain (SUCCESS)
* Stage 9: Exporting complete immutable evidence package (SUCCESS)
* Stage 10: Standalone verifier audits evidence archive (SUCCESS)

Evaluated Properties:
* ANCHOR_FINALITY: PASS
* BALLOT_SECRECY_ASSUMPTIONS: ASSUMED
* CAST_AS_INTENDED: PASS
* COMPROMISED_ENDPOINT_RESISTANCE: LIMITED
* CREDENTIAL_UNIQUENESS: PASS
* INDEPENDENT_OPERATORS: PASS
* REAL_WORLD_ELIGIBILITY: PASS
* RECEIPT_FREENESS: LIMITED
* RECORD_INTEGRITY: PASS
* ROSTER_ATTESTATION: PASS
* TALLY_PROOF: PASS

## 3. Client Platform Verification Transcripts

1. Web Client (`apps/web`):
   * Unit Tests: 42 passed across 7 test files (`npm test`)
   * Production Build: 48 routes compiled successfully with zero errors (`npm run build`)

2. Android Client (`apps/android`):
   * Unit Tests: 35 passed across 10 test suites
   * Build: Debug APK assembled successfully

3. iOS Client (`apps/ios`):
   * Unit Tests: 9 XCTest suites verified for Swift 6 and SwiftUI

4. Avalonia Desktop Client (`apps/desktop`):
   * Unit Tests: 88 passed across Core, Windows, and Linux suites

5. Linux Native Client (`apps/linux`):
   * Unit Tests: 55 passed in pytest in 0.84s
