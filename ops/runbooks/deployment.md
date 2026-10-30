# HimVote Production Deployment Runbook

## 1. Scope and Deployment Topology

This runbook guides DevOps and Site Reliability Engineers through production deployments of HimVote across Kubernetes clusters, managed PostgreSQL instances, and Cloud KMS backends.

Production environments enforce:
* Kubernetes namespaces per trust domain (identity_plane, casting_plane, observability_plane)
* Network policies denying all cross namespace traffic by default
* Pod Security Standards set to restricted
* Non root, read only container filesystems
* Mandatory container image signature verification via Cosign
* Zero plaintext secrets in repository or environment files

___

## 2. Pre Deployment Checklist

```text
Pre Deployment Verification Items:

1. Staging Validation
   * Confirm target image digest has passed full staging test battery.
   * Verify Gate E1 cryptographic engine test passed.
   * Confirm verifier SHA256 checksum matches release manifest.

2. Database Migration Compatibility
   * Inspect pending Alembic migrations for identity_db and casting_db.
   * Verify migrations are backward compatible with current running application version.
   * Confirm zero column deletions or breaking constraints in active tables.

3. Change Freeze Notification
   * Confirm no election is currently in OPEN or CLOSING state. Live deployments during active voting are strictly forbidden.

4. On Call Staffing
   * Deployment Commander and Secondary SRE active in deployment war room.
```

___

## 3. Deployment Execution Steps

### Step 1: Database Migration Execution
Apply schema migrations against both PostgreSQL clusters using isolated migration jobs:
```bash
# Execute identity cluster migration job
python ops/scripts/run_migration_job.py identity_plane release_2026

# Execute casting cluster migration job
python ops/scripts/run_migration_job.py casting_plane release_2026
```
Monitor migration completion:
```bash
python ops/scripts/wait_for_job.py identity_plane identity_migration_release_2026
```

### Step 2: Deploy Backend Services
Update Helm release values with signed container image digests:
```bash
python ops/scripts/deploy_helm_release.py himvote_identity identity_plane production
python ops/scripts/deploy_helm_release.py himvote_casting casting_plane production
```

### Step 3: Rolling Pod Progression
Monitor rolling updates across stateless API pods:
```bash
python ops/scripts/check_rollout_status.py identity_issuer identity_plane
python ops/scripts/check_rollout_status.py casting casting_plane
```

### Step 4: Deploy Static Frontends and Background Workers
Update Next.js web application and background relayer deployments:
```bash
python ops/scripts/deploy_helm_release.py himvote_web default_plane production
python ops/scripts/deploy_helm_release.py himvote_checkpoint casting_plane production
```

___

## 4. Post Deployment Smoke Testing

1. **Health Probes**: Query `/health` on all services; ensure status 200 and database ping latency under 10 milliseconds.
2. **KMS Connectivity**: Confirm `identity_issuer` and `checkpoint_worker` successfully establish mTLS connections to Cloud KMS.
3. **Synthetic Issuance Drill**: Ingest synthetic test tenant and execute one blind credential issuance and casting cycle.
4. **Log Redaction Audit**: Scan Loki log streams for 5 minutes to confirm zero tokens, credentials, or personal identifiers appear in logs.
