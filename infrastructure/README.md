# HimVote Infrastructure Deployment Runbook

## 1. Overview and Core Architectural Principles

HimVote is a production grade institutional election platform designed for universities and colleges.
The infrastructure enforces hard physical and logical boundaries between identity management and ballot casting.

### Fundamental Security Rules
* Zero identity linkage: Student identity records and cast ballots reside in completely separate PostgreSQL 16 database clusters with distinct credentials, isolated networks, dedicated encryption keys, and independent backup pipelines.
* No table, log entry, trace, or database export ever joins a student identity to a cast ballot.
* Dual public origins: Nginx edge gateway enforces two isolated origins, namely the identity origin and the casting origin.
* Casting route header sanitization: On all casting endpoints, the edge gateway unconditionally strips all cookies, authorization headers, client identification headers, and distributed tracing headers.
* Request body logging suppression: Logging of ballot payloads is strictly disabled at the edge and application layers.
* Merkle log integrity: Ballots are committed sequentially into an append only Merkle tree verified by independent witnesses and anchored to an immutable blockchain.

## 2. Network Topology and Origin Separation

The infrastructure defines three isolated network zones:
* Edge Zone: Houses public ingress, TLS termination, rate limiting, and web frontend services.
* Identity Zone: Houses identity issuer, roster administration, user authentication, session stores, and identity database.
* Casting Zone: Houses ballot casting intake, election engine verification, checkpoint worker, witness clients, anchor relayer, and casting database.

Network policies strictly prohibit any cross cluster or cross domain traffic between the identity zone and the casting zone.

## 3. Local Development Deployment via Docker Compose

### Prerequisites
* Docker Engine 24 or later
* Docker Compose v2

### Quickstart Execution
To start all services for local development:
```bash
docker compose up
```

To incorporate development overrides including live code mounting:
```bash
docker compose up
```

### Services Initialized
* gateway: Nginx reverse proxy serving port 8080 with dual origin routing
* web: Next.js institutional web interface
* admin_api: Administrative management and election orchestration service
* identity_issuer: Authentication and blind credential issuing service
* casting: Anonymous ballot acceptance service
* election_engine: Ballot verification and cryptographic tally adapter
* checkpoint_worker: Merkle log sequencing daemon
* witness: Cryptographic checkpoint witnessing service
* anchor_relayer: Blockchain anchor publisher
* chain_node: Local EVM development node running Anvil
* identity_db: Dedicated PostgreSQL 16 database for identity records
* casting_db: Dedicated PostgreSQL 16 database for casting records
* redis: High speed caching and ephemeral session management

## 4. Production Cloud Provisioning via Terraform

Terraform modules are provided for both Amazon Web Services and Google Cloud Platform.

### AWS Architecture Highlights
* Two isolated Virtual Private Clouds with no peering connection between them
* Amazon RDS PostgreSQL 16 Multi AZ instances with SCRAM SHA 256 authentication
* Dedicated AWS KMS keys with automatic annual rotation for identity storage, casting storage, blind signing, witness signing, and relayer transactions
* AWS WAFv2 Web ACL with rate limiting and AWS Managed Core Rules
* Amazon S3 backup buckets with Object Lock Write Once Read Many protection

### GCP Architecture Highlights
* Two isolated Virtual Private Clouds with Private Service Connect
* Google Cloud SQL PostgreSQL 16 High Availability instances encrypted with Customer Managed Encryption Keys
* Google Cloud KMS KeyRings for identity and casting domains
* Google Cloud Armor security policies protecting against denial of service and injection attacks
* Google Cloud Storage buckets with locked retention policies

### Provisioning Steps
Navigate to the terraform directory:
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## 5. Kubernetes Production Deployment via Helm

Production workloads are orchestrated using Kubernetes with Pod Security Standards set to restricted across all namespaces.

### Namespaces Provisioned
* himvote_edge: Gateway ingress and web presentation layer
* himvote_identity: Identity issuer and admin services
* himvote_casting: Casting intake, Merkle workers, witness, and relayer

### Pod Security Standards Restricted Enforcement
All pods execute under strict security contexts:
* Non root execution enforced
* Root filesystem mounted read only
* Privilege escalation disabled
* All Linux capabilities dropped
* RuntimeDefault seccomp profile applied

### Helm Deployment Command
Deploy the production chart using Helm:
```bash
helm install himvote infrastructure/kubernetes
```

### Applying Production Values
```bash
helm upgrade himvote infrastructure/kubernetes
```

## 6. Database Migrations Workflow via Alembic

Database migrations for both independent database clusters are managed using Alembic.

### Identity Cluster Migrations
To inspect or upgrade identity database schema:
```bash
cd infrastructure/migrations/identity
alembic upgrade head
```

Tables managed within identity cluster:
* tenants, campuses, departments, staff_profiles, student_profiles, users
* role_definitions, permissions, role_assignments, invitations
* approval_requests, approval_decisions, enrollment_sources, student_verifications
* sessions, mfa_credentials, recovery_requests
* admin_audit_events with immutable append only triggers
* election_roster_snapshots, roster_members, credential_issuance_records, issuance_events

### Casting Cluster Migrations
To inspect or upgrade casting database schema:
```bash
cd infrastructure/migrations/casting
alembic upgrade head
```

Tables managed within casting cluster:
* elections, manifest_versions, contests, candidates
* accepted_encrypted_ballots with immutable triggers blocking updates and deletes
* checkpoint_outbox, witness_acknowledgements, tally_proofs, published_results, election_events

## 7. Disaster Recovery and Database Reconciliation

### Integrity Verification Post Restore
In the event of database restoration from a backup snapshot:
* The restored casting database must never be opened directly for live voting.
* The checkpoint worker must first query the independent witness to retrieve the latest signed checkpoint.
* The anchor relayer must verify the latest on chain transaction receipt and block hash.
* If the restored database leaf index lags behind the witnessed tree size, the system marks the election status as DISPUTED.
* Administrators must run the verifier CLI against the independent witness record before resuming election operations.

## 8. Operational Security Checklist Prior to Election Opening

* Confirm Gate E1 voting engine validation passed and signed off.
* Verify independent witness endpoints are running outside institutional infrastructure.
* Ensure BOOTSTRAP_ALLOWED environment variable is set to false across all instances.
* Validate SSL certificate validity and TLS 1.3 protocol enforcement.
* Audit edge gateway access logs to ensure zero voter IP or body leakage.
