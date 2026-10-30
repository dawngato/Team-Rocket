# HimVote Compliance Architecture: Digital Personal Data Protection Act (DPDPA) 2023

## 1. Statutory Framework and Application

The Digital Personal Data Protection Act 2023 (DPDPA 2023) governs the processing of digital personal data within the Republic of India. When deployed by Indian universities, colleges, and educational institutes, HimVote processes digital personal data belonging to enrolled students, faculty members, and institutional administrators.

```text
Statutory Classification under DPDPA 2023:

* Data Fiduciary: The University or College Senate / Governing Board determining the purpose and means of processing personal data for student governance elections.
* Data Processor: Cloud infrastructure providers (AWS, Google Cloud) and managed service vendors hosting HimVote container workloads on behalf of the institution.
* Data Principal: The natural person to whom personal data relates, encompassing enrolled students, teachers, and staff members.
* Significant Data Fiduciary Status: Evaluated based on voter volume, sensitivity of institutional elections, and potential risk to student democratic rights.
```

___

## 2. Lawful Basis and Consent Framework (Sections 4, 5, and 6)

Processing of personal data within HimVote is grounded upon:
1. **Explicit Affirmative Consent (Section 6)**: Prior to initial account activation or blind credential issuance, students receive a clear, granular notice specifying:
   * The precise personal data items processed (name, institutional enrollment number, department, university email).
   * The exact purpose of processing (verifying eligibility for student body elections).
   * The technical mechanism ensuring that voting choices are cryptographically decoupled from personal identity via blind signatures.
2. **Institutional Legitimate Uses (Section 7)**: Processing necessary for fulfilling statutory university governance mandates and maintaining institutional student rolls.
3. **Consent Withdrawal**: Data Principals may withdraw consent for optional communications. Withdrawing consent for roster inclusion removes the student from future voter snapshots, while preserving historical audit logs required by law.

___

## 3. Data Principal Rights and Institutional Execution

```text
Fulfillment of Data Principal Rights:

1. Right to Access Information (Section 11)
   * Students can access a complete summary of their personal data and identity audit events through the self service portal endpoint GET /v1/roster/me.

2. Right to Correction and Updating (Section 12)
   * Inaccurate student records (e.g. departmental transfer, name correction) can be submitted for review via department teachers. Updates generate append only audit events in identity_db.

3. Right to Erasure (Section 12)
   * Upon formal withdrawal or graduation, student profile records in identity_db are deleted according to the institutional retention schedule.
   * Cryptographic Immutability Exception: Mathematical Merkle tree leaves and blockchain commitments cannot be altered or erased because they contain zero personal data and zero student identifiers.

4. Right of Grievance Redressal (Section 13)
   * The institution designates an Institutional Data Protection Officer (DPO). The portal provides an integrated grievance submission mechanism with mandatory resolution within 7 working days.
```

___

## 4. Protection of Young Students and Minor Voters (Section 9)

In collegiate institutions admitting students aged 17 (minors under Indian law):
* Verification workflows integrate verified institutional student ID records obtained through the university admission registry.
* The platform strictly prohibits behavioral monitoring, tracking cookies, targeted student advertisements, or profiling of minor voters.
* Identity database schemas isolate student date of birth records and restrict access via row level security.

___

## 5. Technical and Organizational Safeguards (Section 8)

To satisfy Section 8 obligations requiring reasonable security safeguards:
* **Dual Origin Boundary**: Casting origins strip all personal headers and cookies, preventing correlation.
* **Storage Encryption**: All databases encrypted at rest using AES 256 GCM with keys managed in Cloud KMS.
* **Audit Logging**: All administrative access to personal identity records is logged in append only tables with immutable PostgreSQL triggers.
* **Regular Audits**: Annual data protection audits conducted by independent CERT In empanelled auditing firms.
