# HimVote Casting Service Documentation

## Architectural Overview
The casting service operates on an isolated casting origin strictly decoupled from the identity service.
It receives encrypted ballots accompanied by anonymous cryptographic credential proofs.
The service enforces complete voter anonymity:
* Zero student identifiers
* Zero session identifiers
* Zero cookies permitted
* Zero identity authorization headers permitted

## Threat Model and Origin Separation
To guarantee ballot secrecy and unlinkability:
* Edge gateways and security middleware reject any incoming request carrying cookies or authorization headers.
* Sensitive identity headers such as student IDs or session tokens are stripped immediately.
* Database rows in the casting cluster store zero personal data.
* Network logging strictly redacts request bodies and sensitive proof material.

## Database Models and Schema Design
The casting cluster utilizes SQLAlchemy 2 declarative models across ten tables:
* elections: Stores election metadata, status, time windows, and monotonic next_leaf_index.
* manifest_versions: Immutable frozen election manifest records.
* contests: Election contests and selection rules.
* candidates: Nominated candidate choices per contest.
* accepted_encrypted_ballots: Append only leaf log storing encrypted choices and credential nullifiers.
  * UNIQUE constraint on election_id and credential_nullifier
  * UNIQUE constraint on election_id and leaf_index
* checkpoint_outbox: Transactional outbox delivering leaf records to the checkpoint publisher worker.
  * UNIQUE constraint on election_id and leaf_index
* witness_acknowledgements: External independent witness tree size signatures.
* tally_proofs: Zero knowledge tally and decryption verification proofs.
* published_results: Certified final election outcomes.
* election_events: Append only audit log of lifecycle transitions.

## Atomic Transaction Casting Pipeline
When a client invokes POST /v1/cast/{election_id}/ballots:
1. Row Lock Acquisition: Obtains an exclusive SELECT FOR UPDATE row lock on the target election record.
2. Window and Status Verification: Confirms election status is OPEN and current UTC time falls within the allowed voting window.
3. Backlog Backpressure: Confirms that unwitnessed leaf backlog remains within configured thresholds.
4. Anonymous Credential Verification: Validates cryptographic proof and binds it to the frozen manifest digest.
5. Nullifier Lookup and Idempotency:
   * If the nullifier already exists with an identical request digest, the previous outcome is returned safely.
   * If the nullifier already exists with a different request digest, the request is rejected with HTTP 409 Conflict.
6. Leaf Insertion: Inserts ballot record into accepted_encrypted_ballots at next_leaf_index.
7. Outbox Publication: Writes canonical leaf evidence to checkpoint_outbox.
8. Sequence Increment and Commit: Advances next_leaf_index by one and commits the transaction atomically.
9. Response: Returns status COMMITTED_PENDING_WITNESS alongside an unguessable opaque receipt handle.

## Receipt Status Verification
Clients query receipt verification via GET /v1/cast/{election_id}/receipts/{handle}:
* Returns status COMMITTED_PENDING_WITNESS prior to witness aggregation.
* Returns status WITNESSED once an independent witness acknowledgement covers the assigned leaf index.
* Returns HTTP 404 if the handle is invalid or unknown.

## Verification and Testing
Execute the test suite using pytest:
```bash
pytest
```
