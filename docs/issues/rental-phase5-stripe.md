# Phase 5: Payment Integration (Stripe Connect)

Part of Epic #48 - Agent Rental Marketplace
Depends on: #52 (Request Flow)

## Overview

Implement fiat payment processing using Stripe Connect, allowing renters to pay with credit cards and owners to receive payouts directly to their bank accounts.

## Why Stripe Connect?

- **Split Payments**: Automatically split between platform (10%) and owner (90%)
- **Escrow-like**: Hold funds until work is complete
- **Onboarding**: Owners verify identity and add bank details through Stripe
- **Compliance**: Stripe handles tax forms (1099s), PCI compliance, etc.
- **Global**: Support for 40+ countries

## User Stories

### As an Agent Owner, I want to...
- [ ] Connect my Stripe account to receive payments
- [ ] Complete identity verification through Stripe
- [ ] Add my bank account for payouts
- [ ] See my pending and completed payouts
- [ ] Receive payouts automatically after rental completion

### As a Renter, I want to...
- [ ] Pay with my credit/debit card
- [ ] See the total cost including fees before paying
- [ ] Get a receipt for my payment
- [ ] Know my payment is held safely until work is done
- [ ] Get refunded if there's a dispute

## Stripe Connect Flow

### Owner Onboarding

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STRIPE CONNECT ONBOARDING                        │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Owner clicks     │
    │ "Connect Stripe" │
    │ in rental settings│
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Create Stripe    │
    │ Connect Account  │
    │ (Express mode)   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Redirect to      │
    │ Stripe onboarding│
    │ - Email          │
    │ - Phone          │
    │ - Business type  │
    │ - Bank account   │
    │ - Identity verify│
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Redirect back    │
    │ to The Jam       │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Save account ID  │
    │ Mark complete    │
    │ Enable fiat      │
    └──────────────────┘
```

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RENTAL PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Rental approved  │
    │ Status: pending_ │
    │ payment          │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Create Payment   │
    │ Intent with      │
    │ transfer_data:   │
    │ - destination:   │
    │   owner_acct     │
    │ - amount: 90%    │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Show Stripe      │
    │ Payment Element  │
    │ to renter        │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Renter enters    │
    │ card details     │
    │ and confirms     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Payment Intent   │
    │ confirmed        │
    │ (funds captured) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Rental status:   │
    │ escrow_funded    │
    │ → active         │
    └──────────────────┘

    ... rental in progress ...

    ┌──────────────────┐
    │ Rental completed │
    │ successfully     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Transfer to      │
    │ owner's account  │
    │ (automatic via   │
    │  transfer_data)  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Owner receives   │
    │ payout to bank   │
    │ (Stripe schedule)│
    └──────────────────┘
```

## API Endpoints

### Stripe Connect Onboarding

#### POST `/api/stripe/connect/create`
Create a Connect account for the owner.

**Response:**
```json
{
  "account_id": "acct_xxxxx",
  "onboarding_url": "https://connect.stripe.com/..."
}
```

#### GET `/api/stripe/connect/callback`
Handle OAuth callback after Stripe onboarding.

#### GET `/api/stripe/connect/status`
Check Connect account status.

**Response:**
```json
{
  "connected": true,
  "account_id": "acct_xxxxx",
  "charges_enabled": true,
  "payouts_enabled": true,
  "details_submitted": true,
  "requirements": []
}
```

#### GET `/api/stripe/connect/dashboard`
Get link to Stripe Express Dashboard.

**Response:**
```json
{
  "dashboard_url": "https://connect.stripe.com/express/..."
}
```

### Payments

#### POST `/api/rentals/[id]/pay`
Initiate payment for an approved rental.

**Request:**
```json
{
  "payment_method": "stripe"
}
```

**Response:**
```json
{
  "client_secret": "pi_xxxxx_secret_xxxxx",
  "payment_intent_id": "pi_xxxxx",
  "amount": 16500,
  "currency": "usd"
}
```

#### POST `/api/rentals/[id]/pay/confirm`
Confirm payment was successful (webhook also handles this).

#### GET `/api/rentals/[id]/invoice`
Get invoice/receipt for a rental.

**Response:**
```json
{
  "invoice": {
    "rental_id": 123,
    "amount": 165.00,
    "platform_fee": 15.00,
    "owner_payout": 150.00,
    "stripe_fee": 5.08,
    "currency": "USD",
    "status": "paid",
    "receipt_url": "https://receipt.stripe.com/..."
  }
}
```

### Webhooks

#### POST `/api/stripe/webhooks`
Handle Stripe webhook events.

**Events to handle:**
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment failed
- `account.updated` - Connect account updated
- `transfer.created` - Transfer to owner initiated
- `payout.paid` - Owner received bank payout

## Stripe Integration Details

### Connect Account Creation (Express)

```typescript
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US', // or from user profile
  email: owner.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'individual',
  metadata: {
    owner_id: owner.id,
    agent_id: agent.id,
  },
});

// Save account.id to agent_rental_profiles.stripe_account_id
```

### Account Link (Onboarding URL)

```typescript
const accountLink = await stripe.accountLinks.create({
  account: accountId,
  refresh_url: `${baseUrl}/agents/${slug}/edit?tab=rental&stripe=refresh`,
  return_url: `${baseUrl}/agents/${slug}/edit?tab=rental&stripe=complete`,
  type: 'account_onboarding',
});

// Redirect to accountLink.url
```

### Payment Intent with Destination Charge

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalAmount * 100), // in cents
  currency: 'usd',
  payment_method_types: ['card'],
  
  // Split payment: 90% to owner, 10% to platform
  transfer_data: {
    destination: ownerStripeAccountId,
    amount: Math.round(ownerPayout * 100), // 90% of amount
  },
  
  metadata: {
    rental_id: rental.id,
    agent_id: rental.agent_id,
    renter_id: rental.renter_id,
  },
  
  // Capture immediately (or use capture_method: 'manual' for escrow)
  capture_method: 'automatic',
});
```

### For Escrow-Style (Hold then Release)

```typescript
// Create with manual capture
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount,
  currency: 'usd',
  capture_method: 'manual', // Don't charge yet
  transfer_data: {
    destination: ownerStripeAccountId,
    amount: ownerPayout,
  },
  // Authorization valid for 7 days
});

// When rental completes, capture the payment
await stripe.paymentIntents.capture(paymentIntentId);

// For refund
await stripe.paymentIntents.cancel(paymentIntentId);
// or
await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount, // partial refund
});
```

## UI Components

### Stripe Connect Button

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💳 Payment Methods                                                 │
│                                                                     │
│ Stripe (Credit Card)                                               │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [✓] Accept card payments                                        │ │
│ │                                                                  │ │
│ │ ┌────────────────────────────────────────────────────────────┐  │ │
│ │ │ ✅ Stripe Connected                                        │  │ │
│ │ │                                                            │  │ │
│ │ │ Account: Express account                                   │  │ │
│ │ │ Status: ✓ Charges enabled | ✓ Payouts enabled             │  │ │
│ │ │                                                            │  │ │
│ │ │ [View Dashboard]  [Disconnect]                             │  │ │
│ │ └────────────────────────────────────────────────────────────┘  │ │
│ │                                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ -- OR (if not connected) --                                        │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [ ] Accept card payments                                        │ │
│ │                                                                  │ │
│ │ ┌────────────────────────────────────────────────────────────┐  │ │
│ │ │ 💳 Connect Stripe to accept card payments                  │  │ │
│ │ │                                                            │  │ │
│ │ │ [Connect with Stripe]                                      │  │ │
│ │ │                                                            │  │ │
│ │ │ You'll need to verify your identity and add a bank        │  │ │
│ │ │ account to receive payouts.                               │  │ │
│ │ └────────────────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Payment Modal (Renter)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💳 Complete Payment                                           [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Rental: Build a dashboard component                                 │
│ Agent: CodeMaster AI                                                │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Task Amount:      $150.00                                          │
│ Platform Fee:     $ 15.00                                          │
│ ─────────────────────────                                          │
│ Total:            $165.00                                          │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Card Details                                                        │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │  [Stripe Payment Element - Card number, expiry, CVC]           │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ 🔒 Your payment is processed securely by Stripe.                   │
│    Funds are held until work is complete.                          │
│                                                                     │
│                              [Pay $165.00]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Updates

```sql
-- After Stripe Connect onboarding
UPDATE agent_rental_profiles
SET 
  stripe_account_id = 'acct_xxxxx',
  stripe_onboarding_complete = true,
  accepts_fiat = true
WHERE agent_id = $agent_id;

-- After payment success
UPDATE rentals
SET 
  status = 'escrow_funded',
  payment_method = 'stripe',
  stripe_payment_intent_id = 'pi_xxxxx'
WHERE id = $rental_id;
```

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
```

## Webhook Security

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Process event based on type
switch (event.type) {
  case 'payment_intent.succeeded':
    await handlePaymentSuccess(event.data.object);
    break;
  case 'payment_intent.payment_failed':
    await handlePaymentFailed(event.data.object);
    break;
  // ...
}
```

## Fee Structure

| Component | Percentage | Example ($100 rental) |
|-----------|------------|----------------------|
| Rental Amount | - | $100.00 |
| Platform Fee | 10% | $10.00 |
| **Renter Pays** | - | **$110.00** |
| Stripe Fee (~2.9% + $0.30) | - | ~$3.49 |
| **Owner Receives** | - | **~$96.51** |

Note: Stripe fees come out of platform's 10%, not owner's 90%.

## Components

### New Components
- `StripeConnectButton.tsx` - Connect/disconnect Stripe
- `StripeConnectStatus.tsx` - Show account status
- `PaymentModal.tsx` - Card payment form
- `StripePaymentElement.tsx` - Stripe Elements wrapper
- `PaymentReceipt.tsx` - Show receipt after payment
- `OwnerPayoutHistory.tsx` - List of payouts received

## Testing

- Use Stripe test mode with test cards
- Test card: `4242 4242 4242 4242`
- Test Connect account: Use Stripe's test account

## Acceptance Criteria

- [ ] Stripe Connect onboarding works
- [ ] Connect status shows correctly
- [ ] Payment Intent created on rental approval
- [ ] Stripe Elements payment form works
- [ ] Payment success updates rental status
- [ ] Webhook handles all payment events
- [ ] Refunds work for disputes
- [ ] Owner can view payout history
- [ ] Error handling for failed payments
- [ ] Test mode works in development

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #52 - Rental Request Flow (dependency)
- #53 - Crypto Payment (parallel)
- #54 - Active Rental Workspace (blocked by this)
