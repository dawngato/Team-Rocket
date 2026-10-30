# HimVote Anchor Relayer Service

## Overview
The anchor relayer is a resilient Python service responsible for publishing witnessed election checkpoints to an EVM compatible smart contract named HimVoteAnchor. In accordance with Section 6.7 of the HimVote system specification, the relayer guarantees that checkpoints are anchored in strict sequence, confirmed by consensus, and protected against blockchain reorganizations.

## Architecture and Core Components
* **Witness Client**: Retrieves signed checkpoints requiring on chain anchoring from the independent witness node.
* **Transactional Outbox**: Maintains persistent state transitions for all anchoring tasks to survive restarts and prevent double broadcasts.
* **Contract Client**: Interfaces with the HimVoteAnchor contract to verify monotonic sequences, previous digest continuity, and terminal election finality.
* **Transaction Builder**: Assembles EIP 1559 or legacy transactions, computes gas limits, enforces spending limits, and signs payloads via local key or KMS.
* **Confirmation Poller**: Monitors transaction receipts, tracks block numbers and block hashes, counts confirmation depth, and identifies block finality.
* **Reorganization Detector**: Cross checks canonical block hashes and transaction inclusion to detect chain reorganizations.

## Transactional Outbox State Machine
The lifecycle transitions through the following statuses:
* **ANCHOR_PENDING**: Checkpoint ingested from witness; awaiting sequence availability and gas clearance.
* **ANCHOR_PREPARED**: Nonce allocated, gas estimated within configured thresholds, transaction payload created.
* **ANCHOR_SUBMITTED**: Raw transaction broadcast to the EVM node; transaction hash recorded.
* **CONFIRMING**: Receipt confirmed in a mined block; block number and block hash recorded; confirmations accumulating.
* **ANCHOR_FINALIZED**: Confirmation count equals or exceeds required threshold (example: 12 confirmations); terminal receipt recorded.
* **FAILED**: Transaction reverted on chain or exceeded gas limits.

## Reorganization Reconciliation
When a blockchain reorganization occurs:
* The poller detects that the recorded block hash at the receipt height no longer matches the canonical node block hash, or the transaction is dropped from the canonical chain.
* The relayer checks whether the checkpoint was mined into the new canonical branch.
* If not present on the canonical chain, the outbox record status is automatically reset to **ANCHOR_PENDING**, clearing the block number, block hash, and confirmation count to zero.
* The relayer then resubmits the transaction on the new canonical chain once the preceding sequence is canonical.

## Transaction Replay Protection
* Before broadcasting any transaction, the relayer calls contract state getters to check if the sequence is already anchored.
* If the sequence and digest already match on chain, the relayer reconciles the outbox record to the existing canonical receipt without submitting a redundant transaction.
* If a sequence gap exists, submission pauses until all earlier sequence checkpoints are confirmed.

## Configuration Options
All settings can be configured via environment variables:
* `CHAIN_RPC_URL`: JSON RPC endpoint of the EVM node (default `http://127.0.0.1:8545`).
* `CHAIN_ID`: Integer EVM chain identifier (default 31337).
* `CHAIN_CONTRACT_ADDRESS`: Deployed address of the HimVoteAnchor contract.
* `RELAYER_PRIVATE_KEY`: Hex encoded private key for the relayer role.
* `REQUIRED_CONFIRMATIONS`: Number of block confirmations before finality (default 12).
* `MAX_GAS_LIMIT`: Upper bound on gas limit to prevent excessive gas spend (default 500000).
* `GAS_PRICE_LIMIT_WEI`: Maximum gas price ceiling in wei (default 100000000000).
* `POLL_INTERVAL_SECONDS`: Frequency of poller ticks in seconds (default 2.0).
* `WITNESS_BASE`: Base URL of the independent witness service.

## Running Tests
Run pytest with PYTHONPATH set to the service root directory:
```bash
pytest tests
```
