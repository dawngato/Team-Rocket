# Checkpoint Generation and EVM Anchoring

**Document Revision**: 2026.10  
**Classification**: Consensus Anchoring & Multi-Witness Verification  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Multi-Witness Architecture

HimVote eliminates single-server trust by requiring independent **Witness Nodes** to cosign all periodic Merkle checkpoints.

```
                    ┌─────────────────────────────────────────┐
                    │          Casting Database Log           │
                    └────────────────────┬────────────────────┘
                                         │  (Polls Unwitnessed Leaves)
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
             [ Witness Node 1 ]   [ Witness Node 2 ]   [ Witness Node 3 ]
             (Campus IT Admin)    (Student Union Rep)  (Faculty Observer)
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │  (Ed25519 Cosignatures)
                                         ▼
                             [ Checkpoint Assembly ]
                                         │
                                         ▼
                            [ EVM Anchor Relayer ]
                                         │
                                         ▼
                            [ HimVoteAnchor Contract ]
                               (Ethereum / Anvil)
```

---

## 2. Checkpoint Structure and Rules

Every valid checkpoint must satisfy four non-negotiable invariants:

1. **Strict Monotonic Sequencing**: Each checkpoint sequence number must strictly equal $S_{k} = S_{k-1} + 1$.
2. **Non-Decreasing Tree Size**: The Merkle tree size must satisfy $N_k \ge N_{k-1}$.
3. **Consistency Proof Validity**: If $N_k > N_{k-1}$, an RFC 9162 consistency proof must mathematically demonstrate that tree $T_{k-1}$ is a prefix of tree $T_k$.
4. **Quorum Attestation**: The checkpoint must contain valid Ed25519 signatures from at least $M$ of $N$ authorized witness public keys pinned in `trust_pins.json`.

---

## 3. EVM Smart Contract (`HimVoteAnchor.sol`)

The Ethereum smart contract provides a decentralized, tamper-proof clock and state anchor:

```solidity
contract HimVoteAnchor {
    struct CheckpointRecord {
        uint256 sequenceNumber;
        uint256 treeSize;
        bytes32 merkleRoot;
        uint256 blockTimestamp;
    }

    mapping(string => CheckpointRecord) public latestCheckpoints;

    event CheckpointCommitted(
        string indexed electionId,
        uint256 indexed sequenceNumber,
        uint256 treeSize,
        bytes32 merkleRoot
    );

    function commitCheckpoint(
        string calldata electionId,
        uint256 sequenceNumber,
        uint256 treeSize,
        bytes32 merkleRoot,
        bytes calldata witnessAttestation
    ) external {
        CheckpointRecord memory prev = latestCheckpoints[electionId];
        require(sequenceNumber == prev.sequenceNumber + 1, "ERR_SEQUENCE_GAP");
        require(treeSize >= prev.treeSize, "ERR_TREE_REGRESSION");
        
        // Verify witness quorum signatures...
        
        latestCheckpoints[electionId] = CheckpointRecord({
            sequenceNumber: sequenceNumber,
            treeSize: treeSize,
            merkleRoot: merkleRoot,
            blockTimestamp: block.timestamp
        });

        emit CheckpointCommitted(electionId, sequenceNumber, treeSize, merkleRoot);
    }
}
```

### 3.1 Equivocation & Split-View Detection
Because Ethereum smart contracts reject conflicting transactions for the same election sequence number, an attacker cannot publish two different Merkle roots for the same checkpoint. Any attempt to present a divergent tree to public auditors will fail when compared against the immutable on-chain transaction log.
