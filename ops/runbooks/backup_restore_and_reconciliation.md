# HimVote Disaster Recovery, Backup Restore, and Reconciliation Runbook

## 1. Scope and Backup Architecture

HimVote mandates continuous data protection and automated disaster recovery capabilities for both database clusters.

```text
Backup Policy and Separation of Storage:

* Point In Time Recovery (PITR): Enabled on both clusters with continuous Write Ahead Log (WAL) archiving.
* Daily Automated Snapshots: Complete encrypted database snapshots executed daily at 02:00 UTC.
* Storage Bucket Isolation:
    * identity_db backups stored in s3://himvote_identity_backups_prod with KMS Key A.
    * casting_db backups stored in s3://himvote_casting_backups_prod with KMS Key B.
* Access Control: Identity DB administrators possess zero IAM permissions on casting backup buckets, and vice versa.
* Immutability: S3 Object Lock in Compliance Mode prevents snapshot deletion or alteration for 365 days.
```

___

## 2. The Critical Reconciliation Requirement

A catastrophic threat during disaster recovery is restoring a database snapshot that lags behind accepted transactions. If `casting_db` is restored from an older snapshot while an election is `OPEN`:
* The restored database would have an obsolete `next_leaf_index` (e.g. tree size 100 instead of 150).
* Reopening casting would cause new voters to receive previously assigned leaf indices, corrupting historical Merkle tree consistency.
* The independent witnesses and blockchain anchor would immediately reject subsequent checkpoints due to consistency proof failure.

Mandatory Architectural Rule: Restoring `casting_db` from a backup permanently locks the election in `RESTORE_LOCKED` state. The election engine refuses to accept new ballots until the restored database is fully reconciled against the independent witness and blockchain anchor.

___

## 3. Step by Step Database Restore and Reconciliation Runbook

### Step 1: Restore Database from Snapshot or PITR
Provision a restored PostgreSQL instance from the verified backup target:
```bash
python ops/scripts/restore_database_snapshot.py casting_cluster snapshot_id_target
```

### Step 2: Fetch Out of Band Independent Witness and Chain State
Before launching application services, query the independent external witnesses and the blockchain smart contract for the latest commitments:
```bash
python ops/scripts/fetch_external_consensus_state.py election_id
```
This produces a signed record containing:
* Witness highest acknowledged tree size (e.g. 150)
* Witness highest acknowledged Merkle root
* Blockchain latest confirmed anchored sequence and digest

### Step 3: Run Database Reconciliation Engine
Execute the standalone reconciliation tool:
```bash
python ops/scripts/reconcile_restored_database.py election_id
```

```text
Reconciliation Logic:

Case 1: Exact Tree Size and Root Match
  * Condition: Restored database next_leaf_index equals witness tree size, and local computed Merkle root matches witness root.
  * Outcome: Reconciliation PASS. Database is complete and up to date. Application may transition election to resume operation.

Case 2: Restored Database Lags Behind Witness (tree_size_local < tree_size_witness)
  * Condition: Restored database contains only 100 leaves, but witness acknowledged 150 leaves.
  * Action: Replay missing leaves (100 to 149) from continuous WAL archive or external outbox buffer.
  * If missing leaves are successfully replayed: recompute Merkle root and verify match. If verified: PASS.
  * If missing leaves cannot be recovered: The election is permanently flagged DISPUTED. Reopening is blocked. An official election incident inquiry is convened.

Case 3: Root Mismatch at Identical Tree Size
  * Condition: Local computed root contradicts witness signed root.
  * Action: Database tampering or corruption detected. Immediate state transition to DISPUTED. Publication blocked.
```

### Step 4: Unlock Election Post Reconciliation
Only after `reconcile_restored_database.py` outputs a clean pass and generates a signed reconciliation certificate may the Election Officer reopen casting:
```bash
python ops/scripts/unlock_reconciled_election.py election_id reconciliation_certificate.json
```

___

## 4. Disaster Recovery Drill Schedule

Disaster recovery drills must be executed once per quarter in the staging environment:
1. Populate staging with 1,000 synthetic ballots across 50 simulated voters.
2. Simulate catastrophic primary node loss.
3. Execute restore from snapshot.
4. Execute automated reconciliation verification.
5. Record drill outcomes, RPO, and RTO metrics in `ops/compliance/drills/`.
