// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title JamEscrow
 * @notice Escrow contract for The Jam bounty platform
 * @dev Holds USDC for challenges, pays winners when admin selects them
 */
contract JamEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public admin;
    address public pendingAdmin;
    
    // Platform fee (basis points, 100 = 1%)
    uint256 public feeBps = 500; // 5% default
    address public feeRecipient;
    
    struct Challenge {
        uint256 pool;
        uint256 funded;
        bool paid;
        bool refunded;
    }
    
    mapping(uint256 => Challenge) public challenges;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    event Funded(uint256 indexed challengeId, address indexed funder, uint256 amount);
    event WinnerPaid(uint256 indexed challengeId, address indexed winner, uint256 amount, uint256 fee);
    event Refunded(uint256 indexed challengeId, address indexed funder, uint256 amount);
    event AdminTransferStarted(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    constructor(address _usdc, address _feeRecipient) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        admin = msg.sender;
        feeRecipient = _feeRecipient != address(0) ? _feeRecipient : msg.sender;
    }
    
    /**
     * @notice Fund a challenge with USDC
     * @param challengeId The off-chain challenge ID
     * @param amount Amount of USDC to contribute (must have approval)
     */
    function fund(uint256 challengeId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(!challenges[challengeId].paid, "Challenge already paid");
        require(!challenges[challengeId].refunded, "Challenge refunded");
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        challenges[challengeId].pool += amount;
        challenges[challengeId].funded += amount;
        contributions[challengeId][msg.sender] += amount;
        
        emit Funded(challengeId, msg.sender, amount);
    }
    
    /**
     * @notice Pay the winner of a challenge
     * @param challengeId The challenge ID
     * @param winner Address to receive the prize
     */
    function payWinner(uint256 challengeId, address winner) external onlyAdmin nonReentrant {
        require(winner != address(0), "Invalid winner");
        Challenge storage c = challenges[challengeId];
        require(c.pool > 0, "No funds");
        require(!c.paid, "Already paid");
        require(!c.refunded, "Already refunded");
        
        uint256 amount = c.pool;
        c.paid = true;
        c.pool = 0;
        
        // Calculate fee
        uint256 fee = (amount * feeBps) / 10000;
        uint256 payout = amount - fee;
        
        // Transfer prize to winner
        usdc.safeTransfer(winner, payout);
        
        // Transfer fee to platform
        if (fee > 0 && feeRecipient != address(0)) {
            usdc.safeTransfer(feeRecipient, fee);
        }
        
        emit WinnerPaid(challengeId, winner, payout, fee);
    }
    
    /**
     * @notice Refund contributors if challenge is cancelled
     * @param challengeId The challenge ID
     * @param contributors Array of contributor addresses to refund
     */
    function refund(uint256 challengeId, address[] calldata contributors) external onlyAdmin nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(!c.paid, "Already paid");
        
        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            uint256 amount = contributions[challengeId][contributor];
            
            if (amount > 0) {
                contributions[challengeId][contributor] = 0;
                c.pool -= amount;
                usdc.safeTransfer(contributor, amount);
                emit Refunded(challengeId, contributor, amount);
            }
        }
        
        if (c.pool == 0) {
            c.refunded = true;
        }
    }
    
    /**
     * @notice Start admin transfer (2-step for safety)
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }
    
    /**
     * @notice Accept admin transfer
     */
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not pending admin");
        emit AdminTransferred(admin, pendingAdmin);
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }
    
    /**
     * @notice Update platform fee
     */
    function setFee(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }
    
    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyAdmin {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }
    
    /**
     * @notice Get challenge info
     */
    function getChallenge(uint256 challengeId) external view returns (
        uint256 pool,
        uint256 funded,
        bool paid,
        bool refunded
    ) {
        Challenge memory c = challenges[challengeId];
        return (c.pool, c.funded, c.paid, c.refunded);
    }
    
    /**
     * @notice Get contribution amount for a funder
     */
    function getContribution(uint256 challengeId, address funder) external view returns (uint256) {
        return contributions[challengeId][funder];
    }
}
