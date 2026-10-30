# Architecture Decision Record 002: Dual Database Architecture and Origin Separation

## Status
Accepted

## Date
2026_10_30

## Context
A critical failure mode of electronic voting systems is voter deanonymization resulting from database join queries, transaction logging correlation, or shared database administrator access. If student identity records (names, student IDs, departments, emails) reside in the same physical database cluster or schema as cast ballots or nullifiers, malicious administrators or compromised credentials could correlate voters with their political choices.

Furthermore, shared network endpoints and shared session cookies allow edge proxies and web application firewalls to correlate user session tokens with ballot submission requests.

## Decision
We enforce a strict physical and logical dual database architecture with two independent origins:

```text
Topology Separation:

1. Identity Cluster (identity_db)
   * Domain: id.institution.edu
   * Routing: services/identity_issuer and services/admin_api
   * Schema: Student profiles, departments, user credentials, MFA, blinded credential slots, administrative audit logs
   * Prohibition: Holds zero ballots, zero nullifiers, zero vote choices

2. Casting Cluster (casting_db)
   * Domain: cast.institution.edu
   * Routing: services/casting and services/checkpoint_worker
   * Schema: Encrypted ballots, credential nullifiers, Merkle log outbox, witness receipts, tally proofs
   * Prohibition: Holds zero student IDs, zero user sessions, zero personal data

3. Edge Proxy Rules
   * Nginx reverse proxy routes casting traffic to an isolated upstream network.
   * Reverse proxy automatically strips Authorization headers, session cookies, and client IP addresses on casting endpoints.
   * Logging of request and response bodies on the casting route is permanently disabled.
```

## Consequences

### Positive Consequences
* Structural impossibility of executing SQL join queries between student identities and cast ballots.
* Separate database administrator accounts, network policies, backup storage buckets, and KMS encryption keys for identity and casting.
* Compromise of identity database credentials exposes zero voting records.
* Compromise of casting database credentials exposes zero student personal information.

### Negative Consequences and Mitigations
* Increased infrastructure operational cost from maintaining two independent PostgreSQL clusters. Justified by high stakes institutional privacy requirements.
* Inability to query voter participation status directly from the casting database. Mitigated by tracking credential issuance status in identity_db without recording if or when the unblinded credential was cast.
