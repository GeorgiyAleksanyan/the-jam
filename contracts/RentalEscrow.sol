// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RentalEscrow
 * @notice Escrow contract for AI agent rental payments in USDC
 * @dev Holds funds during active rentals, releases on completion or refunds on cancellation
 */
contract RentalEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // USDC on Base Mainnet
    IERC20 public immutable usdc;
    
    // Platform fee percentage (basis points, 1000 = 10%)
    uint256 public platformFeeBps = 1000;
    
    // Platform fee recipient
    address public feeRecipient;

    enum RentalStatus {
        None,
        Funded,
        Active,
        Completed,
        Cancelled,
        Disputed,
        Refunded
    }

    struct Rental {
        uint256 rentalId;        // Database rental ID
        address renter;          // Who is paying
        address agentOwner;      // Who receives payment
        uint256 amount;          // Total USDC amount (6 decimals)
        uint256 platformFee;     // Calculated platform fee
        RentalStatus status;
        uint256 fundedAt;
        uint256 completedAt;
    }

    // rentalId => Rental
    mapping(uint256 => Rental) public rentals;
    
    // Events
    event RentalFunded(uint256 indexed rentalId, address indexed renter, address indexed agentOwner, uint256 amount);
    event RentalStarted(uint256 indexed rentalId);
    event RentalCompleted(uint256 indexed rentalId, uint256 payout, uint256 fee);
    event RentalCancelled(uint256 indexed rentalId, uint256 refundAmount);
    event RentalDisputed(uint256 indexed rentalId);
    event DisputeResolved(uint256 indexed rentalId, uint256 renterRefund, uint256 ownerPayout);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    constructor(address _usdc, address _feeRecipient) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Fund a rental escrow
     * @param rentalId The database rental ID
     * @param agentOwner The agent owner's wallet address
     * @param amount The USDC amount (6 decimals)
     */
    function fundRental(
        uint256 rentalId,
        address agentOwner,
        uint256 amount
    ) external nonReentrant {
        require(rentals[rentalId].status == RentalStatus.None, "Rental already exists");
        require(agentOwner != address(0), "Invalid agent owner");
        require(agentOwner != msg.sender, "Cannot rent own agent");
        require(amount > 0, "Amount must be positive");

        uint256 fee = (amount * platformFeeBps) / 10000;

        rentals[rentalId] = Rental({
            rentalId: rentalId,
            renter: msg.sender,
            agentOwner: agentOwner,
            amount: amount,
            platformFee: fee,
            status: RentalStatus.Funded,
            fundedAt: block.timestamp,
            completedAt: 0
        });

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit RentalFunded(rentalId, msg.sender, agentOwner, amount);
    }

    /**
     * @notice Mark rental as active (called when work starts)
     * @param rentalId The rental ID
     */
    function startRental(uint256 rentalId) external {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Funded, "Rental not funded");
        require(msg.sender == rental.agentOwner || msg.sender == owner(), "Not authorized");

        rental.status = RentalStatus.Active;
        emit RentalStarted(rentalId);
    }

    /**
     * @notice Complete rental and release funds to agent owner
     * @param rentalId The rental ID
     */
    function completeRental(uint256 rentalId) external nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Active || rental.status == RentalStatus.Funded, "Invalid status");
        require(msg.sender == rental.renter || msg.sender == owner(), "Not authorized");

        rental.status = RentalStatus.Completed;
        rental.completedAt = block.timestamp;

        uint256 payout = rental.amount - rental.platformFee;

        // Transfer payout to agent owner
        usdc.safeTransfer(rental.agentOwner, payout);
        
        // Transfer fee to platform
        if (rental.platformFee > 0) {
            usdc.safeTransfer(feeRecipient, rental.platformFee);
        }

        emit RentalCompleted(rentalId, payout, rental.platformFee);
    }

    /**
     * @notice Cancel rental before work starts and refund renter
     * @param rentalId The rental ID
     */
    function cancelRental(uint256 rentalId) external nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Funded, "Can only cancel funded rentals");
        require(
            msg.sender == rental.renter || 
            msg.sender == rental.agentOwner || 
            msg.sender == owner(), 
            "Not authorized"
        );

        rental.status = RentalStatus.Cancelled;

        // Full refund to renter
        usdc.safeTransfer(rental.renter, rental.amount);

        emit RentalCancelled(rentalId, rental.amount);
    }

    /**
     * @notice Open a dispute for an active rental
     * @param rentalId The rental ID
     */
    function openDispute(uint256 rentalId) external {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Active, "Can only dispute active rentals");
        require(msg.sender == rental.renter || msg.sender == rental.agentOwner, "Not authorized");

        rental.status = RentalStatus.Disputed;
        emit RentalDisputed(rentalId);
    }

    /**
     * @notice Resolve a dispute (admin only)
     * @param rentalId The rental ID
     * @param renterRefundBps Percentage to refund renter (basis points)
     */
    function resolveDispute(
        uint256 rentalId,
        uint256 renterRefundBps
    ) external onlyOwner nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Disputed, "Not disputed");
        require(renterRefundBps <= 10000, "Invalid percentage");

        rental.status = RentalStatus.Completed;
        rental.completedAt = block.timestamp;

        uint256 renterRefund = (rental.amount * renterRefundBps) / 10000;
        uint256 remaining = rental.amount - renterRefund;
        uint256 fee = (remaining * platformFeeBps) / 10000;
        uint256 ownerPayout = remaining - fee;

        if (renterRefund > 0) {
            usdc.safeTransfer(rental.renter, renterRefund);
        }
        if (ownerPayout > 0) {
            usdc.safeTransfer(rental.agentOwner, ownerPayout);
        }
        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }

        emit DisputeResolved(rentalId, renterRefund, ownerPayout);
    }

    /**
     * @notice Emergency refund for stuck rentals (admin only)
     * @param rentalId The rental ID
     */
    function emergencyRefund(uint256 rentalId) external onlyOwner nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status != RentalStatus.Completed && rental.status != RentalStatus.Refunded, "Already settled");

        rental.status = RentalStatus.Refunded;
        usdc.safeTransfer(rental.renter, rental.amount);

        emit RentalCancelled(rentalId, rental.amount);
    }

    // Admin functions
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 2000, "Fee too high"); // Max 20%
        emit PlatformFeeUpdated(platformFeeBps, newFeeBps);
        platformFeeBps = newFeeBps;
    }

    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // View functions
    function getRental(uint256 rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }

    function getEscrowBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
