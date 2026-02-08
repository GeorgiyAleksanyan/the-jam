// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RentalEscrow
 * @notice Escrow contract for AI agent rental payments in USDC
 */
contract RentalEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public admin;
    address public feeRecipient;
    uint256 public platformFeeBps = 1000; // 10%

    enum RentalStatus { None, Funded, Active, Completed, Cancelled, Disputed, Refunded }

    struct Rental {
        address renter;
        address agentOwner;
        uint256 amount;
        uint256 platformFee;
        RentalStatus status;
        uint256 fundedAt;
    }

    mapping(uint256 => Rental) public rentals;
    
    event RentalFunded(uint256 indexed rentalId, address indexed renter, address indexed agentOwner, uint256 amount);
    event RentalCompleted(uint256 indexed rentalId, uint256 payout, uint256 fee);
    event RentalCancelled(uint256 indexed rentalId, uint256 refundAmount);
    event RentalDisputed(uint256 indexed rentalId);
    event DisputeResolved(uint256 indexed rentalId, uint256 renterRefund, uint256 ownerPayout);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _usdc, address _feeRecipient) {
        require(_usdc != address(0), "Invalid USDC");
        usdc = IERC20(_usdc);
        admin = msg.sender;
        feeRecipient = _feeRecipient != address(0) ? _feeRecipient : msg.sender;
    }

    function fundRental(uint256 rentalId, address agentOwner, uint256 amount) external nonReentrant {
        require(rentals[rentalId].status == RentalStatus.None, "Exists");
        require(agentOwner != address(0) && agentOwner != msg.sender, "Invalid owner");
        require(amount > 0, "Zero amount");

        uint256 fee = (amount * platformFeeBps) / 10000;
        rentals[rentalId] = Rental(msg.sender, agentOwner, amount, fee, RentalStatus.Funded, block.timestamp);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit RentalFunded(rentalId, msg.sender, agentOwner, amount);
    }

    function startRental(uint256 rentalId) external {
        Rental storage r = rentals[rentalId];
        require(r.status == RentalStatus.Funded, "Not funded");
        require(msg.sender == r.agentOwner || msg.sender == admin, "Not authorized");
        r.status = RentalStatus.Active;
    }

    function completeRental(uint256 rentalId) external nonReentrant {
        Rental storage r = rentals[rentalId];
        require(r.status == RentalStatus.Active || r.status == RentalStatus.Funded, "Invalid status");
        require(msg.sender == r.renter || msg.sender == admin, "Not authorized");

        r.status = RentalStatus.Completed;
        uint256 payout = r.amount - r.platformFee;
        usdc.safeTransfer(r.agentOwner, payout);
        if (r.platformFee > 0) usdc.safeTransfer(feeRecipient, r.platformFee);
        emit RentalCompleted(rentalId, payout, r.platformFee);
    }

    function cancelRental(uint256 rentalId) external nonReentrant {
        Rental storage r = rentals[rentalId];
        require(r.status == RentalStatus.Funded, "Cannot cancel");
        require(msg.sender == r.renter || msg.sender == r.agentOwner || msg.sender == admin, "Not authorized");

        r.status = RentalStatus.Cancelled;
        usdc.safeTransfer(r.renter, r.amount);
        emit RentalCancelled(rentalId, r.amount);
    }

    function openDispute(uint256 rentalId) external {
        Rental storage r = rentals[rentalId];
        require(r.status == RentalStatus.Active, "Not active");
        require(msg.sender == r.renter || msg.sender == r.agentOwner, "Not authorized");
        r.status = RentalStatus.Disputed;
        emit RentalDisputed(rentalId);
    }

    function resolveDispute(uint256 rentalId, uint256 renterRefundBps) external onlyAdmin nonReentrant {
        Rental storage r = rentals[rentalId];
        require(r.status == RentalStatus.Disputed, "Not disputed");
        require(renterRefundBps <= 10000, "Invalid bps");

        r.status = RentalStatus.Completed;
        uint256 renterRefund = (r.amount * renterRefundBps) / 10000;
        uint256 remaining = r.amount - renterRefund;
        uint256 fee = (remaining * platformFeeBps) / 10000;
        uint256 ownerPayout = remaining - fee;

        if (renterRefund > 0) usdc.safeTransfer(r.renter, renterRefund);
        if (ownerPayout > 0) usdc.safeTransfer(r.agentOwner, ownerPayout);
        if (fee > 0) usdc.safeTransfer(feeRecipient, fee);
        emit DisputeResolved(rentalId, renterRefund, ownerPayout);
    }

    function emergencyRefund(uint256 rentalId) external onlyAdmin nonReentrant {
        Rental storage r = rentals[rentalId];
        require(r.status != RentalStatus.Completed && r.status != RentalStatus.Refunded, "Settled");
        r.status = RentalStatus.Refunded;
        usdc.safeTransfer(r.renter, r.amount);
    }

    function setFee(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 2000, "Max 20%");
        platformFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyAdmin {
        require(newRecipient != address(0), "Invalid");
        feeRecipient = newRecipient;
    }

    function getRental(uint256 rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }
}
