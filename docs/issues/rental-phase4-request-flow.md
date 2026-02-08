# Phase 4: Rental Request & Approval Flow

Part of Epic #48 - Agent Rental Marketplace
Depends on: #49 (Database), #50 (Profiles), #51 (Marketplace)

## Overview

Implement the end-to-end flow for requesting, approving, and initiating a rental between a renter and an agent owner.

## User Stories

### As a Renter, I want to...
- [ ] Click "Rent This Agent" from the marketplace
- [ ] Select my rental type (task/hourly/token)
- [ ] Describe my task/needs
- [ ] See estimated cost before submitting
- [ ] Submit a rental request
- [ ] Get notified when my request is approved/rejected
- [ ] Proceed to payment after approval
- [ ] Cancel my request before approval

### As an Agent Owner, I want to...
- [ ] Get notified of new rental requests
- [ ] View request details (task, renter info)
- [ ] Approve or reject requests with a message
- [ ] Auto-approve requests from verified users (if enabled)
- [ ] See my pending requests in dashboard
- [ ] Suggest different terms before approving

## Rental Request Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RENTAL REQUEST FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  Renter clicks   │
    │ "Rent This Agent"│
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Select rental   │
    │      type        │
    │ Task/Hourly/Token│
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Fill in details │
    │ - Task desc      │
    │ - Est. hours     │
    │ - Budget         │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐     ┌──────────────────┐
    │  Submit request  │────▶│ Status:          │
    │                  │     │ pending_approval │
    └──────────────────┘     └────────┬─────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
           ┌───────────────┐                   ┌───────────────┐
           │ Auto-approve? │                   │ Manual review │
           │ (verified +   │                   │ by owner      │
           │  setting on)  │                   │               │
           └───────┬───────┘                   └───────┬───────┘
                   │                                   │
                   ▼                                   ▼
           ┌───────────────┐               ┌───────────────────┐
           │ Status:       │               │ Owner decides:    │
           │ pending_      │               │ Approve / Reject  │
           │ payment       │               │ / Counter-offer   │
           └───────┬───────┘               └─────────┬─────────┘
                   │                                 │
                   │         ┌───────────────────────┤
                   │         │                       │
                   │         ▼                       ▼
                   │  ┌─────────────┐        ┌─────────────┐
                   │  │ Status:     │        │ Status:     │
                   │  │ rejected    │        │ pending_    │
                   │  │             │        │ payment     │
                   │  └─────────────┘        └──────┬──────┘
                   │                                │
                   └────────────────────────────────┤
                                                    │
                                                    ▼
                                           ┌───────────────┐
                                           │ Proceed to    │
                                           │ Payment       │
                                           │ (Phase 5/6)   │
                                           └───────────────┘
```

## UI Components

### Rental Request Modal

Triggered by "Rent This Agent" button.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🚀 Rent CodeMaster AI                                         [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Select Rental Type                                                  │
│                                                                     │
│ ┌─────────────────────┐ ┌─────────────────────┐                    │
│ │ 📋 Per-Task         │ │ ⏱️ Hourly           │                    │
│ │ Fixed price for a   │ │ Pay by the hour    │                    │
│ │ specific task       │ │                    │                    │
│ │                     │ │                    │                    │
│ │ $50 - $500          │ │ $75/hour           │                    │
│ │ [● Selected]        │ │ [ ]                │                    │
│ └─────────────────────┘ └─────────────────────┘                    │
│                                                                     │
│ ┌─────────────────────┐                                            │
│ │ 🔌 API/Token        │                                            │
│ │ Programmatic access │                                            │
│ │ $0.02/1k tokens     │                                            │
│ │ [ ]                 │                                            │
│ └─────────────────────┘                                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Task Details                                                        │
│                                                                     │
│ Title *                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Build a dashboard component                                     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Description *                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ I need a React dashboard component that displays analytics      │ │
│ │ data with charts. Should include:                               │ │
│ │ - Line chart for trends                                         │ │
│ │ - Bar chart for comparisons                                     │ │
│ │ - Data table with sorting                                       │ │
│ │                                                                 │ │
│ │ Must use shadcn/ui components and be responsive.                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Your Budget *                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ $ 150                                                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Agent's range: $50 - $500                                          │
│                                                                     │
│ Attachments (optional)                                              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [📎 Upload files]  mockup.png (2.3 MB)  [x]                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Estimated Cost                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Task:          $150.00                                          │ │
│ │ Platform Fee:  $ 15.00 (10%)                                    │ │
│ │ ─────────────────────────                                       │ │
│ │ Total:         $165.00                                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ⚠️ This agent requires approval before payment.                    │
│ You won't be charged until the owner accepts your request.         │
│                                                                     │
│                    [Cancel]  [Submit Request]                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### For Hourly Rentals

```
│ Estimated Hours *                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 4 hours                                                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Estimated Cost                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 4 hours × $75/hr: $300.00                                       │ │
│ │ Platform Fee:     $ 30.00 (10%)                                 │ │
│ │ ─────────────────────────────                                   │ │
│ │ Estimated Total:  $330.00                                       │ │
│ │                                                                 │ │
│ │ ℹ️ Final cost based on actual time used.                       │ │
│ │ Unused time is refunded.                                        │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

### For Token/API Rentals

```
│ Token Budget *                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 1,000,000 tokens                                                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ = $20.00 ($0.02 per 1,000 tokens)                                  │
│                                                                     │
│ Use Case                                                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Integration with my coding assistant for code reviews           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

### Owner's Request Review Panel

In Dashboard → Rentals tab or `/rentals/incoming`

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📨 Rental Request                                          [New!]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ From: @techfounder                      Requested: 5 minutes ago   │
│ Agent: CodeMaster AI                                                │
│                                                                     │
│ Type: Per-Task                                                      │
│ Budget: $150.00                                                     │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Title: Build a dashboard component                                  │
│                                                                     │
│ Description:                                                        │
│ I need a React dashboard component that displays analytics          │
│ data with charts. Should include:                                   │
│ - Line chart for trends                                             │
│ - Bar chart for comparisons                                         │
│ - Data table with sorting                                           │
│                                                                     │
│ Must use shadcn/ui components and be responsive.                    │
│                                                                     │
│ Attachments:                                                        │
│ 📎 mockup.png                                                       │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Renter Info:                                                        │
│ • Member since: Jan 2025                                            │
│ • Previous rentals: 3                                               │
│ • Rating as renter: ⭐ 4.8                                          │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Your Earnings: $135.00 (after 10% platform fee)                     │
│                                                                     │
│ Message to renter (optional):                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│        [Counter-Offer]   [Reject]   [✓ Approve]                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST `/api/rentals`
Create a new rental request.

**Request:**
```json
{
  "agent_id": 1,
  "rental_type": "task",
  "task_title": "Build a dashboard component",
  "task_description": "I need a React dashboard...",
  "agreed_rate": 150.00,
  "currency": "USD",
  "attachments": [
    { "url": "...", "filename": "mockup.png", "type": "image/png" }
  ],
  // For hourly:
  "estimated_hours": 4,
  // For token:
  "token_limit": 1000000
}
```

**Response:**
```json
{
  "rental": {
    "id": 123,
    "status": "pending_approval",
    "agent_id": 1,
    "rental_type": "task",
    "agreed_rate": 150.00,
    "estimated_total": 150.00,
    "platform_fee": 15.00,
    ...
  }
}
```

### GET `/api/rentals`
List user's rentals (as renter or owner).

**Query Parameters:**
```
role    - 'renter' or 'owner' (required)
status  - Filter by status
limit   - Results per page
offset  - Pagination
```

### GET `/api/rentals/[id]`
Get rental details.

### POST `/api/rentals/[id]/approve`
Owner approves rental request.

**Request:**
```json
{
  "message": "Looks great! I can start tomorrow."
}
```

### POST `/api/rentals/[id]/reject`
Owner rejects rental request.

**Request:**
```json
{
  "message": "Sorry, I'm fully booked this week."
}
```

### POST `/api/rentals/[id]/counter`
Owner makes counter-offer.

**Request:**
```json
{
  "new_rate": 200.00,
  "message": "This is more complex than it seems. I'd need $200 for this."
}
```

### POST `/api/rentals/[id]/accept-counter`
Renter accepts counter-offer.

### POST `/api/rentals/[id]/cancel`
Cancel a pending rental (before payment).

## Notifications

| Event | Recipient | Type | Message |
|-------|-----------|------|---------|
| Request submitted | Owner | `rental_request` | "New rental request from @user for AgentName" |
| Request approved | Renter | `rental_approved` | "Your rental request was approved! Proceed to payment." |
| Request rejected | Renter | `rental_rejected` | "Your rental request was declined." |
| Counter-offer | Renter | `rental_counter` | "The owner made a counter-offer. Review it now." |
| Request expired | Both | `rental_expired` | "Rental request expired without response." |

## Auto-Approval Logic

```typescript
function shouldAutoApprove(rental: Rental, profile: RentalProfile, renter: User): boolean {
  // Auto-accept all requests
  if (!profile.requires_approval) {
    return true;
  }
  
  // Auto-accept from verified users
  if (profile.auto_accept_verified && renter.is_verified) {
    return true;
  }
  
  // Otherwise, require manual approval
  return false;
}
```

## Expiration

- Pending requests expire after **48 hours** without response
- Expired requests are auto-cancelled
- Cron job checks hourly for expired requests

## Validation Rules

### Task Rentals
- Title: 5-200 characters
- Description: 20-5000 characters
- Budget: within agent's min/max range

### Hourly Rentals
- Estimated hours: 0.5-100 hours
- Must be within agent's min/max duration

### Token Rentals
- Token limit: 10,000 - 100,000,000
- Must have valid use case description

## Database Updates

On request creation:
```sql
INSERT INTO rentals (
  agent_id, renter_id, owner_id,
  rental_type, agreed_rate, estimated_total, platform_fee,
  status, task_title, task_description
) VALUES (...);

-- Create initial system message
INSERT INTO rental_messages (
  rental_id, sender_type, message_type, content
) VALUES (
  $rental_id, 'system', 'status_change',
  'Rental request submitted'
);
```

On approval:
```sql
UPDATE rentals 
SET status = 'pending_payment', updated_at = NOW()
WHERE id = $id;

-- Add approval message
INSERT INTO rental_messages (...);
```

## Components

### New Components
- `RentalRequestModal.tsx` - Full request form
- `RentalTypeSelector.tsx` - Task/Hourly/Token picker
- `TaskDetailsForm.tsx` - Task-specific inputs
- `HourlyDetailsForm.tsx` - Hourly-specific inputs
- `TokenDetailsForm.tsx` - Token-specific inputs
- `CostEstimate.tsx` - Price breakdown display
- `IncomingRequests.tsx` - Owner's request queue
- `RequestReviewCard.tsx` - Single request card
- `CounterOfferModal.tsx` - Counter-offer form
- `RentalStatusBadge.tsx` - Status indicator

## Acceptance Criteria

- [ ] "Rent This Agent" opens request modal
- [ ] All three rental types work correctly
- [ ] Cost estimate updates in real-time
- [ ] File uploads work
- [ ] Request submits and creates rental record
- [ ] Owner receives notification
- [ ] Owner can view request in dashboard
- [ ] Approve/Reject/Counter flows work
- [ ] Renter receives notification of decision
- [ ] Auto-approval works when configured
- [ ] Expired requests handled correctly
- [ ] Validation errors shown clearly

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #49 - Database Schema (dependency)
- #50 - Rental Profile Management (dependency)
- #51 - Marketplace Browse (dependency)
- #52 - Stripe Payment (blocked by this)
- #53 - Crypto Payment (blocked by this)
