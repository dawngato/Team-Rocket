# Database Migrations Architecture

This directory contains Alembic migration suites for the two independent database clusters.

## Clusters
* identity: Manages user accounts, institutional rosters, authentication credentials, and blind issuance records.
* casting: Manages election manifests, contests, candidates, immutable encrypted ballots, Merkle outbox, and witness proofs.

## Running Migrations
Run migrations for the identity cluster:
```bash
cd infrastructure/migrations/identity
alembic upgrade head
```

Run migrations for the casting cluster:
```bash
cd infrastructure/migrations/casting
alembic upgrade head
```
