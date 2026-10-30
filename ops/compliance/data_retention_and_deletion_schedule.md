# HimVote Data Retention, Archival, and Deletion Schedule

## 1. Statutory and Operational Purpose

This schedule establishes clear retention periods, archival rules, and deletion procedures for all digital records processed across HimVote environments. The policy complies with DPDPA 2023, the Information Technology Act 2000, GDPR Article 5(1)(e), and CERT In cybersecurity directives.

```text
Core Retention Directives:

1. Storage Limitation: Personal data in identity_db must not be retained longer than necessary to fulfill institutional election purposes.
2. Permanent Audit Preservation: Cryptographic proof archives, Merkle tree logs, and witness receipts contain zero personal data and are preserved permanently to maintain institutional democratic records.
3. Secure Destruction: Data deletion executes through cryptographic erasure or secure database purging.
```

___

## 2. Comprehensive Data Retention Schedule

```text
Schedule Matrix:

Record Category 1: Student Identity Profiles and Authentication Records
  * Contents: Name, Student ID, Institutional Email, Department, Password hash, MFA seeds
  * Storage Location: identity_db (PostgreSQL 16)
  * Retention Period: Duration of active student enrollment plus 90 days post graduation or formal withdrawal
  * Deletion Method: Database cascade deletion followed by WAL zeroing

Record Category 2: Active User Sessions and MFA Challenge Tokens
  * Contents: JWT session identifiers, TOTP verification nonces
  * Storage Location: Redis cache and identity_db.sessions
  * Retention Period: Maximum 15 minutes for access tokens; 7 days for refresh tokens
  * Deletion Method: Automated Redis TTL expiration

Record Category 3: Roster Snapshots and Eligibility Attestations
  * Contents: Signed roster commitment, department rosters, eligible student counts
  * Storage Location: identity_db.election_roster_snapshots
  * Retention Period: 1 calendar year following official election publication (statutory election dispute window)
  * Deletion Method: Archived to encrypted offline storage; purged from operational cluster

Record Category 4: Blind Credential Issuance Records
  * Contents: Blinded request bytes, reservation state, blind signature responses
  * Storage Location: identity_db.credential_issuance_records
  * Retention Period: 180 days following election publication (CERT In log retention mandate)
  * Deletion Method: Cryptographic table truncation with multi pass overwriting

Record Category 5: Administrative Audit Events (admin_audit_events)
  * Contents: Timestamped record of administrative grants, role requests, freeze events, approvals
  * Storage Location: identity_db.admin_audit_events and write once S3 audit storage
  * Retention Period: 3 calendar years
  * Deletion Method: Automatic S3 lifecycle rule transition to deep archive, then purge

Record Category 6: Encrypted Ballots and Merkle Tree Outbox
  * Contents: Canonical ballot evidence records, credential nullifiers, leaf hashes
  * Storage Location: casting_db (PostgreSQL 16) and public export archive
  * Retention Period: Permanent preservation (Zero personal data present)
  * Rationale: Required for permanent institutional verification and historical auditability

Record Category 7: Database Backup Snapshots and Continuous WAL
  * Contents: Encrypted PostgreSQL disk snapshots and transaction journals
  * Storage Location: AWS S3 with Object Lock in Compliance Mode
  * Retention Period: 365 days rolling window
  * Deletion Method: S3 Object Lock expiration and automatic cryptographic deletion
```

___

## 3. Secure Deletion and Sanitization Procedures

* **PostgreSQL Row Deletion**: Standard SQL `DELETE` queries mark tuples dead. Regular vacuuming (`VACUUM FULL`) and database cluster recreation ensure storage blocks are scrubbed.
* **Cryptographic Erasure**: Where storage media cannot be physically zeroed, the associated Cloud KMS encryption key is scheduled for destruction, rendering all ciphertext permanently unrecoverable.
* **Annual Verification Audit**: The Data Protection Officer inspects deletion logs annually to certify compliance with this schedule.
