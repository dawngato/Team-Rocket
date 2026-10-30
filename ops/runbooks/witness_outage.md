# HimVote Witness Outage and Lag Mitigation Runbook

## 1. Scope and Severity Classification

Independent witness nodes are operated outside university infrastructure. While essential for anti truncation and non equivocation guarantees, temporary network partitions or witness server downtime must be handled gracefully without compromising voter ballot secrecy or data integrity.

```text
Severity Thresholds:

* Warning (Severity 3): Witness lag between 10 and 50 unacknowledged leaves, or response latency > 2 seconds.
* Major (Severity 2): Witness lag exceeding 100 leaves, or primary witness unreachable for > 15 minutes.
* Critical (Severity 1): Unwitnessed outbox backlog reaches maximum configured capacity (500 leaves), or all independent witnesses unreachable during election closing.
```

___

## 2. System Behavior During Witness Outage

```text
Graceful Degradation Mechanics:

1. Ballot Acceptance Continues:
   * Casting service continues accepting valid ballots into casting_db up to the configured outbox backlog limit.
   * Voter receipts report status COMMITTED_PENDING_WITNESS.

2. Backlog Throttling:
   * If the unwitnessed backlog exceeds the maximum threshold (500 leaves), the casting service pauses accepting new ballots and displays a polite waiting notice to voters:
     System is synchronizing cryptographic proofs with independent monitors. Please wait 60 seconds before submitting.

3. Failover to Secondary Witness:
   * HimVote manifests configure at least two independent witnesses.
   * checkpoint_worker automatically attempts checkpoint submission to Witness B if Witness A fails three consecutive retries.
```

___

## 3. Operator Response Procedures

### Step 1: Confirm Witness Service Reachability
Execute diagnostic connectivity probes from checkpoint worker nodes:
```bash
python ops/scripts/probe_witness_connectivity.py witness_primary
python ops/scripts/probe_witness_connectivity.py witness_secondary
```

### Step 2: Engage Independent Witness Operations Team
Contact the external witness organization on call team using the emergency escalation contacts listed in `ops/compliance/witness_contacts.json`. Provide:
* Election Identifier
* Last acknowledged tree size and sequence number
* Error response code or network timeout symptom

### Step 3: Switch Active Checkpoint Worker Target
If Primary Witness is experiencing extended hardware downtime, failover active submission to Secondary Witness:
```bash
python ops/scripts/set_active_witness.py election_id witness_secondary
```

### Step 4: Handle Outage at Election Close
If witness connectivity cannot be restored before the scheduled election close:
* The election enters state `CLOSED_PENDING_WITNESS`.
* The system refuses to advance to `FINAL_WITNESSED`.
* Election Officer must NOT publish unverified tallies.
* If the outage is permanent, the election engine marks the outcome `UNVERIFIABLE`. Publication remains permanently blocked until evidence is reconciled.
