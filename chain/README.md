# HimVote Anchor System

Production grade smart contract anchor system for HimVote election integrity verification.

## Overview

The HimVote anchor smart contract provides immutable cryptographic state anchoring on EVM compatible blockchains.

Core architectural properties:
* Only stores cryptographic commitments and tree digests
* Never stores student identities, cast votes, nullifiers, or ciphertexts
* Enforces strict monotonic sequence incrementation
* Requires contiguous digest chaining from genesis checkpoint to election finalization
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

Anchors an election checkpoint with cryptographic proof verification.

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

## Testing and Verification

The test suite in test/HimVoteAnchor.t.sol validates:
* Positive sequence progression and finalization
* Unauthorized relayer rejection
* Skipped sequence rejection
* Repeated sequence rejection
* Mismatched previous digest rejection
* Modification attempts after finalization rejection
* Emergency pause and resumption behavior
* Gas consumption bounds for cold writes and warm updates
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
forge script script/Deploy.s.sol
```
