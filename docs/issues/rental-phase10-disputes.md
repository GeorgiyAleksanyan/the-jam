# Phase 10: Dispute Resolution System

Part of Epic #48 - Agent Rental Marketplace
Depends on: #55 (Workspace), #53 (Stripe), #54 (Crypto)

## Overview

Implement a fair and transparent dispute resolution system for when rentals don't go as planned. Either party can raise a dispute, provide evidence, and the platform reviews and resolves.

## User Stories

### As a Renter, I want to...
- [ ] Raise a dispute if work isn't delivered or is poor quality
- [ ] Submit evidence (screenshots, messages, files)
- [ ] Request full or partial refund
- [ ] Track dispute status
- [ ] Accept or appeal resolution

### As an Agent Owner, I want to...
- [ ] Raise a dispute if renter is abusive or violates terms
- [ ] Respond to disputes with my evidence
- [ ] Propose resolutions
- [ ] Be protected from frivolous disputes

### As a Platform Admin, I want to...
- [ ] Review disputes with full context
- [ ] See all evidence from both parties
- [ ] Issue resolutions (refund, payout, split)
- [ ] Ban bad actors
- [ ] Track dispute metrics

## Dispute Reasons

### Renter-Initiated
| Reason | Description |
|--------|-------------|
| `work_not_delivered` | Agent never delivered work |
| `poor_quality` | Work doesn't meet requirements |
| `communication_issue` | Agent unresponsive or unprofessional |
| `terms_violation` | Agent violated agreed terms |
| `other` | Other issue (requires description) |

### Owner-Initiated
| Reason | Description |
|--------|-------------|
| `abusive_renter` | Renter is abusive or harassing |
| `scope_creep` | Renter demanding far more than agreed |
| `payment_issue` | Payment-related problems |
| `terms_violation` | Renter violated agreed terms |
| `other` | Other issue (requires description) |

## Dispute Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DISPUTE FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Party raises     │
    │ dispute          │
    │ (with evidence)  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Status: OPEN     │
    │ Rental: DISPUTED │
    │ Funds: FROZEN    │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Other party      │
    │ notified         │
    │ (24h to respond) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Other party      │
    │ submits response │
    │ & evidence       │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Status:          │
    │ UNDER_REVIEW     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Platform reviews │
    │ - Chat history   │
    │ - Deliverables   │
    │ - Evidence       │
    │ - Past behavior  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Resolution:      │
    ├──────────────────┤
    │ • Full refund    │
    │ • Partial refund │
    │ • Payment release│
    │ • Split 50/50    │
    │ • No action      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Execute:         │
    │ - Stripe refund  │
    │ - Crypto release │
    │ - Update status  │
    │ - Notify parties │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Status: RESOLVED │
    │ (Can appeal 7d)  │
    └──────────────────┘
```

## API Endpoints

### POST `/api/rentals/[id]/dispute`
Raise a dispute.

**Request:**
```json
{
  "reason": "work_not_delivered",
  "description": "The agent accepted my task 5 days ago but has not delivered anything or responded to messages in 3 days.",
  "requested_resolution": "full_refund",
  "evidence": [
    {
      "type": "screenshot",
      "url": "https://...",
      "description": "Screenshot showing no response for 3 days"
    }
  ]
}
```

**Response:**
```json
{
  "dispute": {
    "id": 1,
    "rental_id": 123,
    "status": "open",
    "reason": "work_not_delivered",
    "created_at": "2025-02-08T18:00:00Z"
  },
  "message": "Dispute raised. The other party has 24 hours to respond."
}
```

### GET `/api/rentals/[id]/dispute`
Get dispute details.

**Response:**
```json
{
  "dispute": {
    "id": 1,
    "rental_id": 123,
    "raised_by": "renter",
    "reason": "work_not_delivered",
    "description": "...",
    "status": "under_review",
    "evidence": [...],
    "response": {
      "description": "I was sick and couldn't work...",
      "evidence": [...],
      "submitted_at": "..."
    },
    "resolution": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### POST `/api/disputes/[id]/respond`
Respond to a dispute (other party).

**Request:**
```json
{
  "description": "I was hospitalized unexpectedly. I'm happy to complete the work now or issue a partial refund.",
  "proposed_resolution": "partial_refund",
  "proposed_amount": 75.00,
  "evidence": [...]
}
```

### POST `/api/disputes/[id]/evidence`
Add additional evidence.

### POST `/api/disputes/[id]/resolve` (Admin)
Resolve the dispute.

**Request:**
```json
{
  "resolution_type": "partial_refund",
  "renter_refund": 100.00,
  "owner_payout": 50.00,
  "notes": "Given the circumstances, splitting the amount seems fair..."
}
```

### POST `/api/disputes/[id]/appeal`
Appeal a resolution (within 7 days).

**Request:**
```json
{
  "reason": "New evidence available",
  "description": "...",
  "evidence": [...]
}
```

## Resolution Types

| Type | Renter Gets | Owner Gets | Platform Gets |
|------|-------------|------------|---------------|
| `full_refund` | 100% | 0% | 0% |
| `partial_refund` | X% | Y% | 0% |
| `payment_released` | 0% | 90% | 10% |
| `split` | 50% | 50% | 0% |
| `no_action` | (depends on status) | | |

## Payment Handling

### Stripe Disputes
```typescript
// Full refund
await stripe.refunds.create({
  payment_intent: rental.stripe_payment_intent_id,
});

// Partial refund
await stripe.refunds.create({
  payment_intent: rental.stripe_payment_intent_id,
  amount: Math.round(refundAmount * 100),
});

// Release to owner (if using manual capture)
await stripe.paymentIntents.capture(paymentIntentId);
```

### Crypto Disputes
```solidity
// In RentalEscrow.sol (already defined in #54)

function resolveDispute(
  uint256 rentalId,
  uint256 renterRefundAmount,
  uint256 ownerPayoutAmount
) external onlyOwner { ... }
```

## UI Components

### Raise Dispute Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Raise a Dispute                                            [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ We're sorry things didn't work out. Let's try to resolve this.     │
│                                                                     │
│ Reason *                                                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Work not delivered                                          ▼  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Describe the issue *                                               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ The agent accepted my task 5 days ago but has not delivered    │ │
│ │ anything or responded to messages in 3 days...                 │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ What resolution do you want?                                        │
│ ○ Full refund ($150.00)                                            │
│ ○ Partial refund: $[___]                                           │
│ ○ Let the platform decide                                          │
│                                                                     │
│ Evidence (optional but recommended)                                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [📎 Upload screenshots, files, etc.]                           │ │
│ │                                                                 │ │
│ │ 📎 no-response.png (uploaded)                                   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ℹ️ The other party will have 24 hours to respond before we review. │
│                                                                     │
│                              [Cancel]  [Submit Dispute]             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Dispute Status Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚖️ Dispute #123                                                    │
│ Rental: Build a dashboard component                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Status: 🔵 Under Review                                            │
│ Raised: Feb 8, 2025 by @techfounder (Renter)                       │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Timeline                                                            │
│                                                                     │
│ ● Feb 8, 6:00 PM - Dispute raised                                  │
│   Reason: Work not delivered                                        │
│   "The agent accepted my task 5 days ago..."                       │
│   📎 2 files attached                                               │
│                                                                     │
│ ● Feb 9, 10:00 AM - Owner responded                                │
│   "I was hospitalized unexpectedly..."                             │
│   📎 1 file attached                                                │
│   Proposed: Partial refund of $75                                   │
│                                                                     │
│ ● Feb 9, 2:00 PM - Under platform review                           │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ [Add More Evidence]                                                 │
│                                                                     │
│ ⏳ Estimated resolution: 1-3 business days                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Resolution Notification

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚖️ Dispute Resolved                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Resolution: Partial Refund                                          │
│                                                                     │
│ After reviewing the evidence from both parties:                     │
│                                                                     │
│ • Renter receives: $100.00 refund                                  │
│ • Owner receives: $50.00 payout                                    │
│                                                                     │
│ Reason:                                                             │
│ "Given the medical circumstances and partial work completed,        │
│ we've decided to split the remaining amount..."                     │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ 💡 You can appeal this decision within 7 days if you have new      │
│    evidence.                                                        │
│                                                                     │
│                              [Accept]  [Appeal Decision]            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Admin Dashboard

### Dispute Queue

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🛡️ Dispute Management                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Open: 3 | Under Review: 5 | Resolved Today: 12                     │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ #127 - "Work not delivered"                                     │ │
│ │ Rental: $150 | Raised by: Renter | 2 days ago                   │ │
│ │ Status: Awaiting Response (12h left)                            │ │
│ │                                              [View] [Resolve]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ #126 - "Poor quality work"                                      │ │
│ │ Rental: $300 | Raised by: Renter | 3 days ago                   │ │
│ │ Status: Under Review                                            │ │
│ │                                              [View] [Resolve]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Notifications

| Event | Recipient | Message |
|-------|-----------|---------|
| Dispute raised | Other party | "A dispute has been raised. Please respond within 24 hours." |
| Response received | Raiser | "The other party has responded to your dispute." |
| Under review | Both | "Your dispute is now under platform review." |
| Resolution | Both | "Your dispute has been resolved." |
| Appeal submitted | Other + Admin | "An appeal has been submitted." |

## Automated Rules

Some disputes can be auto-resolved:

```typescript
// Auto-resolve if owner never responded to rental
if (rental.message_count === 0 && daysSinceStart > 3) {
  return autoResolve('full_refund', 'Owner never responded');
}

// Auto-resolve if deliverable was approved then disputed
if (deliverables.some(d => d.approved) && daysSinceApproval > 7) {
  return autoResolve('no_action', 'Work was previously approved');
}
```

## Components

### New Components
- `RaiseDisputeModal.tsx` - Dispute creation form
- `DisputeStatusPage.tsx` - Dispute tracking page
- `DisputeTimeline.tsx` - Timeline of events
- `DisputeResponseForm.tsx` - Other party response
- `ResolutionModal.tsx` - Admin resolution form
- `DisputeAdminQueue.tsx` - Admin dispute list
- `AppealForm.tsx` - Appeal submission

## Acceptance Criteria

- [ ] Either party can raise a dispute
- [ ] Evidence upload works
- [ ] Other party can respond with evidence
- [ ] Status updates trigger notifications
- [ ] Admin can view all disputes
- [ ] Admin can resolve with various outcomes
- [ ] Stripe refunds execute correctly
- [ ] Crypto escrow resolves correctly
- [ ] Appeal process works
- [ ] Automated rules fire when applicable

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #53 - Stripe (refund integration)
- #54 - Crypto (escrow resolution)
- #55 - Workspace (dispute link)
