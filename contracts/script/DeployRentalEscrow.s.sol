// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RentalEscrow} from "../src/RentalEscrow.sol";

contract DeployRentalEscrow is Script {
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
            console.log("Deploying RentalEscrow to Base Mainnet");
        } else if (block.chainid == 84532) {
            usdcAddress = USDC_BASE_SEPOLIA;
            console.log("Deploying RentalEscrow to Base Sepolia");
        } else {
            revert("Unsupported chain");
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // If no fee recipient specified, use deployer
        if (feeRecipient == address(0)) {
            feeRecipient = vm.addr(deployerPrivateKey);
        }
        
        RentalEscrow escrow = new RentalEscrow(usdcAddress, feeRecipient);
        
        vm.stopBroadcast();
        
        console.log("RentalEscrow deployed at:", address(escrow));
        console.log("USDC address:", usdcAddress);
        console.log("Fee recipient:", feeRecipient);
        console.log("Platform fee:", escrow.platformFeeBps(), "bps (10%)");
    }
}
