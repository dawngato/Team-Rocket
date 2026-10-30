# Architecture Decision Record 004: Witness Co Signed Merkle Logs and Consortium Blockchain Anchoring

## Status
Accepted

## Date
2026_10_30

## Context
Electronic voting platforms must guarantee that historical ballots cannot be modified, deleted, or reordered after acceptance. Storing ballots in a standard relational database allows an administrative adversary with root access to rewrite database tables or restore old backups containing favored ballot states.

To prevent silent tampering, HimVote requires a tamper evident data structure with independent external verification and immutable public anchoring.

## Decision
We implement a three tier immutability architecture:

```text
Three Tier Immutability Architecture:

Tier 1: High Throughput Append Only Merkle Tree (RFC 9162)
  * Casting service commits accepted ballots to database outbox in strict leaf index order.
  * Checkpoint worker constructs an RFC 9162 Merkle tree over canonical ballot evidence records.
  * Leaf hash is SHA256(0x00 || leaf_bytes); interior node hash is SHA256(0x01 || left || right).

Tier 2: Independent Multi Organization Witness Co Signing
  * Checkpoint worker submits incremental checkpoints to external witness nodes operated by independent partner entities.
  * Witnesses independently verify monotonic tree progression and consistency proofs before co signing checkpoints with their HSM keys.
  * Final checkpoint locks the tree size and prevents any subsequent additions.

Tier 3: Consortium Blockchain Commitment Anchoring
  * Anchor relayer service submits witnessed checkpoint digests to smart contract HimVoteAnchor.sol on an EVM network.
  * Smart contract enforces sequential sequence numbering, matches previous digests, and locks once isFinal is set.
  * Provides censorship resistant, public timestamping independent of university servers.
```

## Consequences

### Positive Consequences
* Tamper evidence: Any post cast modification of a single ballot invalidates the Merkle root and contradicts the witness co signed checkpoint.
* Anti truncation: University administrators cannot delete the last N ballots because independent witnesses possess signed receipts for each acknowledged tree size.
* Separation of concerns: High transaction throughput occurs within PostgreSQL; witness and blockchain anchoring operate asynchronously via transactional outboxes without blocking ballot casting transactions.

### Negative Consequences and Mitigations
* Reliance on external witness availability: If witness nodes suffer an outage, receipt progression pauses at COMMITTED_PENDING_WITNESS. Mitigated by deploying at least two independent witness nodes and implementing automated retry logic.
* Blockchain gas and transaction latency: Relaying transactions incurs network latency. Mitigated by anchoring batched checkpoints rather than individual ballots, and tracking block confirmations until finality is reached.
