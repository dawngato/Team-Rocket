# HimVote Automated Security and Integration Test Suite

This directory contains the production test suite for the HimVote platform according to Section 12 of prompt.md.

## Architecture Overview

The test harness evaluates the cryptographic guarantees, cluster separation rules, and concurrency invariants defined across the specification.

### Key Components

* harness/crypto.py: Canonical JSON conforming to RFC 8785, RFC 9162 Merkle tree construction with SHA256 prefixes, blind signature token issuance simulations conforming to RFC 9474, and verifiable engine proofs.
* harness/identity_cluster.py: Identity origin simulation enforcing frozen roster eligibility, atomic slot reservation, and crash recovery.
* harness/casting_cluster.py: Anonymous casting origin simulation enforcing nullifier uniqueness, monotonic leaf sequence, outbox queuing, and exclusion of identity session headers.
* harness/witness_cluster.py: Independent witness simulation validating monotonic tree growth, detecting sequence gaps, and preventing rollback or conflicting final checkpoints.
* harness/chain_cluster.py: Consortium blockchain anchor relayer simulation enforcing sequence monotonicity and relayer access control.
* harness/verifier.py: Standalone auditor verification engine recomputing roots and checking property proofs.
* harness/reporter.py: Structured audit test recorder logging test ID, seed, manifest digest, engine version, verifier SHA256, database summaries, and postconditions to disk.

## Security Test Specifications

### 1. Core Integrity Suite (Section 12.1)

* Q7_01 Duplicate Submission: One voter credential evaluated under 100 concurrent submissions. Asserts that exactly one leaf and one nullifier are committed. Safe identical retries return identical receipt handles; differing ballots with the same nullifier are rejected.
* Q7_02 Unauthorized Insertion: Asserts rejection of forged credentials, wrong election credentials, unapproved roster members, corrupt engine proofs, and direct database writes bypassing the cast function.
* Q7_03 Deletion: Validates 10 witnessed ballots committed to the log. Removing any single ballot from export or presenting an older truncated final causes the verifier to fail against the independently fetched witness final and chain anchor.
* Q7_04 Modification: Tampering with ballot ciphertext, zero knowledge engine proof, nullifier string, or leaf index results in immediate Merkle proof mismatch or proof verification failure.
* Q7_05 Result Manipulation: With ballots left untouched, altering announced candidate counts or totals causes the tally verification to fail with exit code 2.

### 2. Protocol Integration Suite (Section 12.2)

* Issuance Concurrency and Recovery: Two different blinded requests arriving simultaneously resolve to a single reservation. Simulated crash before sign recovers the persisted request. Simulated crash after sign delivers the stored signature without generating a duplicate. Lost blinding secret cannot obtain a new credential. Requests past cutoff are rejected.
* Casting Close and Race Conditions: 100 simultaneous requests arriving at closing boundary. Requests before close timestamp commit; requests after close timestamp are rejected. Prevents leaf index write collisions. Drains outbox losslessly following simulated worker restart. Handles network drop after commit by updating receipt handle to WITNESSED upon witness acknowledgement.
* Witness Gap Detection and Rollback Rejection: Witness rejects wrong election IDs, smaller tree size rollbacks, leaf index gaps, and conflicting second final checkpoints. Permanent witness outage marks election unverifiable.
* Cross Platform Credential Reuse: Same credential submitted concurrently from web, Android, iOS, and Windows clients. Exactly one client is accepted; remaining three are rejected with duplicate nullifier errors.

### 3. Load and Throughput Suite (Section 12.4)

* 100 Concurrent Voters: Sustained concurrent voting across multi threaded worker pools. Validates zero index collisions, sequential outbox ingestion, and full verification against witness final.

## Test Runner Instructions

All test suites can be executed via the dedicated runner without any command line flags.

### Execute Full Suite via Runner

python3 tests/run_tests.py

### Execute via Pytest

PYTHONPATH=. pytest tests

### Execute Individual Test Modules

PYTHONPATH=. pytest tests/security/test_core_integrity.py

PYTHONPATH=. pytest tests/integration/test_protocol.py

PYTHONPATH=. pytest tests/load/test_concurrent_load.py

## Audit Reports and Postconditions

Each test run writes structured JSON records containing:
* Test ID
* Random seed
* Manifest digest
* Engine record version
* Verifier code SHA256 checksum
* Expected outcome and actual outcome
* Database state summary
* Explicitly verified postconditions

Audit reports are persisted in:
* tests/security/reports/
* tests/integration/reports/
* tests/load/reports/
