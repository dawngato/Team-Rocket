# HimVote Threat Model and Security Architecture

## 1. System Overview

HimVote is an institutional election platform engineered for universities and collegiate institutions. The platform delivers verifiable elections while protecting individual voter privacy and preventing administrative tampering. The system operates across distributed trust boundaries encompassing voter client applications, an identity issuer origin, an anonymous casting origin, independent multi organization witness services, a consortium blockchain anchor, and offline auditor verifiers.

The architecture enforces strict separation between identity data and voting records. Personal identity data and cast ballots are stored in physically isolated database clusters operated with distinct credentials, encryption keys, network routes, and operational personnel.

___

## 2. Trust Domains and System Boundaries

```text
Trust Domain A: Identity and Enrollment
  * Services: identity_issuer, admin_api
  * Storage: identity_db (PostgreSQL 16)
  * Responsibility: Student authentication, roster verification, RFC 9474 blind signature issuance
  * Boundaries: Strict network isolation, no access to casting storage, no visibility into cast ballots

Trust Domain B: Anonymous Casting and Merkle Logging
  * Services: casting, checkpoint_worker, election_engine
  * Storage: casting_db (PostgreSQL 16)
  * Responsibility: Credential validation, nullifier recording, ballot acceptance, RFC 9162 Merkle tree construction
  * Boundaries: No student identity knowledge, rejects identity cookies and authorization tokens

Trust Domain C: Independent Witness Operators
  * Services: witness service
  * Storage: Append only witness log store
  * Responsibility: Monotonic tree size verification, checkpoint cosigning, anti truncation enforcement
  * Boundaries: Deployed outside university administrative control in a separate legal entity

Trust Domain D: Public Ledger and Consensus
  * Services: HimVoteAnchor smart contract, anchor_relayer
  * Network: Public EVM or consortium blockchain
  * Responsibility: Immutable commitment storage, sequence verification, finality publication
  * Boundaries: Holds zero plaintext ballots, zero trackers, zero nullifiers, zero personal data

Trust Domain E: Independent Audit and Verification
  * Services: Standalone verifier CLI (Python)
  * Responsibility: Offline mathematical verification of cryptographic proofs, Merkle consistency, and tally correctness
  * Boundaries: Operates in air gapped or offline workstation environments using pinned out of band trust anchors
```

___

## 3. Threat Actors and Motivation Profiles

* **Malicious Voter or Student**:
  * Motivation: Cast multiple ballots, vote for unauthorized candidates, forge credentials, disrupt election.
  * Capabilities: Client app reverse engineering, API parameter tampering, concurrent requests, network replay.

* **Compromised University Administrator or Election Officer**:
  * Motivation: Alter election outcomes, favor specific candidates, deanonymize political choices, manipulate rosters.
  * Capabilities: Administrative privileges, roster modification attempts, access to identity database.

* **Malicious Database Administrator or Host Infrastructure Operator**:
  * Motivation: Read ballots, inject rows directly into database tables, modify tally records, delete leaves.
  * Capabilities: Direct SQL shell access, physical file system access, snapshot manipulation.

* **Network Adversary and Man in the Middle**:
  * Motivation: Eavesdrop voter choices, correlate network timing between identity and casting endpoints, block submissions.
  * Capabilities: Packet inspection on local WiFi, ISP transit interception, timing analysis.

* **Compromised Voter Device or Endpoint**:
  * Motivation: Steal credentials, alter vote selection prior to encryption, exfiltrate private tokens.
  * Capabilities: Keylogger, screen capture malware, altered client binary.

* **Rogue Witness or Colluding Relayer**:
  * Motivation: Equivocate by signing conflicting tree states, suppress checkpoints, delay blockchain anchoring.
  * Capabilities: Witness private key compromise, chain transaction front running.

___

## 4. Threat Matrix and Technical Mitigations

### 4.1 Duplicate Credential Submission and Replay Attacks (Threat T1)
* **Attack Mechanism**: A voter attempts to cast multiple ballots concurrently or sequentially using one credential across Web, Android, iOS, and Windows clients.
* **Mitigation**:
  * The casting service computes a cryptographic nullifier derived from the unblinded credential secret.
  * An immutable unique constraint `UNIQUE(election_id, credential_nullifier)` is enforced in the casting database.
  * The cast transaction acquires an exclusive row lock on the election state record, checks state `OPEN`, and inserts the nullifier and ballot row atomically.
  * Replayed requests with identical payloads return the cached outcome idempotently. Requests with identical nullifiers but different ballot contents are rejected.
* **Verification Proof**: Security test Q7_01 confirms that 100 concurrent requests across multiple client platforms produce exactly one committed leaf and one nullifier.

### 4.2 Unauthorized Ballot Insertion and Credential Forgery (Threat T2)
* **Attack Mechanism**: An attacker submits a ballot with a forged cryptographic credential, a credential for a different election, or attempts direct SQL insertion into the casting database.
* **Mitigation**:
  * Blind credentials use RFC 9474 RSA blind signatures signed by the election issuer key held in an HSM or KMS.
  * The casting engine mathematically verifies the blind signature proof against the pinned election issuer public key before opening any transaction.
  * Database user privileges for the casting role restrict write access exclusively to a single stored function. Direct `UPDATE` and `DELETE` queries are revoked with immutable trigger exceptions.
* **Verification Proof**: Security test Q7_02 confirms that forged credentials, wrong election identifiers, and direct write attempts are unconditionally rejected.

### 4.3 Log Truncation, Leaf Deletion, and Rollback (Threat T3)
* **Attack Mechanism**: A malicious operator deletes accepted ballots from the database, presents a truncated log to the auditor, or replaces the final checkpoint with an earlier state.
* **Mitigation**:
  * Checkpoint worker publishes RFC 9162 append only Merkle trees where each leaf hash is `SHA256(0x00 || leaf_bytes)` and node hash is `SHA256(0x01 || left || right)`.
  * Independent witness nodes cosign monotonic checkpoints with strict sequence numbers, requiring each checkpoint to build directly upon the preceding acknowledged tree size.
  * The final checkpoint digest is anchored to the smart contract `HimVoteAnchor.sol`.
  * The offline verifier CLI fetches the witness final checkpoint independently and rejects any audit archive exhibiting missing leaves or truncated trees.
* **Verification Proof**: Security test Q7_03 validates that omitting a single leaf or submitting an obsolete tree causes verifier failure.

### 4.4 Ballot Payload or Cryptographic Proof Tampering (Threat T4)
* **Attack Mechanism**: An attacker alters a single byte of ballot ciphertext, modifies zero knowledge validity proofs, or alters candidate metadata.
* **Mitigation**:
  * Ballots are stored as canonical JSON records per RFC 8785 schema `himvote.ballot_evidence.v1`.
  * Any alteration to the ciphertext or proof invalidates the leaf Merkle hash and causes engine zero knowledge proof verification failure.
* **Verification Proof**: Security test Q7_04 asserts that modifying a single bit in the ciphertext, proof, or nullifier triggers verification failure.

### 4.5 Result Manipulation and Tally Falsification (Threat T5)
* **Attack Mechanism**: An administrator keeps all accepted ballots unchanged but announces an altered election tally outcome.
* **Mitigation**:
  * Result publication requires an independent tally proof generated by the cryptographic voting engine.
  * The standalone verifier recomputes homomorphic ElGamal ballot aggregation and verifies decryption proofs against trustee public keys.
* **Verification Proof**: Security test Q7_05 confirms that any divergence between computed tally proofs and published totals is flagged as `TALLY_PROOF: FAIL`.

### 4.6 Voter Identity and Ballot Correlation (Threat T6)
* **Attack Mechanism**: A network eavesdropper or database administrator links a student identity with their ballot choice.
* **Mitigation**:
  * Issuance is strictly decoupled from casting using RFC 9474 blind signatures. The issuer signs an opaque blinded token and never sees the unblinded serial or nullifier.
  * Issuance window closes before casting window opens, preventing temporal traffic correlation.
  * Casting service operates on a distinct origin and network route with edge proxy rules stripping identity cookies, authorization headers, and IP addresses.
* **Verification Proof**: Automated privacy test scans confirm zero secret leakage in logs, metrics, or traces, and zero joint query correlation across databases.

### 4.7 Equivocation and Fork Attacks by Log Worker (Threat T7)
* **Attack Mechanism**: The log worker produces two diverging Merkle logs for different auditors or voters.
* **Mitigation**:
  * Independent witness nodes reject non monotonic checkpoint sequences and refuse conflicting finals.
  * The blockchain smart contract enforces monotonically increasing sequence numbers and prevents second final submissions.
* **Verification Proof**: Witness negative tests confirm immediate transition to `DISPUTED` state upon detection of conflicting tree branches.

### 4.8 Sybil Registration and Roster Manipulation (Threat T8)
* **Attack Mechanism**: An administrator adds ineligible voters or phantom students to the voter list after election creation.
* **Mitigation**:
  * Student eligibility is derived strictly from a frozen roster snapshot signed by a designated Roster Approver who is legally distinct from the roster importer.
  * Freeze locks manifest digest, candidate list, and public eligible count. Any post freeze modification invalidates the manifest signature.
* **Verification Proof**: Governance test suite verifies that unauthorized roster additions after freeze trigger hard audit failures.

___

## 5. Summary of Security Guarantees

* **Integrity**: Every cast ballot is permanently included in an append only Merkle log verified by independent witnesses and anchored on chain.
* **Eligibility**: Only authenticated students listed in the frozen, approved roster snapshot can receive a blind credential.
* **Uniqueness**: Each valid credential can be used to cast exactly one ballot. Duplicate attempts are rejected.
* **Secrecy**: Blind signatures ensure the casting service and election authorities cannot link a voter identity to a cast ballot.
* **Verifiability**: Any auditor or observer can independently verify log integrity, inclusion proofs, and tally correctness using the offline verifier CLI.
