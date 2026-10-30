# HimVote Election Cancellation and Voiding Runbook

## 1. Principles Governing Election Cancellation

Under university statutes and HimVote cryptographic rules, an election that has opened or accepted ballots can NEVER be deleted, erased, or silently reopened.

```text
Fundamental Cancellation Rules:

1. Evidence Retention: Cancelling an election DOES NOT delete database rows, Merkle leaves, or witness records. All committed data is permanently preserved for forensic inspection.
2. Signed Reason Requirement: Cancellation requires a formal cancellation order signed by the Institutional Election Authority with a documented statutory justification.
3. Irrevocable State: Once marked CANCELLED, an election ID can never be transitioned back to OPEN or PUBLISHED. Any subsequent election requires a brand new manifest and new election ID.
```

___

## 2. Valid Statutory Grounds for Cancellation

* Irremediable compromise of the Credential Issuer Key during active issuance.
* Confirmation of systemic student roster fraud or unauthorized post freeze roster alterations.
* Severe physical or infrastructure disaster rendering independent verification permanently unachievable.
* Formal court injunction or institutional governance directive mandating voiding of the contest.

___

## 3. Step by Step Cancellation Procedure

### Step 1: Formal Authorization
Obtain written and cryptographically signed authorization from the University Election Officer and Legal Counsel.

### Step 2: Ingest Cancellation Order into Admin API
Execute the formal cancellation transaction:
```bash
python ops/scripts/submit_election_cancellation.py \
  election_id \
  cancellation_order_document.pdf \
  authority_digital_signature
```

### Step 3: Server Side State Transition
The Admin API executes the atomic cancellation sequence:
* Acquires exclusive lock on election state row.
* Transitions state to `CANCELLED`.
* Persists signed cancellation reason in `casting_db.election_events` and `identity_db.admin_audit_events`.
* Checkpoint worker issues a final CANCELLED checkpoint to independent witness nodes and anchor relayer.

### Step 4: Public Notification
The HimVote public portal displays a permanent official announcement:
* Election Status: CANCELLED
* Cancellation Timestamp
* Cryptographic Digest of Cancellation Order
* Link to public audit archive preserving all ballots accepted prior to cancellation.
