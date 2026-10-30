# Five Mandatory Question 07 Attack Demonstrations

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Adversarial Drill Protocols and Verified Outcomes

## Attack Scenarios and Automated Execution

### Drill 1 Duplicate Ballot Submission (Q7.1)
* Attack Description: An adversary or student attempts to submit a second ballot using an identical credential nullifier, executed both sequentially and concurrently across 100 parallel requests.
* Defense Mechanism: The casting gateway locks the election row with `SELECT FOR UPDATE` and enforces a database unique constraint on `(election_id, credential_nullifier)`.
* Verified Outcome: Exactly one ballot is accepted. All duplicate and concurrent submissions receive HTTP 409 Conflict.
* Test Path: `tests/security/Q7_01_duplicate_cast_test.py`
* Result Status: PASS.

### Drill 2 Unauthorized External Ballot Insertion (Q7.2)
* Attack Description: An adversary inserts a forged ballot ciphertext directly into the casting database or exported evidence package without a valid issuer credential signature.
* Defense Mechanism: The standalone verifier checks every leaf against the pinned issuer key using RFC 9474 unblinded signature verification.
* Verified Outcome: The verifier detects invalid signature formatting, assigns status FAIL with code FAIL_BAD_SIGNATURE, and exits with code 2.
* Test Path: `tests/security/Q7_02_insertion_test.py`
* Result Status: PASS.

### Drill 3 Accepted Ballot Deletion (Q7.3)
* Attack Description: An administrator deletes an accepted ballot from the exported evidence archive or truncates the final leaf records.
* Defense Mechanism: The independent witness signs a final checkpoint binding the exact leaf count and Merkle root.
* Verified Outcome: The verifier compares the archive leaf count with the witnessed tree size, identifies missing indices, flags FAIL_TRUNCATED, and exits with code 2.
* Test Path: `tests/security/Q7_03_deletion_test.py`
* Result Status: PASS.

### Drill 4 Ballot Modification or Ciphertext Flipping (Q7.4)
* Attack Description: An adversary modifies a single bit in an accepted ciphertext, candidate identifier, or cryptographic proof within a leaf record.
* Defense Mechanism: The verifier recomputes canonical RFC 8785 JSON bytes and RFC 9162 Merkle tree hashes across all leaves upward to the root.
* Verified Outcome: The recomputed Merkle root contradicts the witnessed checkpoint root, flagging FAIL_BAD_ROOT with exit code 2.
* Test Path: `tests/security/Q7_04_modification_test.py`
* Result Status: PASS.

### Drill 5 Tally Tampering or Winner Swapping (Q7.5)
* Attack Description: An administrator modifies the announced candidate counts in `results.json` to alter the election outcome.
* Defense Mechanism: The verifier independently aggregates votes across all valid ballots and recomputes the tally.
* Verified Outcome: The recomputed tally does not match announced totals, assigning FAIL_INVALID_TALLY with exit code 2. Publication is blocked.
* Test Path: `tests/security/Q7_05_tally_tamper_test.py`
* Result Status: PASS.
