// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {HimVoteAnchor} from "../contracts/HimVoteAnchor.sol";

contract DeployScript is Script {
    function run() external returns (HimVoteAnchor anchor) {
        // Never use Foundry's publicly known Anvil key as a deployment fallback.
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.envOr("ANCHOR_ADMIN", vm.addr(deployerPrivateKey));
        address relayer = vm.envOr("ANCHOR_RELAYER", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);
        anchor = new HimVoteAnchor(admin, relayer);
        vm.stopBroadcast();
    }
}
