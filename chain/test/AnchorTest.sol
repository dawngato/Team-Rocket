// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/HimVoteAnchor.sol";

contract AnchorTest is Test {
    HimVoteAnchor anchor;
    address relayer = address(0x1234);
    address notRelayer = address(0x5678);
    address admin = address(0x9999);

    bytes32 electionId = bytes32(uint256(1));
    bytes32 digest1 = bytes32(uint256(1001));
    bytes32 digest2 = bytes32(uint256(1002));

    function setUp() public {
        anchor = new HimVoteAnchor();
        // Grant relayer role
        anchor.grantRole(keccak256("ANCHOR_ROLE"), relayer);
    }

    function testUnauthorizedRelayerCannotAnchor() public {
        vm.prank(notRelayer);
        vm.expectRevert("AccessControl");
        anchor.anchorCheckpoint(electionId, 1, digest1, bytes32(0), false);
    }

    function testValidAnchor() public {
        vm.prank(relayer);
        anchor.anchorCheckpoint(electionId, 1, digest1, bytes32(0), false);
        assertEq(anchor.getElectionSequence(electionId), 1);
    }

    function testSkippedSequenceRejected() public {
        vm.prank(relayer);
        anchor.anchorCheckpoint(electionId, 1, digest1, bytes32(0), false);
        vm.expectRevert("Sequence must be previous + 1");
        anchor.anchorCheckpoint(electionId, 3, digest2, digest1, false);
    }

    function testRepeatedSequenceRejected() public {
        vm.prank(relayer);
        anchor.anchorCheckpoint(electionId, 1, digest1, bytes32(0), false);
        vm.expectRevert("Sequence must be previous + 1");
        anchor.anchorCheckpoint(electionId, 1, digest2, digest1, false);
    }

    function testWrongPreviousDigestRejected() public {
        vm.prank(relayer);
        anchor.anchorCheckpoint(electionId, 1, digest1, bytes32(0), false);
        vm.expectRevert("Previous digest mismatch");
        anchor.anchorCheckpoint(electionId, 2, digest2, bytes32(uint256(999)), false);
    }

    function testSecondFinalRejected() public {
        vm.prank(relayer);
        anchor.anchorCheckpoint(electionId, 1, digest1, bytes32(0), true);
        vm.expectRevert("Election already finalized");
        anchor.anchorCheckpoint(electionId, 2, digest2, digest1, false);
    }

    function testZeroDigestRejected() public {
        vm.prank(relayer);
        vm.expectRevert("Digest cannot be zero");
        anchor.anchorCheckpoint(electionId, 1, bytes32(0), bytes32(0), false);
    }

    function testZeroSequenceRejected() public {
        vm.prank(relayer);
        vm.expectRevert("Sequence must be positive");
        anchor.anchorCheckpoint(electionId, 0, digest1, bytes32(0), false);
    }
}
