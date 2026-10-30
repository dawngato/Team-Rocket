// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {HimVoteAnchor} from "../contracts/HimVoteAnchor.sol";

contract DeployScript is Script {
    function run() external returns (HimVoteAnchor anchor) {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address admin = vm.envOr("ANCHOR_ADMIN", vm.addr(deployerPrivateKey));
        address relayer = vm.envOr("ANCHOR_RELAYER", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);
        anchor = new HimVoteAnchor(admin, relayer);
        vm.stopBroadcast();
    }
}
