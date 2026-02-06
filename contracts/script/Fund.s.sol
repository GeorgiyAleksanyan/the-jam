// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/JamEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FundScript is Script {
    // Base Mainnet USDC
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    // JamEscrow contract
    address constant ESCROW = 0x8fFEcDf8a26279d61CAa8e2D52C9A3335963A102;

    function run() external {
        uint256 challengeId = vm.envUint("CHALLENGE_ID");
        uint256 amount = vm.envUint("AMOUNT"); // in USDC units (6 decimals)
        
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(privateKey);
        
        // Approve USDC spend
        IERC20(USDC).approve(ESCROW, amount);
        
        // Fund the challenge
        JamEscrow(ESCROW).fund(challengeId, amount);
        
        vm.stopBroadcast();
        
        // Done - log output not needed
    }
}
