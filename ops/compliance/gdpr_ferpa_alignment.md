# HimVote Compliance Architecture: GDPR and FERPA Alignment

## 1. Global Educational Regulatory Alignment

Universities and collegiate institutions frequently enroll international students, operate exchange programs, or maintain international academic partnerships. HimVote is architected to satisfy both the European Union General Data Protection Regulation (GDPR) and the United States Family Educational Rights and Privacy Act (FERPA).

___

## 2. General Data Protection Regulation (GDPR) Alignment

### 2.1 Processing of Special Category Personal Data (Article 9)
* **Regulatory Context**: Article 9(1) of GDPR strictly prohibits the processing of personal data revealing political opinions, trade union membership, or philosophical beliefs, unless specific exemptions under Article 9(2) apply.
* **HimVote Solution**:
  * In HimVote, individual voting choices are NEVER processed as personal data linked to an identified or identifiable natural person.
  * The RFC 9474 blind signature protocol mathematically decouples voter identity from the cast ballot. The casting database and Merkle log contain only encrypted ciphertext and zero knowledge proofs with zero student identifiers.
  * Consequently, the cast ballot records do not constitute personal data under Article 4(1) of GDPR because the data cannot be attributed to a specific data subject without impossible computational effort.

### 2.2 Core GDPR Principles Mapping (Article 5)

```text
GDPR Principle Implementation:

1. Lawfulness, Fairness, and Transparency (Art. 5(1)(a))
   * Processing is grounded on Article 6(1)(e) (public interest / official institutional task) or Article 6(1)(a) (explicit consent). Privacy notices are presented in clear, accessible language.

2. Purpose Limitation (Art. 5(1)(b))
   * Student enrollment data is used solely for voter eligibility verification and credential issuance. Re use for administrative tracking, commercial marketing, or student disciplinary monitoring is structurally prohibited.

3. Data Minimisation (Art. 5(1)(c))
   * The identity service collects only data points strictly necessary for eligibility: Student ID, Department, Campus, Institutional Email, and Enrollment Status.

4. Accuracy (Art. 5(1)(d))
   * Roster snapshots must be reviewed and certified by a designated Roster Approver before manifest freeze. Discrepancies can be corrected during the verification phase.

5. Storage Limitation (Art. 5(1)(e))
   * Identity records are subject to strict deletion upon student graduation per the retention schedule.

6. Integrity and Confidentiality (Art. 5(1)(f))
   * Enforced via dual database isolation, KMS encryption at rest, TLS 1.3 in transit, and mTLS between backend microservices.
```

___

## 3. Family Educational Rights and Privacy Act (FERPA) Alignment

FERPA (34 CFR Part 99) protects the privacy of student education records in institutions receiving funds under applicable US Department of Education programs.

```text
FERPA Key Requirements and Technical Safeguards:

1. Protection of Personally Identifiable Information (PII) (34 CFR § 99.3)
   * Student voting status and election eligibility records are classified as protected education records.
   * Access to identity_db is restricted to authorized school officials with legitimate educational interests (e.g. appointed Election Officers and Department Chairs).

2. Directory Information Opt Out (34 CFR § 99.37)
   * If a student exercises their FERPA right to withhold directory information, the system respects this privacy flag. The student remains fully eligible to vote, but their name is suppressed from any public candidate or voter rosters.

3. Prohibition of Unauthorized Disclosure (34 CFR § 99.30)
   * HimVote exports contain zero student identifiers. Public audit packages contain only cryptographic leaves, zero knowledge proofs, and aggregated tallies. Third party observers and public auditors cannot extract student PII from election exports.

4. Recordkeeping of Disclosure Requests (34 CFR § 99.32)
   * The identity cluster maintains an immutable audit trail in admin_audit_events logging every administrative query, import, or verification of student records.
```
