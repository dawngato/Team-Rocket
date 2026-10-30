# HimVote Independent Witness Service

## 1. Overview and Operational Purpose

The HimVote Witness service is an independent audit daemon designed to be deployed and operated exclusively by an external oversight organization. It enforces tamper evident transparency, append only log invariants, and anti truncation guarantees for institutional elections.

HimVote system administrators have zero operational control over this service. All cryptographic material, audit logs, and backing stores remain completely segregated within the external organization boundary.

### Core Guarantees

* Non Repudiation: The witness signs acknowledgements using an election bound Ed25519 private key.
* Anti Truncation: Checkpoints must monotonically grow. The witness refuses any rollback, leaf deletion, or tree shrinking.
* Gap Rejection: Checkpoint sequences must increment strictly by one with zero skipped numbers.
* Cryptographic Continuity: Every checkpoint extension must present an RFC 9162 consistency proof verifying older leaves remain unmodified.
* Finality Sealing: Once an election log is finalized, no further checkpoints can ever be registered. Conflicting final checkpoints are permanently refused.

## 2. Cryptographic Specifications

### RFC 8785 Canonical JSON

Every checkpoint payload is validated and serialized according to RFC 8785 JSON Canonicalization Scheme:
* Character encoding: UTF 8 without byte order marks
* Key sorting: Strictly ordered by UTF 16 code units in big endian byte order
* Whitespace elimination: Zero whitespace between delimiters and tokens
* Float prohibition: Floating point numbers are strictly forbidden

### RFC 9162 Merkle Tree Hash and Consistency Proofs

* Leaf Hash: SHA256 prepending 0x00 domain separator byte
* Interior Node Hash: SHA256 prepending 0x01 domain separator byte
* Consistency Verification: Implements RFC 9162 Section 2.1.4.2 verification across tree head states

### Ed25519 Witness Signature Binding

Per Section 5.4, the witness signature firmly binds the canonical checkpoint bytes, the previous witness sequence number, and the unique election identifier.

## 3. API Endpoints

### POST /checkpoints

Receives an incremental or final checkpoint submission from an election log writer.
* Validates election identifier and manifest digest immutability
* Authenticates election log writer signature against pinned keys
* Validates monotonic tree size growth
* Verifies RFC 9162 Merkle consistency proof against prior acknowledged root
* Persists record to SQLite backing store and append only disk ledger
* Emits signed witness acknowledgement

### POST /elections/{id}/final

Seals the election Merkle log as permanently finalized.
* Verifies consistency of final tree head
* Marks election status as FINAL
* Rejects any conflicting second final submission
* Permanently disables any subsequent checkpoint submissions for this election

### GET /elections/{id}/final

Returns the verified, signed FINAL checkpoint record and witness signature. Used by auditors and offline verifier CLI during election attestation.

### GET /witness/public_key

Exposes the Ed25519 public key of the witness for out of band trust distribution and independent verification.

### GET /health

Returns operational status, witness instance identifier, and public key.

## 4. Storage Architecture and Data Invariants

The service maintains state using two complementary persistence mechanisms:
* SQLite Backing Store: Configured in Write Ahead Logging (WAL) mode with immediate transaction locks to prevent concurrency race conditions. Enforces uniqueness across sequence numbers and witness sequence progression.
* Append Only Disk Ledger: Optional immutable JSON lines audit ledger written sequentially to non volatile storage with explicit file synchronization.

### Strict State Invariants

* Checkpoint sequence numbers must start at 1 and advance strictly by 1
* Manifest digests are established on sequence 1 and cannot change
* Tree sizes must satisfy: new tree size greater than or equal to current tree size
* Rollback attempts to previous sequence numbers are rejected with HTTP 409 Conflict
* Sequence gaps are rejected with HTTP 409 Conflict
* Forged or unverified writer signatures are rejected with HTTP 401 Unauthorized
* Invalid RFC 9162 consistency proofs are rejected with HTTP 422 Unprocessable Content
* Submissions following a sealed FINAL state are rejected with HTTP 409 Conflict

## 5. Deployment and Operations Guide

### Operating Model

The witness should be hosted in an isolated virtual private cloud or on premises server owned by the auditor or institutional partner:
* Operating System: Linux with unprivileged container user
* Backing Volume: Persistent encrypted volume mounted for SQLite database
* Network Configuration: Ingress restricted via TLS reverse proxy; egress denied by default
* Signing Keys: Stored in hardware security module (HSM) or provisioned via secure environment variable

### Environment Configuration

* WITNESS_ID: Unique identifier string for the witness node
* WITNESS_DB_PATH: Path to SQLite backing store
* WITNESS_AUDIT_LOG_PATH: Path to append only JSONL log
* WITNESS_PRIVATE_KEY_HEX: 64 character hex encoded Ed25519 private key
* WITNESS_KEY_FILE_PATH: Filesystem path to private key file
* WITNESS_REQUIRE_WRITER_SIGNATURE: Boolean flag requiring writer authentication
* WITNESS_PINNED_WRITERS: JSON string mapping election identifiers to writer public keys
* WITNESS_HOST: Bind interface address
* WITNESS_PORT: Bind port number

### Running the Service

Start with ASGI server:
python witness/main.py

Or with uvicorn:
uvicorn witness.app:app

### Key Ceremony and Trust Distribution

1. The external organization generates the Ed25519 keypair inside their secure environment.
2. The public key is exported via GET /witness/public_key.
3. The public key fingerprint is distributed out of band to the institution, trustees, and verifier configurations before election freeze.
4. Election log writers obtain the witness URL and trust pins.

### Disaster Recovery and Reconciliation

In the event of a service disruption:
1. Restart the witness process against the persistent SQLite storage.
2. SQLite Write Ahead Logging guarantees recovery of committed checkpoints.
3. HimVote checkpoint worker resumes sending from the last witnessed tree size using idempotent retries.
