# HimVote Deployment Rollback Runbook

## 1. Scope and Trigger Criteria

This runbook outlines the emergency procedure for reversing an application or infrastructure deployment that introduces errors, instability, or performance degradation in staging or production environments.

```text
Rollback Trigger Conditions:

* HTTP 5xx error rate exceeding 0.1 percent on identity or casting endpoints.
* Database connection pool exhaustion or query timeout spikes (> 500 milliseconds p95).
* Failure of Kubernetes readiness or liveness probes during rolling update.
* Any unhandled crash loop in checkpoint_worker or anchor_relayer pods.
* Detection of unredacted data or cryptographic secrets in observability streams.
```

___

## 2. Emergency Rollback Execution Sequence

### Step 1: Declare Rollback Event
The Deployment Commander announces the rollback in the war room channel and sets the incident status to ROLLBACK_ACTIVE.

### Step 2: Rollback Application Helm Releases
Revert application deployments to the previous stable Helm revision:
```bash
python ops/scripts/rollback_helm_release.py himvote_identity identity_plane
python ops/scripts/rollback_helm_release.py himvote_casting casting_plane
python ops/scripts/rollback_helm_release.py himvote_web default_plane
python ops/scripts/rollback_helm_release.py himvote_checkpoint casting_plane
```

### Step 3: Verify Pod Replacement and Health
Monitor pod termination and ensure previous version containers achieve ready status:
```bash
python ops/scripts/verify_pods_ready.py identity_plane
python ops/scripts/verify_pods_ready.py casting_plane
```

### Step 4: Database Schema Reconciliation
HimVote enforces an architectural rule that all database migrations must remain backward compatible for at least one preceding application release. Under standard circumstances, database schema downgrades are NOT executed during emergency rollbacks.

If a migration introduced a fatal database constraint that impairs previous code:
```bash
# Execute managed schema downgrade script only under explicit DBA approval
python ops/scripts/downgrade_database_schema.py casting_plane target_revision
```

___

## 3. Post Rollback Health Verification

1. **Traffic Stabilization**: Verify edge reverse proxy returns HTTP 200 on all synthetic health probes.
2. **Outbox Recovery**: Confirm checkpoint_worker resumes processing outbox leaves sequentially without deadlocks.
3. **Witness Communication**: Ensure witness acknowledgements resume updating casting_db.
4. **Post Incident Review**: Convene a blameless post incident review within five working days. Archive full logs and telemetry in ops/compliance/incidents/.
