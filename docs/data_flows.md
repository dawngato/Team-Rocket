# HimVote Data Flows and Architecture

## 1. System Topology and Origins

The HimVote architecture enforces an absolute separation of concern between student identity and cast ballots by deploying two physically and logically isolated origins.

```text
Student Client Application (Web, Android, iOS, Windows)
  │
  ├──► [Origin 1: Identity Gateway] (id.institution.edu / /v1/auth, /v1/roster, /v1/credentials)
  │      └── services/identity_issuer
  │            └── identity_db (PostgreSQL 16 Cluster A)
  │                  * Personal data: student IDs, department, email, password hash, MFA
  │                  * Blinded token slot: blinded_request, blind_signature_response
  │                  * No ballots, no nullifiers, no voter choices
  │
  └──► [Origin 2: Casting Gateway] (cast.institution.edu / /v1/cast)
         └── services/casting
               └── casting_db (PostgreSQL 16 Cluster B)
                     * Anonymous data: credential nullifiers, encrypted ballots, proofs
                     * Merkle log outbox and witness receipts
                     * No student IDs, no sessions, no identity cookies, no IP addresses
```

___

## 2. Core Operational Data Flows

### Flow 1: Roster Enrollment and Manifest Freeze

```text
Step 1.1: Enrollment Data Ingestion
  * Source: University Student Information System or Admin CSV upload.
  * Target: identity_db.student_profiles and identity_db.roster_members.
  * Action: Records imported with status PENDING_VERIFICATION.

Step 1.2: Verification and Department Matching
  * Actor: Department Teacher or Administrator.
  * Endpoint: POST /v1/students/{id}/verify.
  * Validation: Verifier confirms student identity and active departmental enrollment.

Step 1.3: Election Configuration and Candidate Entry
  * Actor: Election Officer.
  * Endpoint: POST /v1/admin/elections.
  * State: Election moves from DRAFT to REVIEW then APPROVED.

Step 1.4: Roster Approval and Snapshot Signing
  * Actor: Designated Roster Approver (legally distinct from roster importer).
  * Action: Approver signs canonical roster commitment digest and eligible count.
  * State: Roster snapshot persisted in identity_db.election_roster_snapshots.

Step 1.5: Manifest Freeze
  * Actor: Election Officer.
  * Action: Manifest frozen containing election ID, contest list, candidate IDs, roster digest, issuer key ID, witness public keys, auditor key fingerprint, and timing parameters.
  * State: Election state updates to FROZEN then SCHEDULED.
```

### Flow 2: Blind Credential Issuance (RFC 9474)

```text
Step 2.1: Voter Authentication
  * Actor: Student using client application.
  * Action: Authenticates via POST /v1/auth/login using Argon2id password plus MFA.
  * Outcome: Short lived authenticated session on Identity Origin.

Step 2.2: Eligibility Verification
  * Query: GET /v1/roster/me checks voter presence in frozen election roster snapshot.
  * Condition: Issuance window must be currently ISSUING.

Step 2.3: Client Blinding and Slot Reservation
  * Client: Generates random credential secret s and blinding factor r.
  * Client: Computes blinded message m_prime equals Blind(s, r) per RFC 9474.
  * Endpoint: POST /v1/credentials/issue with payload containing blinded message.

Step 2.4: Atomic Slot Reservation and Blind Signing
  * Transaction: identity_issuer inserts reservation in identity_db.credential_issuance_records.
  * Constraint: UNIQUE(election_id, student_id) ensures exactly one credential slot per voter.
  * Action: Calling reviewed RFC 9474 engine with issuer private key in KMS or HSM.
  * Storage: Persists blind signature response sig_prime with status SIGNED.
  * Response: Returns sig_prime to client application.

Step 2.5: Client Unblinding and Local Storage
  * Client: Computes unblinded credential signature sig equals Unblind(sig_prime, r).
  * Client: Derives credential nullifier and stores token in secure client storage (Keychain, Keystore, DPAPI).
  * Status: Voter client transitions state to CREDENTIAL_ACQUIRED.
  * Temporal Rule: Issuance window closes (ISSUANCE_CLOSED) before casting opens.
```

### Flow 3: Ballot Casting and Atomic Persistence

```text
Step 3.1: Ballot Composition and Encryption
  * Client: Voter selects candidates within engine booth.
  * Engine: Profile VEEM encrypts ballot using threshold ElGamal public key.
  * Proofs: Engine generates non interactive zero knowledge proofs of selection validity.

Step 3.2: Submission to Casting Origin
  * Origin: Requests directed to Casting Gateway on separate origin.
  * Edge Proxy: Nginx reverse proxy strips identity cookies, Authorization headers, and trace IDs.
  * Endpoint: POST /v1/cast/{election_id}/ballots.
  * Payload: Canonical ballot evidence record containing credential proof, engine ballot, proofs, and nullifier.

Step 3.3: Pre Transaction Validation
  * Schema: Validates schema strictly per himvote.ballot_evidence.v1.
  * Cryptography: Mathematically verifies zero knowledge selection proofs and blind credential proof.
  * Election Binding: Confirms credential binds to matching manifest digest.

Step 3.4: Atomic Cast Transaction
  * Lock: Transaction acquires exclusive row lock on election state row.
  * State Check: Verifies election state is OPEN and database UTC clock is within window.
  * Nullifier Check: Scans casting_db.accepted_encrypted_ballots for credential_nullifier.
      * If identical request exists: returns earlier outcome idempotently.
      * If nullifier exists with different payload: transaction aborts with DUPLICATE_SUBMISSION.
  * Leaf Allocation: Assigns leaf_index equal to current next_leaf_index.
  * Ballot Insert: Inserts accepted ballot record.
  * Outbox Insert: Inserts row into casting_db.checkpoint_outbox.
  * Increment: Increments next_leaf_index by one.
  * Commit: Transaction commits.

Step 3.5: Client Receipt State
  * Response: Casting service returns status COMMITTED_PENDING_WITNESS and tracking handle.
```

### Flow 4: Merkle Tree Construction and Witness Checkpointing

```text
Step 4.1: Outbox Polling by Checkpoint Worker
  * Worker: services/checkpoint_worker polls casting_db.checkpoint_outbox in leaf index order.
  * Sequencing: Processes leaves sequentially without gaps.

Step 4.2: Merkle Tree Hash Computation (RFC 9162)
  * Leaf Hash: SHA256(0x00 || canonical_leaf_bytes).
  * Node Hash: SHA256(0x01 || left_node_hash || right_node_hash).
  * Checkpoint Payload: himvote.checkpoint.v1 structure including tree size and Merkle root.

Step 4.3: Witness Checkpoint Cosigning
  * Network: Worker submits POST /checkpoints to independent external witness nodes.
  * Witness Verification: Witness validates election ID, manifest digest, pinned writer key, monotonic tree growth, and consistency proofs.
  * Witness Storage: Witness records checkpoint in its independent append only storage.
  * Signature: Witness signs canonical checkpoint bytes using private key in external HSM.
  * Receipt: Worker stores witness signature in casting_db.witness_acknowledgements.

Step 4.4: Client Receipt Status Update
  * Polling: Client polls receipt endpoint using tracking handle.
  * State: Status transitions from COMMITTED_PENDING_WITNESS to WITNESSED upon receipt confirmation.
```

### Flow 5: Consortium Blockchain Commitment Anchoring

```text
Step 5.1: Anchor Outbox Collection
  * Worker: services/anchor_relayer identifies witnessed checkpoints awaiting on chain anchor.

Step 5.2: Smart Contract Transaction Submission
  * Target: Contract HimVoteAnchor.sol on EVM network.
  * Method: anchorCheckpoint(electionCommitment, sequence, digest, previousDigest, isFinal).
  * Relayer: Signs transaction using dedicated relayer KMS key.

Step 5.3: On Chain Validation
  * Checks: Contract verifies msg.sender has RELAYER_ROLE, sequence matches previous plus one, and previous digest matches recorded state.
  * Immutability: Rejects modifications once isFinal is set.
  * Event: Emits CheckpointAnchored event.

Step 5.4: Finality Confirmation and State Advancement
  * Monitoring: Relayer monitors block confirmations until threshold is achieved.
  * State: Casting database updates checkpoint status to ANCHOR_FINALIZED.
```

### Flow 6: Offline Audit, Verifier Execution, and Publication

```text
Step 6.1: Election Closing
  * Trigger: Election Officer calls close endpoint or scheduled close time arrives.
  * Lock: Acquires row lock, sets state to CLOSING, fixes final_tree_size equal to next_leaf_index.
  * Final Witness: Checkpoint worker requests FINAL checkpoint from independent witness.
  * Final Anchor: Anchor relayer submits final anchor to blockchain.

Step 6.2: Complete Evidence Package Export
  * Export: Service exports public audit archive containing canonical ballot records, Merkle tree structure, witness checkpoints, and tally proofs.
  * Exclusions: Export contains zero personal data, zero sessions, zero student IDs.

Step 6.3: Independent Auditor Verification
  * Environment: Auditor runs standalone Python verifier CLI on an air gapped or offline workstation.
  * Input: Auditor inputs export directory, pinned trust certificates, witness final checkpoint, and chain pins.
  * Verification Steps:
      1. Validates manifest, roster approval, and issuance closure signatures.
      2. Recomputes Merkle log root from leaf 0 to N minus 1 and checks against witness final.
      3. Verifies blind credential zero knowledge proofs and nullifier uniqueness.
      4. Executes engine tally verification against encrypted ballots and homomorphic sum.
      5. Verifies blockchain receipt and canonical block finality.
  * Output: Emits deterministic audit report with SHA256 hashes and exit code 0.

Step 6.4: Auditor Attestation and Result Publication
  * Attestation: Auditor signs audit report using independent private key.
  * Upload: Signed attestation uploaded to Admin API.
  * Publication Gate: admin_api verifies auditor signature against pinned auditor key.
  * Publication: Election state advances to PUBLISHED. Tally results become visible to public observers.
```
