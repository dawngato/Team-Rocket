# HimVote Anchor Relayer Service

## Overview
The anchor relayer accepts signed witness acknowledgements, verifies them against an out-of-band witness key pin, persists them in a SQLite outbox, and can submit them to a configured HimVoteAnchor contract. It does not deploy the contract or infer election commitments, trust keys, chain identity, or finality policy.

## Architecture and Core Components
* **Witness Client**: Reads the witness checkpoint-list and final-checkpoint routes, verifies each Ed25519 signature and canonical checkpoint digest, and checks the witness key against `WITNESS_PUBLIC_KEY`.
* **Transactional Outbox**: Stores checkpoint submissions and lifecycle state in SQLite. API ingestion and the optional worker use the same `OUTBOX_DATABASE_PATH`; configure persistent storage for restart durability.
* **Contract Client**: Interfaces with the HimVoteAnchor contract to verify monotonic sequences, previous digest continuity, and terminal election finality.
* **Transaction Builder**: Assembles EIP 1559 or legacy transactions, computes gas limits, enforces spending limits, and signs payloads via local key or KMS.
* **Confirmation Poller**: Monitors receipts, block numbers, block hashes, and the configured confirmation depth. Reaching that depth is a local confirmation policy, not a claim of protocol-level finality.
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
* The relayer checks whether the checkpoint was mined into the new canonical branch when the RPC can answer.
* If the checkpoint is absent from a successfully read canonical branch, the outbox record returns to **ANCHOR_PENDING**. If RPC reads fail, the outcome stays indeterminate and the relayer does not treat the checkpoint as absent or finalized.
* The relayer then resubmits the transaction on the new canonical chain once the preceding sequence is canonical.

## Transaction Replay Protection
* Before broadcasting any transaction, the relayer calls contract state getters to check if the sequence is already anchored.
* If the sequence and digest already match on chain, the relayer reconciles the outbox record to the existing canonical receipt without submitting a redundant transaction.
* If a sequence gap exists, submission pauses until all earlier sequence checkpoints are confirmed.

## Configuration Options
The HTTP ingestion API can run without a chain signer, but it accepts checkpoints only when witness trust configuration is present. The chain worker starts only when `ANCHOR_WORKER_ENABLED=true` and its required chain configuration is valid.

Required trust and commitment configuration:
* `WITNESS_PUBLIC_KEY`: Pinned 32-byte Ed25519 public key, supplied out of band. A key returned by the witness itself is not automatically trusted.
* `WITNESS_ELECTION_COMMITMENTS`: JSON object mapping each witness `election_id` to its explicitly assigned `0x`-prefixed bytes32 chain commitment. The relayer does not derive this value from `manifest_digest` or election ID.
* `WITNESS_BASE`: Base URL of the witness service.

Required worker configuration when enabled:
* `CHAIN_RPC_URL`: JSON RPC endpoint of the selected EVM node.
* `CHAIN_ID`: Explicit integer EVM chain identifier.
* `CHAIN_CONTRACT_ADDRESS`: Deployed address of the HimVoteAnchor contract.
* `RELAYER_PRIVATE_KEY`: Secret key whose account has `RELAYER_ROLE` on that deployed contract.
* `OUTBOX_DATABASE_PATH`: SQLite file path shared by the API and worker processes. The Docker Compose service uses `/data/anchor_outbox.sqlite` on a named volume. Kubernetes mounts a PVC at `/data`.

The contract must be deployed separately. `chain/script/Deploy.s.sol` requires `DEPLOYER_PRIVATE_KEY` and accepts explicit `ANCHOR_ADMIN` and `ANCHOR_RELAYER` addresses. The address derived from `RELAYER_PRIVATE_KEY` must have `RELAYER_ROLE`; an administrator must grant it if deployment assigned the role elsewhere. The relayer does not deploy contracts or grant roles.

In Docker Compose, set `ANCHOR_WORKER_ENABLED=true` to run the worker alongside the API. Supply the witness key pin, election commitment map, chain ID, deployed contract address, and relayer key first. Compose stores local Anvil state in the `anvil_data` volume; removing that volume intentionally resets the development chain and requires a matching outbox reset or reconciliation. In Kubernetes, set `anchorRelayer.env.workerEnabled: true`, fill the corresponding chain and witness values, and create the Secret named by `anchorRelayer.env.privateKeySecretName` with the configured key name. Helm requires the secret name and key when the worker is enabled.

Additional optional settings:
* `REQUIRED_CONFIRMATIONS`: Number of block confirmations before finality (default 12).
* `MAX_GAS_LIMIT`: Upper bound on gas limit to prevent excessive gas spend (default 500000).
* `GAS_PRICE_LIMIT_WEI`: Maximum gas price ceiling in wei (default 100000000000).
* `POLL_INTERVAL_SECONDS`: Frequency of poller ticks in seconds (default 2.0).
