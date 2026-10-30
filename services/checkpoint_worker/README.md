# HimVote Checkpoint Worker

## Overview

The checkpoint worker is an append only Merkle log publisher for the HimVote election system.
It operates as a dedicated worker service per election that guarantees verifiable cryptographic logging of accepted ballots.
The worker implements the requirements defined in Section 5.4, Section 6.5, and Section 20 of the specification.

## Core Responsibilities

1. Polling Outbox in Strict Leaf Index Order
The worker polls the casting database checkpoint_outbox table.
Leaves must be processed in strictly ascending sequential order starting from index 0 without skipping any gaps.
If a gap is encountered where expected leaf index k is missing, the worker halts leaf ingestion and waits for missing records.

2. RFC 9162 Merkle Tree Maintenance
Maintains the complete Merkle tree structure according to RFC 9162.
Leaf hash is computed as SHA256 of prefix byte 0x00 concatenated with leaf data.
Internal node hash is computed as SHA256 of prefix byte 0x01 concatenated with left child and right child hashes.
Produces consistency proofs between historical tree sizes and current tree size.
Produces inclusion proofs for any leaf index.

3. Canonical Checkpoint Record Generation
Generates canonical checkpoint records conforming to the himvote.checkpoint.v1 schema.
Serializes records strictly adhering to RFC 8785 JSON Canonicalization Scheme without floats or extraneous whitespace.
Computes previous_checkpoint_digest, last_leaf_index, last_leaf_digest, tree_size, and merkle_root.

4. Witness Service Submission
Submits generated checkpoints via HTTP POST to the witness service.
Signs the checkpoint using the log writer Ed25519 private key.
Verifies the cryptographic witness signature over the canonical checkpoint bytes, previous witness sequence, and election ID.

5. Atomic Acknowledgement and State Update
Upon receipt of a valid witness signature, the worker atomically records the signed receipt in witness_acknowledgements.
Marks corresponding outbox entries as PROCESSED.
Updates election_state last_witnessed_tree_size.
When final_tree_size is reached during election closing, submits a FINAL checkpoint and advances state to FINAL_WITNESSED.

6. Conflict Detection and Dispute Handling
Guarantees idempotency on duplicate outbox rows with identical hashes.
If a duplicate leaf index is encountered with a conflicting hash, the worker halts immediately.
Transitions the election state to DISPUTED and persists a critical security audit event.

## Architecture and Components

* checkpoint_worker.config: Configuration management reading environment variables.
* checkpoint_worker.crypto.canonical_json: RFC 8785 canonical JSON serializer and digest generator.
* checkpoint_worker.crypto.merkle_tree: RFC 9162 Merkle Tree Hash, consistency proof, and inclusion proof engine.
* checkpoint_worker.crypto.signatures: Ed25519 signing and verification bindings.
* checkpoint_worker.models.checkpoint: himvote.checkpoint.v1 Pydantic record model.
* checkpoint_worker.models.database: SQLAlchemy models for elections, election_state, checkpoint_outbox, witness_acknowledgements, and election_events.
* checkpoint_worker.witness_client: HTTP client featuring exponential backoff retries and cryptographic witness signature validation.
* checkpoint_worker.worker: CheckpointWorker orchestrating database polling, Merkle state updates, and dispute transitions.
* checkpoint_worker.service: Daemon runner with graceful signal handling.

## Verification and Testing

The unit test suite validates all protocol rules:
* Canonical JSON deterministic serialization and float rejection.
* RFC 9162 empty tree, single leaf tree, and multi leaf tree consistency and inclusion proofs.
* Ed25519 log writer signing and witness signature verification.
* Strict sequential outbox processing without skipping gaps.
* Idempotent handling of duplicate identical outbox entries.
* Immediate transition to DISPUTED state upon conflicting leaf hashes.
* Network interruption resilience and rollback during witness outages.
* FINAL checkpoint issuance upon closing.
