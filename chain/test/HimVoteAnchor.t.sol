// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {HimVoteAnchor, AnchorRecord} from "../contracts/HimVoteAnchor.sol";

contract HimVoteAnchorTest is Test {
    HimVoteAnchor public anchor;

    address public admin = address(0xAA11);
    address public relayer = address(0xBB22);
    address public unauthorizedUser = address(0xCC33);

    bytes32 public electionA = keccak256("ELECTION_A");
    bytes32 public electionB = keccak256("ELECTION_B");

    bytes32 public digest1 = keccak256("DIGEST_1");
    bytes32 public digest2 = keccak256("DIGEST_2");
    bytes32 public digest3 = keccak256("DIGEST_3");

    event CheckpointAnchored(
        bytes32 indexed electionCommitment,
        uint256 indexed sequence,
        bytes32 digest,
        bytes32 previousDigest,
        bool isFinal,
        uint256 blockNumber,
        uint256 blockTimestamp
    );

    function setUp() public {
        anchor = new HimVoteAnchor(admin, relayer);
    }

    function test_Constructor_InitializesRoles() public view {
        assertTrue(anchor.hasRole(anchor.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(anchor.hasRole(anchor.RELAYER_ROLE(), relayer));
        assertFalse(anchor.hasRole(anchor.RELAYER_ROLE(), unauthorizedUser));
    }

    function test_Constructor_RevertIf_ZeroAdmin() public {
        vm.expectRevert(HimVoteAnchor.ZeroAdminAddress.selector);
        new HimVoteAnchor(address(0), relayer);
    }

    function test_AnchorCheckpoint_PositiveSequenceAndFinalization() public {
        vm.startPrank(relayer);

        vm.expectEmit(true, true, false, true);
        emit CheckpointAnchored(electionA, 1, digest1, bytes32(0), false, block.number, block.timestamp);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);

        (
            uint256 seq1,
            bytes32 dig1,
            uint256 blockNum1,
            uint256 blockTime1,
            bool final1
        ) = anchor.getElectionAnchor(electionA);

        assertEq(seq1, 1);
        assertEq(dig1, digest1);
        assertEq(blockNum1, block.number);
        assertEq(blockTime1, block.timestamp);
        assertFalse(final1);

        vm.roll(block.number + 5);
        vm.warp(block.timestamp + 60);

        anchor.anchorCheckpoint(electionA, 2, digest2, digest1, false);

        (
            uint256 seq2,
            bytes32 dig2,
            uint256 blockNum2,
            uint256 blockTime2,
            bool final2
        ) = anchor.getElectionAnchor(electionA);

        assertEq(seq2, 2);
        assertEq(dig2, digest2);
        assertEq(blockNum2, block.number);
        assertEq(blockTime2, block.timestamp);
        assertFalse(final2);

        vm.roll(block.number + 10);
        vm.warp(block.timestamp + 120);

        anchor.anchorCheckpoint(electionA, 3, digest3, digest2, true);

        (
            uint256 seq3,
            bytes32 dig3,
            uint256 blockNum3,
            uint256 blockTime3,
            bool final3
        ) = anchor.getElectionAnchor(electionA);

        assertEq(seq3, 3);
        assertEq(dig3, digest3);
        assertEq(blockNum3, block.number);
        assertEq(blockTime3, block.timestamp);
        assertTrue(final3);

        AnchorRecord memory record = anchor.getAnchorRecord(electionA);
        assertEq(record.sequence, 3);
        assertEq(record.digest, digest3);
        assertTrue(record.isFinal);

        vm.stopPrank();
    }

    function test_RevertIf_UnauthorizedRelayer() public {
        bytes32 relayerRole = anchor.RELAYER_ROLE();
        vm.prank(unauthorizedUser);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorizedUser,
                relayerRole
            )
        );
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);
    }

    function test_RevertIf_SkippedSequence_Initial() public {
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.InvalidSequence.selector,
                1,
                2
            )
        );
        anchor.anchorCheckpoint(electionA, 2, digest1, bytes32(0), false);
    }

    function test_RevertIf_SkippedSequence_Subsequent() public {
        vm.startPrank(relayer);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);

        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.InvalidSequence.selector,
                2,
                3
            )
        );
        anchor.anchorCheckpoint(electionA, 3, digest2, digest1, false);
        vm.stopPrank();
    }

    function test_RevertIf_RepeatedSequence() public {
        vm.startPrank(relayer);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);

        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.InvalidSequence.selector,
                2,
                1
            )
        );
        anchor.anchorCheckpoint(electionA, 1, digest2, digest1, false);
        vm.stopPrank();
    }

    function test_RevertIf_WrongPreviousDigest_Initial() public {
        bytes32 wrongPrevious = keccak256("WRONG_PREVIOUS");
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.InvalidPreviousDigest.selector,
                bytes32(0),
                wrongPrevious
            )
        );
        anchor.anchorCheckpoint(electionA, 1, digest1, wrongPrevious, false);
    }

    function test_RevertIf_WrongPreviousDigest_Subsequent() public {
        vm.startPrank(relayer);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);

        bytes32 wrongDigest = keccak256("NON_MATCHING_PREVIOUS");
        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.InvalidPreviousDigest.selector,
                digest1,
                wrongDigest
            )
        );
        anchor.anchorCheckpoint(electionA, 2, digest2, wrongDigest, false);
        vm.stopPrank();
    }

    function test_RevertIf_AlterationAttemptAfterFinal() public {
        vm.startPrank(relayer);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), true);

        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.ElectionAlreadyFinalized.selector,
                electionA
            )
        );
        anchor.anchorCheckpoint(electionA, 2, digest2, digest1, false);
        vm.stopPrank();
    }

    function test_RevertIf_SecondFinal() public {
        vm.startPrank(relayer);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), true);

        vm.expectRevert(
            abi.encodeWithSelector(
                HimVoteAnchor.ElectionAlreadyFinalized.selector,
                electionA
            )
        );
        anchor.anchorCheckpoint(electionA, 2, digest2, digest1, true);
        vm.stopPrank();
    }

    function test_RevertIf_ZeroElectionCommitment() public {
        vm.prank(relayer);
        vm.expectRevert(HimVoteAnchor.ZeroElectionCommitment.selector);
        anchor.anchorCheckpoint(bytes32(0), 1, digest1, bytes32(0), false);
    }

    function test_RevertIf_ZeroDigest() public {
        vm.prank(relayer);
        vm.expectRevert(HimVoteAnchor.ZeroDigest.selector);
        anchor.anchorCheckpoint(electionA, 1, bytes32(0), bytes32(0), false);
    }

    function test_PausedState_RevertAndResume() public {
        vm.prank(admin);
        anchor.pause();

        vm.prank(relayer);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);

        vm.prank(admin);
        anchor.unpause();

        vm.prank(relayer);
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);

        (uint256 seq, bytes32 dig, , , ) = anchor.getElectionAnchor(electionA);
        assertEq(seq, 1);
        assertEq(dig, digest1);
    }

    function test_RevertIf_UnauthorizedPause() public {
        bytes32 adminRole = anchor.DEFAULT_ADMIN_ROLE();
        vm.prank(unauthorizedUser);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorizedUser,
                adminRole
            )
        );
        anchor.pause();
    }

    function test_MultipleElections_Isolation() public {
        vm.startPrank(relayer);

        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);
        anchor.anchorCheckpoint(electionB, 1, digest2, bytes32(0), true);

        (uint256 seqA, bytes32 digA, , , bool finalA) = anchor.getElectionAnchor(electionA);
        (uint256 seqB, bytes32 digB, , , bool finalB) = anchor.getElectionAnchor(electionB);

        assertEq(seqA, 1);
        assertEq(digA, digest1);
        assertFalse(finalA);

        assertEq(seqB, 1);
        assertEq(digB, digest2);
        assertTrue(finalB);

        anchor.anchorCheckpoint(electionA, 2, digest3, digest1, true);
        (uint256 seqA2, bytes32 digA2, , , bool finalA2) = anchor.getElectionAnchor(electionA);
        assertEq(seqA2, 2);
        assertEq(digA2, digest3);
        assertTrue(finalA2);

        vm.stopPrank();
    }

    function test_GasBounds() public {
        vm.startPrank(relayer);

        // Initial checkpoint requires cold SSTORE allocation
        uint256 gasBeforeInit = gasleft();
        anchor.anchorCheckpoint(electionA, 1, digest1, bytes32(0), false);
        uint256 gasUsedInit = gasBeforeInit - gasleft();

        // Gas for initial cold storage write must be bounded well below 150,000 gas
        assertLt(gasUsedInit, 150000);

        // Subsequent checkpoint updates existing warm storage slots
        uint256 gasBeforeSubsequent = gasleft();
        anchor.anchorCheckpoint(electionA, 2, digest2, digest1, false);
        uint256 gasUsedSubsequent = gasBeforeSubsequent - gasleft();

        // Gas for subsequent warm updates must remain bounded below 55,000 gas
        assertLt(gasUsedSubsequent, 55000);

        vm.stopPrank();
    }
}
