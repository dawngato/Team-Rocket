// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HimVote checkpoint anchor
/// @notice Stores authenticated checkpoint commitments only. It never stores
///         identities, credentials, ballot payloads, or candidate choices.
///
/// This contract is a development/demo component. Anvil or another chain
/// controlled by the same operator is not an independent witness.
contract CheckpointAnchor {
    error Unauthorized();
    error InvalidArgument();
    error UnknownElection();
    error ManifestMismatch();
    error SequenceMismatch();
    error TreeSizeRegression();
    error PreviousDigestMismatch();
    error FinalAlreadyAnchored();
    error FinalCheckpointRequired();

    struct ElectionState {
        bytes32 manifestDigest;
        bytes32 checkpointDigest;
        bytes32 root;
        bytes32 previousDigest;
        uint64 nextSequence;
        uint64 treeSize;
        bool initialized;
        bool finalized;
    }

    address public immutable relayer;
    bytes32 public immutable deploymentDomain;
    mapping(bytes32 electionId => ElectionState state) private states;

    event CheckpointAnchored(
        bytes32 indexed electionId,
        bytes32 indexed manifestDigest,
        uint64 indexed sequence,
        uint64 treeSize,
        bytes32 root,
        bytes32 previousDigest,
        bytes32 checkpointDigest,
        bool isFinal
    );

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert Unauthorized();
        _;
    }

    constructor(address relayerAddress, bytes32 domain) {
        if (relayerAddress == address(0) || domain == bytes32(0)) {
            revert InvalidArgument();
        }
        relayer = relayerAddress;
        deploymentDomain = domain;
    }

    /// @dev Sequence numbers start at 1. The first checkpoint binds the
    ///      election to its manifest digest; later checkpoints must retain it.
    function anchorCheckpoint(
        bytes32 electionId,
        bytes32 manifestDigest,
        uint64 sequence,
        uint64 treeSize,
        bytes32 root,
        bytes32 previousDigest,
        bool isFinal
    ) external onlyRelayer returns (bytes32 checkpointDigest) {
        if (
            electionId == bytes32(0) ||
            manifestDigest == bytes32(0) ||
            root == bytes32(0) ||
            sequence == 0
        ) revert InvalidArgument();

        ElectionState storage state = states[electionId];
        if (state.finalized) revert FinalAlreadyAnchored();

        if (!state.initialized) {
            if (sequence != 1 || previousDigest != bytes32(0)) {
                revert SequenceMismatch();
            }
            state.manifestDigest = manifestDigest;
            state.nextSequence = 1;
            state.initialized = true;
        } else {
            if (manifestDigest != state.manifestDigest) revert ManifestMismatch();
            if (sequence != state.nextSequence) revert SequenceMismatch();
            if (previousDigest != state.checkpointDigest) {
                revert PreviousDigestMismatch();
            }
            if (treeSize < state.treeSize) revert TreeSizeRegression();
        }

        checkpointDigest = keccak256(
            abi.encode(
                deploymentDomain,
                block.chainid,
                address(this),
                electionId,
                manifestDigest,
                sequence,
                treeSize,
                root,
                previousDigest,
                isFinal
            )
        );

        state.checkpointDigest = checkpointDigest;
        state.root = root;
        state.previousDigest = previousDigest;
        state.treeSize = treeSize;
        state.nextSequence = sequence + 1;
        state.finalized = isFinal;

        emit CheckpointAnchored(
            electionId,
            manifestDigest,
            sequence,
            treeSize,
            root,
            previousDigest,
            checkpointDigest,
            isFinal
        );
    }

    function getState(bytes32 electionId)
        external
        view
        returns (ElectionState memory)
    {
        ElectionState memory state = states[electionId];
        if (!state.initialized) revert UnknownElection();
        return state;
    }
}
