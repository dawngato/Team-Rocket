// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Anchor record containing checkpoint metadata.
struct AnchorRecord {
    uint256 sequence;
    bytes32 digest;
    uint256 blockNumber;
    uint256 blockTimestamp;
    bool isFinal;
}

/**
 * @title HimVoteAnchor
 * @notice Anchors cryptographic checkpoints for institutional elections onchain.
 * @dev Stores state commitments only; never student identities, votes, or ciphertexts.
 *      Enforces strictly monotonic sequence increments and cryptographic digest chaining.
 */
contract HimVoteAnchor is AccessControl, Pausable {
    /// @notice Role authorized to submit anchor checkpoints.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /// @notice Mapping from election commitment hash to its latest anchor record.
    mapping(bytes32 => AnchorRecord) private _anchors;

    /// @dev Retains every accepted checkpoint so relayers can reconcile replay,
    ///      receipt loss, and reorg recovery against historical sequence data.
    mapping(bytes32 => mapping(uint256 => AnchorRecord)) private _checkpointHistory;
    mapping(bytes32 => mapping(uint256 => bytes32)) private _previousDigests;

    /// @notice Emitted when a new checkpoint is successfully anchored.
    event CheckpointAnchored(
        bytes32 indexed electionCommitment,
        uint256 indexed sequence,
        bytes32 digest,
        bytes32 previousDigest,
        bool isFinal,
        uint256 blockNumber,
        uint256 blockTimestamp
    );

    /// @notice Thrown when initializing with a zero admin address.
    error ZeroAdminAddress();

    /// @notice Thrown when election commitment is zero bytes.
    error ZeroElectionCommitment();

    /// @notice Thrown when checkpoint digest is zero bytes.
    error ZeroDigest();

    /// @notice Thrown when provided sequence does not equal previous sequence plus one.
    error InvalidSequence(uint256 expectedSequence, uint256 providedSequence);

    /// @notice Thrown when provided previous digest does not match the stored checkpoint digest.
    error InvalidPreviousDigest(bytes32 expectedDigest, bytes32 providedDigest);

    /// @notice Thrown when attempting to anchor after election finalization.
    error ElectionAlreadyFinalized(bytes32 electionCommitment);

    /**
     * @notice Initializes the anchor contract with default admin and optional relayer roles.
     * @param admin Address receiving DEFAULT_ADMIN_ROLE.
     * @param initialRelayer Address receiving RELAYER_ROLE (optional if address(0)).
     */
    constructor(address admin, address initialRelayer) {
        if (admin == address(0)) {
            revert ZeroAdminAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (initialRelayer != address(0)) {
            _grantRole(RELAYER_ROLE, initialRelayer);
        }
    }

    /**
     * @notice Pauses contract checkpoint anchoring in emergencies.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract checkpoint anchoring.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Anchors a witnessed checkpoint for a specific election.
     * @param electionCommitment Unique identifier hash representing the frozen election.
     * @param sequence Monotonically increasing checkpoint index starting at 1.
     * @param digest Cryptographic digest of the current state tree leaf.
     * @param previousDigest Cryptographic digest of the preceding checkpoint (zero for sequence 1).
     * @param isFinal Flag indicating whether this checkpoint concludes the election.
     */
    function anchorCheckpoint(
        bytes32 electionCommitment,
        uint256 sequence,
        bytes32 digest,
        bytes32 previousDigest,
        bool isFinal
    ) external onlyRole(RELAYER_ROLE) whenNotPaused {
        if (electionCommitment == bytes32(0)) {
            revert ZeroElectionCommitment();
        }
        if (digest == bytes32(0)) {
            revert ZeroDigest();
        }

        AnchorRecord storage current = _anchors[electionCommitment];

        if (current.isFinal) {
            revert ElectionAlreadyFinalized(electionCommitment);
        }

        uint256 expectedSequence = current.sequence + 1;
        if (sequence != expectedSequence) {
            revert InvalidSequence(expectedSequence, sequence);
        }

        if (previousDigest != current.digest) {
            revert InvalidPreviousDigest(current.digest, previousDigest);
        }

        current.sequence = sequence;
        current.digest = digest;
        current.blockNumber = block.number;
        current.blockTimestamp = block.timestamp;
        current.isFinal = isFinal;
        _checkpointHistory[electionCommitment][sequence] = current;
        _previousDigests[electionCommitment][sequence] = previousDigest;

        emit CheckpointAnchored(
            electionCommitment,
            sequence,
            digest,
            previousDigest,
            isFinal,
            block.number,
            block.timestamp
        );
    }

    /**
     * @notice Retrieves latest anchor state and finality for an election commitment.
     * @param electionCommitment Unique identifier hash of the election.
     * @return sequence Latest anchored sequence number (0 if unanchored).
     * @return digest Latest anchored cryptographic digest.
     * @return blockNumber EVM block number of the latest anchor.
     * @return blockTimestamp EVM block timestamp of the latest anchor.
     * @return isFinal True if election has been permanently finalized.
     */
    function getElectionAnchor(bytes32 electionCommitment)
        external
        view
        returns (
            uint256 sequence,
            bytes32 digest,
            uint256 blockNumber,
            uint256 blockTimestamp,
            bool isFinal
        )
    {
        AnchorRecord storage record = _anchors[electionCommitment];
        return (
            record.sequence,
            record.digest,
            record.blockNumber,
            record.blockTimestamp,
            record.isFinal
        );
    }

    /**
     * @notice Returns the full struct record for an election commitment.
     * @param electionCommitment Unique identifier hash of the election.
     * @return Full AnchorRecord struct.
     */
    function getAnchorRecord(bytes32 electionCommitment)
        external
        view
        returns (AnchorRecord memory)
    {
        return _anchors[electionCommitment];
    }

    /// @notice Returns the latest accepted checkpoint sequence, or zero if none exists.
    function latestSequence(bytes32 electionCommitment) external view returns (uint256) {
        return _anchors[electionCommitment].sequence;
    }

    /// @notice Returns whether the election has accepted a terminal checkpoint.
    function isFinalized(bytes32 electionCommitment) external view returns (bool) {
        return _anchors[electionCommitment].isFinal;
    }

    /// @notice Returns one historical checkpoint, or an all-zero record if absent.
    function getCheckpoint(bytes32 electionCommitment, uint256 sequence)
        external
        view
        returns (
            uint256 checkpointSequence,
            bytes32 digest,
            bytes32 previousDigest,
            bool isFinal,
            uint256 blockNumber,
            uint256 timestamp
        )
    {
        AnchorRecord storage record = _checkpointHistory[electionCommitment][sequence];
        return (
            record.sequence,
            record.digest,
            _previousDigests[electionCommitment][sequence],
            record.isFinal,
            record.blockNumber,
            record.blockTimestamp
        );
    }

    /// @notice Returns the latest checkpoint in the same shape as getCheckpoint.
    function getLatestCheckpoint(bytes32 electionCommitment)
        external
        view
        returns (
            uint256 sequence,
            bytes32 digest,
            bytes32 previousDigest,
            bool isFinal,
            uint256 blockNumber,
            uint256 timestamp
        )
    {
        AnchorRecord storage record = _anchors[electionCommitment];
        return (
            record.sequence,
            record.digest,
            _previousDigests[electionCommitment][record.sequence],
            record.isFinal,
            record.blockNumber,
            record.blockTimestamp
        );
    }
}
