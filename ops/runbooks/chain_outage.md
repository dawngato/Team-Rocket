# HimVote Blockchain Network Outage and Reorg Mitigation Runbook

## 1. Scope and Architecture Decoupling

HimVote utilizes an EVM blockchain network to anchor periodic Merkle tree commitments via the smart contract `HimVoteAnchor.sol`. The platform architecture decouples real time ballot casting from blockchain transaction execution.

```text
Decoupled Architecture Properties:

* Non Blocking Casting: Ballot submission transactions within casting_db complete in milliseconds without awaiting blockchain RPC responses.
* Asynchronous Relayer: services/anchor_relayer polls witnessed checkpoints from the outbox and submits transactions independently.
* Publication Requirement: While casting continues during a blockchain outage, official election publication strictly requires confirmed finality on chain.
```

___

## 2. Blockchain Incident Scenarios and Handling

### Scenario A: EVM RPC Endpoint Unreachability
* **Symptom**: `anchor_relayer` reports connection timeouts or HTTP 504 errors when connecting to the primary JSON RPC provider.
* **Mitigation**:
  * The relayer maintains a configured pool of multiple RPC endpoints across distinct providers (e.g. Infura, Alchemy, and dedicated institutional validator nodes).
  * The service automatically fails over to secondary RPC providers using exponential backoff.
  * Manual failover command:
```bash
python ops/scripts/switch_blockchain_rpc.py secondary_rpc_endpoint
```

### Scenario B: Extreme Gas Price Spikes
* **Symptom**: Gas fees on the public EVM network exceed the maximum pre approved gas price ceiling configured in `anchor_relayer`.
* **Mitigation**:
  * Relayer holds incremental checkpoint submissions in the outbox until gas prices normalize below ceiling.
  * Incremental checkpoints do NOT require immediate block inclusion. Only the final checkpoint must achieve on chain finality before publication.
  * For emergency fee ceiling adjustments:
```bash
python ops/scripts/adjust_relayer_gas_ceiling.py new_max_gwei
```

### Scenario C: Chain Reorganization (Reorg)
* **Symptom**: A block containing an anchored checkpoint transaction is reorganized out of the canonical chain.
* **Mitigation**:
  * A transaction hash or inclusion receipt alone is NEVER treated as final.
  * `anchor_relayer` monitors block depth until the configured confirmation threshold is met.
  * If a reorg removes an anchored block, the relayer detects canonical chain divergence, reverts checkpoint status in `casting_db` to `ANCHOR_PENDING`, and resubmits the transaction with appropriate nonce management.

### Scenario D: Extended Chain Halt During Election Close
* **Symptom**: The underlying blockchain stops producing blocks or experiences a major network split when an election is ready to publish.
* **Mitigation**:
  * The Admin API publication gate enforces `ANCHOR_FINALIZED` as a mandatory precondition.
  * The system will hold the election in `FINAL_WITNESSED` state.
  * Election Officers must not override the publication gate. Results are held until blockchain liveness is restored and finality confirmed.
