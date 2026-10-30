# HimVote Database High Availability and Failover Runbook

## 1. Database Architecture and Isolation

HimVote maintains two physically isolated PostgreSQL 16 database clusters:
* `identity_db`: Houses student profiles, authentication credentials, MFA, and blind credential slots.
* `casting_db`: Houses encrypted ballots, credential nullifiers, and Merkle log outbox rows.

Each cluster is deployed in a multi availability zone high availability configuration with synchronous replication between primary and standby replicas.

```text
Availability Objectives:

* Recovery Point Objective (RPO): Under 5 minutes for casting data; zero data loss under synchronous multi AZ failover.
* Recovery Time Objective (RTO): Under 1 hour for complete cluster recovery; automated failover completes in under 60 seconds.
* Uptime Objective: 99.9 percent availability during scheduled open election windows.
```

___

## 2. Automated Failover Mechanics

Under standard cloud deployments (e.g. AWS Aurora PostgreSQL or Google Cloud SQL Enterprise Plus):
* Heartbeat monitors continuously assess primary instance health.
* If the primary fails to respond within 30 seconds, the cluster manager promotes the synchronous standby replica to primary automatically.
* Virtual IP or DNS endpoints automatically redirect client connection pools to the newly promoted primary.
* Application services utilize connection pool retry logic with exponential backoff to reconnect seamlessly without restarting pods.

___

## 3. Manual Failover Execution Procedure

In the event that an automated failover is impaired or a primary database instance exhibits severe hardware degradation:

### Step 1: Assess Replication Health and Replica Lag
Query replication status on the standby replica before triggering promotion:
```bash
python ops/scripts/check_database_replication_lag.py casting_cluster
```
Verify replication lag is zero bytes. If lag exists, attempt to drain pending write transactions.

### Step 2: Trigger Primary Promotion
Initiate managed replica promotion:
```bash
# Example invocation via database management automation
python ops/scripts/promote_database_replica.py casting_cluster standby_replica_az_b
```

### Step 3: Verify Application Reconnection
Inspect service logs for `services/casting` and `services/checkpoint_worker`:
```bash
python ops/scripts/check_service_database_connections.py casting casting_plane
```
Ensure connection pools establish active connections and test queries execute with latency under 10 milliseconds.

### Step 4: Reconcile Outbox and Checkpoint Sequence
Following failover, checkpoint_worker automatically verifies that the current `next_leaf_index` in `casting_db` matches the highest leaf index recorded in the outbox.
* If any discrepancy is detected, the election automatically transitions to `DISPUTED` to protect integrity.

___

## 4. Post Failover Verification Checklist

1. **Transaction Integrity**: Confirm that read and write transactions execute successfully on the promoted primary.
2. **Read Replica Provisioning**: Provision a new standby replica to restore multi availability zone redundancy.
3. **Log Audit**: Confirm zero database queries failed with data corruption errors.
