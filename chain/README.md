# HimVote Anchor System

Production grade smart contract anchor system for HimVote election integrity verification.

## Overview

The HimVote anchor smart contract provides immutable cryptographic state anchoring on EVM compatible blockchains.

Core architectural properties:
* Only stores cryptographic commitments and tree digests
* Never stores student identities, cast votes, nullifiers, or ciphertexts
* Enforces strict monotonic sequence incrementation
* Requires contiguous digest chaining from genesis checkpoint to election finalization
* Retains per-sequence checkpoint records for relayer replay and reorganization reconciliation
* Prohibits modifications after final checkpoint commitment
* Role based access control via OpenZeppelin AccessControl

## Smart Contract Details

### Contract: HimVoteAnchor.sol

Contract inheritance:
* AccessControl: Role management for administrative operations and relayer submissions
* Pausable: Emergency stop mechanism for administrative freeze

Roles:
* DEFAULT_ADMIN_ROLE: Administrative management, granting roles, emergency pause and unpause
* RELAYER_ROLE: Authorized checkpoint submission role used by the anchor relayer service

### Functions

#### anchorCheckpoint

Anchors a checkpoint submitted by the authorized relayer. The contract checks
the commitment, nonzero digest, contiguous sequence, previous-digest link, and
finalization state; it does not verify a ballot proof or witness signature.

Parameters:
* electionCommitment: bytes32 unique identifier for the election
* sequence: uint256 strictly increasing checkpoint index starting at 1
* digest: bytes32 nonzero cryptographic root digest
* previousDigest: bytes32 preceding digest matching stored record (bytes32 0 for sequence 1)
* isFinal: bool flag indicating whether this checkpoint concludes the election

Requirements:
* Caller must possess RELAYER_ROLE
* Contract must not be paused
* Election commitment must be nonzero
* Digest must be nonzero
* Election must not already be finalized
* Sequence must equal previous stored sequence plus one
* Previous digest must equal previous stored digest

#### getElectionAnchor

View function returning the latest state and finality status for an election.

Returns:
* sequence: uint256 latest checkpoint sequence number
* digest: bytes32 latest anchored digest
* blockNumber: uint256 EVM block number of anchor
* blockTimestamp: uint256 EVM timestamp of anchor
* isFinal: bool finality indicator

#### getAnchorRecord

View function returning the complete AnchorRecord struct.

#### Relayer reconciliation getters

`latestSequence` and `isFinalized` expose the latest anchor state. `getCheckpoint` returns a historical sequence record including its previous digest, and `getLatestCheckpoint` returns the latest record in the same shape. These getters are part of `services/anchor_relayer/anchor_relayer/abi.py` and must remain signature-compatible with it.

## Testing and Verification

The test suite in test/HimVoteAnchor.t.sol validates:
* Positive sequence progression and finalization
* Unauthorized relayer rejection
* Skipped sequence rejection
* Repeated sequence rejection
* Mismatched previous digest rejection
* Modification attempts after finalization rejection
* Emergency pause and resumption behavior
* Gas consumption bounds for latest-state and per-sequence history writes
* Multi election state isolation

Execute test suite:
```bash
forge test
```

Build contracts:
```bash
forge build
```

Deploy script:
```bash
DEPLOYER_PRIVATE_KEY="${DEPLOYER_PRIVATE_KEY:?set a secure deployment key}" \
  forge script script/Deploy.s.sol \
  --rpc-url "${CHAIN_RPC_URL:?set the chain RPC URL}" --broadcast
```

The deploy script requires `DEPLOYER_PRIVATE_KEY`; it does not fall back to a publicly known Anvil development key. Set `ANCHOR_ADMIN` and `ANCHOR_RELAYER` explicitly when those roles must belong to different addresses.
