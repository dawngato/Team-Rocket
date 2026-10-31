# Checkpoint anchor

`CheckpointAnchor.sol` is a small EVM commitment anchor for the HimVote
educational prototype. It accepts only an authorized relayer and stores a
manifest-bound, ordered checkpoint digest, Merkle root, tree size, previous
digest, and final flag.

It deliberately does not store student IDs, credentials, receipts, ballot
payloads, plaintext choices, or candidate totals. The relayer and witness are
still trust assumptions. A local Anvil deployment is a reproducible demo, not
an independently operated public authority.

Foundry tests and deployment scripts are not reported as passing in this
checkout because `forge` is not installed in the execution environment.
