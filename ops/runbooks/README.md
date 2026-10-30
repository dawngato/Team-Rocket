# HimVote Operational Runbooks Suite

This directory contains standardized, actionable runbooks for engineering, DevOps, and on call personnel operating the HimVote institutional election platform.

```text
Runbooks Index:

1. Production Deployment Runbook
   * File: ops/runbooks/deployment.md
   * Purpose: Staged Kubernetes deployment, database migrations, and post deployment smoke testing.

2. Deployment Rollback Runbook
   * File: ops/runbooks/rollback.md
   * Purpose: Emergency reversal of failed application releases and database compatibility checks.

3. Cryptographic Key Rotation Runbook
   * File: ops/runbooks/key_rotation.md
   * Purpose: Scheduled and emergency key transitions across KMS, HSM, and witness infrastructure.

4. Witness Outage and Lag Mitigation Runbook
   * File: ops/runbooks/witness_outage.md
   * Purpose: Handling external witness downtime, backlog throttling, and witness failover.

5. Blockchain Outage and Reorg Mitigation Runbook
   * File: ops/runbooks/chain_outage.md
   * Purpose: Managing EVM RPC partitions, extreme gas spikes, and blockchain reorganizations.

6. Database High Availability and Failover Runbook
   * File: ops/runbooks/database_failover.md
   * Purpose: Multi AZ replication monitoring, automated failover, and replica promotion.

7. Disaster Recovery, Backup Restore, and Reconciliation Runbook
   * File: ops/runbooks/backup_restore_and_reconciliation.md
   * Purpose: Restoring databases and reconciling tree size against external witness checkpoints before reopening.

8. Voter Dispute Handling and Audit Classification Runbook
   * File: ops/runbooks/dispute_handling.md
   * Purpose: Five state auditor classification of voter tracking handles and support guidelines.

9. Suspected Cryptographic Compromise Incident Runbook
   * File: ops/runbooks/suspected_compromise.md
   * Purpose: Emergency containment, key revocation, and system isolation upon key exfiltration alarms.

10. Election Cancellation and Voiding Runbook
    * File: ops/runbooks/election_cancellation.md
    * Purpose: Statutory voiding procedures preserving immutable historical audit evidence.
```
