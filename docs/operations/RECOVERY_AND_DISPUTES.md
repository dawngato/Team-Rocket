# Operations Recovery and Dispute Resolution

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Disaster Recovery, Incident Response, and Dispute Protocol

## 1. Failure Scenarios and Recovery Procedures

1. Network Disconnection During Voting:
   * Condition: Voter submits ballot but connection drops before receiving HTTP response.
   * Recovery: Voter checks receipt status using deterministic idempotency key. If transaction committed, previous receipt handle is returned. If not committed, voter may submit unspent credential safely. No duplicate vote is created.

2. Database Crash Between Ballot Commit and Outbox Ingestion:
   * Condition: Casting database restarts while accepted ballots are in outbox.
   * Recovery: Checkpoint worker is stateless and queries pending outbox records ordered by leaf index. Upon restart, worker resumes ingestion from last processed sequence. No ballot is lost or duplicated.

3. Witness Service Equivocation or Fork:
   * Condition: Witness produces conflicting roots for the same tree size or fails monotonicity.
   * Recovery: Checkpoint worker and independent verifier reject the signature immediately. Election enters DISPUTED state. Administrative intervention cannot bypass witness continuity failure.

4. Blockchain Reorganization on Ethereum:
   * Condition: Reorg drops an anchored transaction beyond confirmation depth.
   * Recovery: Anchor relayer poller detects canonical branch discrepancy, verifies checkpoint status on the canonical chain, and resets unanchored records to ANCHOR_PENDING for automatic rebroadcast.

5. Database Backup Restoration Anomaly:
   * Condition: Operator attempts to restore a database backup older than independently witnessed checkpoints.
   * Recovery: Standalone verifier compares restored database leaf count with pinned witness final checkpoint. When leaf count is smaller than witnessed tree size, verifier flags FAIL_TRUNCATED and rejects election.

## 2. Dispute Resolution Protocol

1. Raising a Formal Dispute:
   * Any Independent Auditor or Public Observer may submit an audit report containing status FAIL or UNVERIFIABLE.
   * The Election Officer and Super Administrator are alerted immediately.
   * The election status transitions to DISPUTED, halting certified publication.

2. Cryptographic Evidence Examination:
   * The independent verifier is executed in presence of observer representatives with pinned public trust roots.
   * If root mismatch, duplicate nullifier, or modified leaf is confirmed, the election outcome is invalidated.
   * All evidence archives and witness logs are preserved for post election security review.
