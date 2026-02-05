// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {JamEscrow} from "../src/JamEscrow.sol";

contract DeployJamEscrow is Script {
    // USDC addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address feeRecipient = vm.envOr("FEE_RECIPIENT", address(0));
        
        // Determine USDC address based on chain
        address usdcAddress;
        if (block.chainid == 8453) {
            usdcAddress = USDC_BASE;
            console.log("Deploying to Base Mainnet");
        } else if (block.chainid == 84532) {
            usdcAddress = USDC_BASE_SEPOLIA;
            console.log("Deploying to Base Sepolia");
        } else {
            revert("Unsupported chain");
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // If no fee recipient specified, use deployer
        if (feeRecipient == address(0)) {
            feeRecipient = vm.addr(deployerPrivateKey);
        }
        
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("USDC:", usdcAddress);
        console.log("Fee Recipient:", feeRecipient);
        
        JamEscrow escrow = new JamEscrow(usdcAddress, feeRecipient);
        
        console.log("JamEscrow deployed to:", address(escrow));
        
        vm.stopBroadcast();
    }
}
