# HimVote Voter Dispute Handling and Audit Classification Runbook

## 1. Principles and Voter Privacy Protections

Institutional election legitimacy requires an accessible, mathematically rigorous dispute resolution procedure. Any voter who questions whether their ballot was properly recorded and counted must have a formal mechanism to seek independent verification.

```text
Voter Protection Directives:

* Secrecy Absolute Rule: Support engineers, election officers, and auditors must NEVER request or permit a voter to reveal their candidate selections or secret credential tokens.
* Blind Support: All dispute inquiries are conducted strictly using the anonymous tracking handle issued upon ballot submission.
* Standardized Communication: Support staff must utilize only approved canned communication templates to prevent inadvertent disclosure or coercion.
```

___

## 2. Auditor Dispute Classification Framework

When a voter presents a tracking handle for dispute verification, the Independent Auditor runs the forensic inquiry tool against the casting database, witness logs, and final audit archive. The tracker is categorized into exactly one of five states:

```text
Dispute Classification Categories:

1. FINAL_INCLUDED (Normal Valid State)
   * Finding: The tracking handle corresponds to an accepted leaf index present in the final Merkle tree.
   * Evidence: The auditor produces a canonical RFC 9162 Merkle inclusion proof linking the leaf hash to the anchored final root.
   * Outcome: Dispute resolved. Voter is provided with mathematical inclusion proof.

2. COMMITTED_PENDING_WITNESS (Transient State)
   * Finding: The ballot was committed to casting_db, but the checkpoint worker has not yet received a signed witness acknowledgement.
   * Evidence: Outbox row exists with status PENDING.
   * Outcome: Normal during active voting traffic. Voter advised to refresh verification status after outbox batch processing.

3. NEVER_COMMITTED (Client Side Dropout)
   * Finding: The tracking handle does not exist in casting_db, outbox, or witness logs.
   * Cause: Network interruption occurred between voter device and reverse proxy before atomic database commit.
   * Outcome: The ballot was never received or accepted by the platform. If the election window remains OPEN, the voter is advised to submit their ballot again.

4. WITNESSED_MISSING_FROM_FINAL (Critical Integrity Violation)
   * Finding: The ballot leaf was acknowledged in an incremental witness checkpoint, but is absent from the exported final Merkle tree or tally.
   * Severity: Critical Severity 1 Security Incident.
   * Mandatory Action: Publication of election results is IMMEDIATELY AND PERMANENTLY BLOCKED. The election state transitions to DISPUTED. A formal election commission investigation is convened.

5. UNDETERMINED (Malformed Query)
   * Finding: The supplied tracking handle is malformed, corrupted, or associated with a different election identifier.
   * Outcome: Voter requested to verify the tracking handle string and resubmit inquiry.
```

___

## 3. Step by Step Auditor Investigation Procedure

### Step 1: Ingest Voter Dispute Inquiry
The voter submits their anonymous tracking handle through the independent auditor portal or physical inquiry desk.

### Step 2: Execute Cryptographic Audit Query
The auditor executes the verification CLI in dispute inquiry mode:
```bash
python verifier/verify.py audit_dispute tracking_handle external_trust_pins
```

### Step 3: Evaluate Forensic Output
* If output is `FINAL_INCLUDED`: The CLI outputs the canonical Merkle audit path and leaf index.
* If output is `WITNESSED_MISSING_FROM_FINAL`: The CLI outputs cryptographic proof of witness acknowledgement alongside proof of absence from final root.

### Step 4: Issue Formal Determination
The auditor issues a signed determination certificate. If any credible `WITNESSED_MISSING_FROM_FINAL` finding is confirmed:
```bash
# Emergency publication freeze
python ops/scripts/freeze_publication_dispute.py election_id
```

___

## 4. Voter Support Communication Templates

### Template A: Ballot Successfully Included in Final Tally
```text
Dear Student,

Your ballot tracking inquiry for Election [Election Name] has been verified by the Independent Auditor.

Status: FINAL_INCLUDED
Leaf Index: [Leaf Index Number]
Merkle Root Confirmation: Verified against blockchain anchor transaction [Transaction Hash].

Your encrypted ballot was successfully committed, verified by independent witnesses, and included in the final certified tally. In accordance with ballot secrecy laws, no one (including university administrators) can observe your candidate choices.

Thank you for participating.
```

### Template B: Ballot Not Received (Never Committed)
```text
Dear Student,

Your ballot tracking inquiry for Election [Election Name] has been processed.

Status: NEVER_COMMITTED

Our records indicate that this ballot submission did not complete successfully, likely due to a network interruption prior to server confirmation. No ballot associated with this tracker was committed to the voting register.

If voting is currently open, please log into the HimVote portal and submit your ballot again. If voting has closed, please contact the Institutional Election Office for guidance.

Please remember: Never share your candidate choices or student password with support personnel.
```
