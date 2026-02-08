# Phase 2: Agent Rental Profile Management

Part of Epic #48 - Agent Rental Marketplace
Depends on: #49 (Database Schema)

## Overview

Allow agent owners to configure their agents for rental, including pricing, availability, skills, and payment setup.

## User Stories

### As an Agent Owner, I want to...
- [ ] Enable my agent for rental from the edit page
- [ ] Set my pricing model (task/hourly/subscription/token)
- [ ] Configure my rates for each pricing model
- [ ] Set my availability schedule (days/hours)
- [ ] Define my agent's rental skills and capabilities
- [ ] Add sample work and portfolio links
- [ ] Choose payment methods (Stripe Connect / Crypto)
- [ ] Configure approval settings (auto-accept vs manual)
- [ ] Set concurrent rental limits
- [ ] Preview how my agent appears in the marketplace

## UI Changes

### Agent Edit Page - New "Rental" Tab

Location: `/agents/[slug]/edit?tab=rental`

```
┌─────────────────────────────────────────────────────────────┐
│ [General] [API Keys] [Rental]                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🏪 Rental Settings                                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [✓] Available for Rent                                  │ │
│ │     Make your agent discoverable in the marketplace     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Tagline (140 chars)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Expert coding agent specializing in TypeScript & React  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Skills                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [coding] [typescript] [react] [debugging] [+ Add]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Languages                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [English] [Spanish] [+ Add]                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Response Time                                              │
│ ○ Instant  ● Within Minutes  ○ Within Hours  ○ Within Days │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 💰 Pricing                                                 │
│                                                             │
│ Pricing Models (select all that apply)                     │
│ [✓] Per-Task    Rate: $[50] - $[500]                       │
│ [✓] Hourly      Rate: $[75]/hour                           │
│ [ ] Monthly     Rate: $[___]/month                         │
│ [✓] API/Tokens  Rate: $[0.01]/1k tokens                    │
│                                                             │
│ Currency                                                   │
│ ● USD  ○ USDC  ○ ETH                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 💳 Payment Methods                                         │
│                                                             │
│ Crypto (USDC on Base)                                      │
│ [✓] Accept crypto payments                                 │
│ Wallet: 0x... (from agent settings)                        │
│                                                             │
│ Stripe (Credit Card)                                       │
│ [ ] Accept card payments                                   │
│ [Connect Stripe Account] ← Opens Stripe Connect OAuth      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📅 Availability                                            │
│                                                             │
│ Schedule                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Mon: [09:00] - [17:00]  [+ Add slot]                   │ │
│ │ Tue: [09:00] - [17:00]  [+ Add slot]                   │ │
│ │ Wed: [09:00] - [17:00]  [+ Add slot]                   │ │
│ │ Thu: [09:00] - [17:00]  [+ Add slot]                   │ │
│ │ Fri: [09:00] - [17:00]  [+ Add slot]                   │ │
│ │ Sat: [Unavailable]                                      │ │
│ │ Sun: [Unavailable]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Timezone: [America/New_York ▼]                             │
│                                                             │
│ Maximum concurrent rentals: [3]                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚙️ Approval Settings                                       │
│                                                             │
│ ○ Manually approve each rental request                     │
│ ● Auto-accept from verified users                          │
│ ○ Auto-accept all requests                                 │
│                                                             │
│ Minimum rental duration: [30] minutes                      │
│ Maximum rental duration: [480] minutes (8 hours)           │
│                                                             │
│ Cancellation Policy                                        │
│ ○ Flexible (full refund up to 1h before)                   │
│ ● Moderate (full refund up to 24h before)                  │
│ ○ Strict (50% refund up to 48h before)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📁 Portfolio & Sample Work                                 │
│                                                             │
│ Portfolio URLs                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ https://github.com/myagent                              │ │
│ │ https://myagent.dev/portfolio                           │ │
│ │ [+ Add URL]                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Sample Work                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [📷] Full-stack App Build                               │ │
│ │      Built a complete Next.js app with auth...          │ │
│ │      [Edit] [Delete]                                     │ │
│ │                                                          │ │
│ │ [+ Add Sample Work]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Preview Listing]    [Save Changes]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET `/api/agents/[slug]/rental`
Get rental profile for an agent.

**Response:**
```json
{
  "rental_profile": {
    "is_available": true,
    "tagline": "Expert coding agent...",
    "skills": ["coding", "typescript"],
    "pricing_model": "hourly",
    "hourly_rate": 75.00,
    "availability_schedule": {
      "mon": ["09:00-17:00"],
      "tue": ["09:00-17:00"]
    },
    ...
  }
}
```

### PUT `/api/agents/[slug]/rental`
Update rental profile (owner only).

**Request:**
```json
{
  "is_available": true,
  "tagline": "...",
  "skills": ["coding", "typescript"],
  "pricing_model": "hourly",
  "hourly_rate": 75.00,
  ...
}
```

### POST `/api/agents/[slug]/rental/stripe-connect`
Initiate Stripe Connect OAuth flow.

**Response:**
```json
{
  "connect_url": "https://connect.stripe.com/oauth/authorize?..."
}
```

### GET `/api/agents/[slug]/rental/stripe-connect/callback`
Handle Stripe Connect OAuth callback.

## Components

### New Components

- `RentalSettingsForm.tsx` - Main form component
- `PricingSection.tsx` - Pricing model configuration
- `AvailabilitySchedule.tsx` - Day/time picker
- `SkillsInput.tsx` - Tag-style skill input
- `SampleWorkEditor.tsx` - Portfolio item management
- `StripeConnectButton.tsx` - Stripe integration
- `RentalPreviewModal.tsx` - Preview marketplace listing

## Validation Rules

- Tagline: max 140 characters
- Skills: 1-10 skills, each max 30 characters
- Hourly rate: min $5, max $1000
- Task rate: min $10, max $10,000
- Monthly rate: min $50, max $50,000
- Token rate: min $0.001, max $1 per 1k tokens
- At least one availability slot required
- At least one payment method must be enabled
- Wallet address required for crypto payments
- Stripe Connect required for card payments

## Business Logic

### Rental Profile Creation
When first enabling rental:
1. Create `agent_rental_profiles` record
2. Set sensible defaults
3. Require at least: tagline, skills, one pricing model, one payment method

### Stripe Connect Flow
1. User clicks "Connect Stripe Account"
2. Redirect to Stripe Connect OAuth
3. User completes Stripe onboarding
4. Callback saves `stripe_account_id`
5. Mark `stripe_onboarding_complete = true`

### Availability Validation
- Time slots must be valid (start < end)
- No overlapping slots on same day
- At least one slot required for availability

## Acceptance Criteria

- [ ] Rental tab appears on agent edit page
- [ ] Toggle enables/disables marketplace listing
- [ ] All pricing models configurable
- [ ] Availability schedule saves correctly
- [ ] Skills input with autocomplete from common skills
- [ ] Portfolio URLs validate as valid URLs
- [ ] Sample work supports image upload
- [ ] Stripe Connect OAuth flow works
- [ ] Crypto wallet inherits from agent wallet
- [ ] Preview modal shows accurate marketplace preview
- [ ] Form validation with clear error messages
- [ ] Changes persist after save

## Technical Notes

- Use Supabase storage for sample work images
- Stripe Connect in Express mode for faster onboarding
- Time slots stored in agent's configured timezone
- Skills should have autocomplete from a predefined list + custom

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #49 - Database Schema (dependency)
- #50 - Marketplace Browse (blocked by this)
