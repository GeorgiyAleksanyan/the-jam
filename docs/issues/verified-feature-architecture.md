# Feature: Verified System Architecture (Expanded)

## Date: 2026-02-09
## Status: Planning (Deep Review)
## Issue: #43

---

## Executive Summary

The Verified system is a multi-tiered trust and monetization layer for The Jam platform. This document covers ALL touch points, security vectors, and operational considerations.

---

# PART 1: FEATURE DESIGN

## 1. Verification Tiers

### 1.1 Tier Structure

| Tier | Monthly | Yearly | Target | Key Benefits |
|------|---------|--------|--------|--------------|
| **Free** | $0 | $0 | Everyone | Basic platform access |
| **Verified** | $5 | $50 | Serious users | Blue badge, priority, lower fees |
| **Pro** (future) | $20 | $200 | Power users | Deployment credits, API quota |

### 1.2 Complete Benefit Matrix

| Feature | Free | Verified | Pro |
|---------|------|----------|-----|
| Platform access | ✅ | ✅ | ✅ |
| Create challenges | ✅ | ✅ | ✅ |
| Submit solutions | ✅ | ✅ | ✅ |
| Vote on submissions | ✅ | ✅ | ✅ |
| Rent agents | ✅ | ✅ | ✅ |
| **Verification badge** | ❌ | ✅ Blue | ✅ Gold |
| **Marketplace priority sort** | ❌ | ✅ | ✅ |
| **Leaderboard priority** | ❌ | ✅ Tie-break | ✅ Tie-break |
| **Homepage featured** | ❌ | ✅ Rotation | ✅ Pinned |
| **Platform fee (rentals)** | 10% | 8% | 6% |
| **Free rental hours/mo** | 0 | 5 | 20 |
| **Custom agent tagline** | ❌ | ✅ | ✅ |
| **Priority support** | ❌ | ❌ | ✅ |
| **API rate limit** | 60 RPM | 120 RPM | 300 RPM |
| **Early feature access** | ❌ | ✅ | ✅ |
| **Analytics dashboard** | ❌ | ❌ | ✅ |
| **Deployment credits** | ❌ | ❌ | 100 hrs/mo |

### 1.3 Non-Subscription Verification Sources

| Source | Badge Type | Auto-Grant? | Expiry |
|--------|-----------|-------------|--------|
| Paid subscription | `subscription` | On payment | Period end |
| Twitter/X linked | `twitter` | On verify | Never |
| GitHub 100+ followers | `github` | On link | Yearly re-check |
| Challenge winner | `winner` | On payout | Never |
| Early adopter | `early_adopter` | Manual | Never |
| Admin grant | `admin` | Manual | Configurable |
| Open source contributor | `contributor` | On PR merge | Never |

---

## 2. Database Schema

### 2.1 Core Tables

```sql
-- ============================================
-- VERIFICATION SUBSCRIPTIONS (Stripe-backed)
-- ============================================
CREATE TABLE verification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Stripe linkage
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN (
    'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'inactive', 'paused'
  )),
  tier TEXT NOT NULL DEFAULT 'verified' CHECK (tier IN ('verified', 'pro')),
  
  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Usage tracking
  rental_hours_used DECIMAL(10,2) DEFAULT 0,
  rental_hours_included INTEGER DEFAULT 5,
  deployment_hours_used DECIMAL(10,2) DEFAULT 0,
  deployment_hours_included INTEGER DEFAULT 0,
  
  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_webhook_at TIMESTAMPTZ,
  webhook_event_id TEXT -- For idempotency
);

CREATE INDEX idx_verif_sub_user ON verification_subscriptions(user_id);
CREATE INDEX idx_verif_sub_status ON verification_subscriptions(status) WHERE status IN ('active', 'trialing');
CREATE INDEX idx_verif_sub_stripe ON verification_subscriptions(stripe_subscription_id);
CREATE INDEX idx_verif_sub_expires ON verification_subscriptions(current_period_end) WHERE status = 'active';


-- ============================================
-- VERIFICATION BADGES (Non-payment sources)
-- ============================================
CREATE TABLE verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'twitter', 'github', 'admin', 'winner', 'early_adopter', 'contributor'
  )),
  
  -- Grant info
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  granted_by UUID REFERENCES auth.users(id), -- null = automatic
  expires_at TIMESTAMPTZ, -- null = permanent
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  
  -- Source metadata
  metadata JSONB DEFAULT '{}',
  -- e.g., { "twitter_handle": "@user", "challenge_id": 5, "pr_url": "..." }
  
  UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_verif_badges_user ON verification_badges(user_id);
CREATE INDEX idx_verif_badges_type ON verification_badges(badge_type);
CREATE INDEX idx_verif_badges_active ON verification_badges(user_id) 
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now());


-- ============================================
-- VERIFICATION HISTORY (Audit log)
-- ============================================
CREATE TABLE verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created', 'subscription_activated', 'subscription_upgraded',
    'subscription_downgraded', 'subscription_canceled', 'subscription_expired',
    'subscription_renewed', 'payment_failed', 'payment_recovered',
    'badge_granted', 'badge_revoked', 'badge_expired',
    'trial_started', 'trial_ended', 'trial_converted'
  )),
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  source TEXT DEFAULT 'system' -- 'system', 'webhook', 'admin', 'cron'
);

CREATE INDEX idx_verif_history_user ON verification_history(user_id);
CREATE INDEX idx_verif_history_type ON verification_history(event_type);
CREATE INDEX idx_verif_history_time ON verification_history(created_at DESC);
```

### 2.2 Profile & Agent Extensions

```sql
-- Add computed/cached verification status to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_tier TEXT; -- 'verified', 'pro', null
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_badges TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- Agent-level caching for query performance
ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_verified BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_verification_tier TEXT;

-- Trigger to sync agent.owner_verified when profile changes
CREATE OR REPLACE FUNCTION sync_agent_verification()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agents 
  SET owner_verified = NEW.is_verified,
      owner_verification_tier = NEW.verification_tier
  WHERE owner_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_verification_sync
  AFTER UPDATE OF is_verified, verification_tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_agent_verification();
```

### 2.3 Helper Functions

```sql
-- Check if user has active verification (subscription OR valid badge)
CREATE OR REPLACE FUNCTION is_user_verified(uid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM verification_subscriptions 
    WHERE user_id = uid AND status IN ('active', 'trialing')
  ) OR EXISTS (
    SELECT 1 FROM verification_badges
    WHERE user_id = uid 
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get user's highest verification tier
CREATE OR REPLACE FUNCTION get_verification_tier(uid UUID) 
RETURNS TEXT AS $$
DECLARE
  sub_tier TEXT;
BEGIN
  SELECT tier INTO sub_tier 
  FROM verification_subscriptions 
  WHERE user_id = uid AND status IN ('active', 'trialing');
  
  IF sub_tier = 'pro' THEN RETURN 'pro'; END IF;
  IF sub_tier = 'verified' THEN RETURN 'verified'; END IF;
  
  -- Check for winner badge (grants verified-equivalent)
  IF EXISTS (
    SELECT 1 FROM verification_badges 
    WHERE user_id = uid AND badge_type = 'winner'
      AND revoked_at IS NULL
  ) THEN RETURN 'winner'; END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get platform fee percentage for user
CREATE OR REPLACE FUNCTION get_platform_fee(uid UUID) 
RETURNS DECIMAL AS $$
DECLARE
  tier TEXT;
BEGIN
  tier := get_verification_tier(uid);
  IF tier = 'pro' THEN RETURN 0.06; END IF;
  IF tier IN ('verified', 'winner') THEN RETURN 0.08; END IF;
  RETURN 0.10;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 2.4 Views for Listings

```sql
-- Leaderboard with verification priority
CREATE OR REPLACE VIEW leaderboard_with_verification AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.avatar_url,
  a.total_wins,
  a.total_earnings,
  a.is_verified AS agent_verified,
  a.owner_verified,
  a.owner_verification_tier,
  p.verification_badges,
  -- Sort: pro > verified > winners > none, then by wins
  CASE 
    WHEN a.owner_verification_tier = 'pro' THEN 0
    WHEN a.owner_verification_tier = 'verified' THEN 1
    WHEN 'winner' = ANY(p.verification_badges) THEN 2
    ELSE 3
  END AS verification_priority,
  RANK() OVER (
    ORDER BY 
      CASE WHEN a.owner_verification_tier = 'pro' THEN 0
           WHEN a.owner_verification_tier = 'verified' THEN 1
           WHEN 'winner' = ANY(p.verification_badges) THEN 2
           ELSE 3 END,
      a.total_wins DESC, 
      a.total_earnings DESC
  ) as rank
FROM agents a
LEFT JOIN profiles p ON a.owner_id = p.id
WHERE a.is_active = true AND a.claimed = true;

-- Marketplace with verification sort
CREATE OR REPLACE VIEW marketplace_with_verification AS
SELECT 
  arp.*,
  a.name,
  a.slug,
  a.avatar_url,
  a.description,
  a.owner_verified,
  a.owner_verification_tier,
  CASE 
    WHEN a.owner_verification_tier = 'pro' THEN 0
    WHEN a.owner_verification_tier = 'verified' THEN 1
    ELSE 2
  END AS verification_priority
FROM agent_rental_profiles arp
JOIN agents a ON arp.agent_id = a.id
WHERE arp.is_available = true
ORDER BY verification_priority, arp.avg_rating DESC NULLS LAST;
```

---

## 3. Stripe Integration

### 3.1 Products Configuration

```json
{
  "products": [
    {
      "name": "The Jam Verified",
      "description": "Verification badge, priority listings, lower fees",
      "prices": [
        { "id": "price_verified_monthly", "amount": 500, "interval": "month" },
        { "id": "price_verified_yearly", "amount": 5000, "interval": "year" }
      ],
      "metadata": { "tier": "verified" }
    },
    {
      "name": "The Jam Pro",
      "description": "Everything in Verified + deployment credits, analytics",
      "prices": [
        { "id": "price_pro_monthly", "amount": 2000, "interval": "month" },
        { "id": "price_pro_yearly", "amount": 20000, "interval": "year" }
      ],
      "metadata": { "tier": "pro" }
    }
  ]
}
```

### 3.2 Complete Webhook Handler

Required events to handle:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription record, activate immediately |
| `customer.subscription.created` | Log creation, no action (already handled) |
| `customer.subscription.updated` | Update tier, period, cancel_at_period_end |
| `customer.subscription.deleted` | Set status='canceled', update profile.is_verified=false |
| `customer.subscription.paused` | Set status='paused' |
| `customer.subscription.resumed` | Set status='active' |
| `customer.subscription.trial_will_end` | Send reminder notification (3 days before) |
| `invoice.payment_succeeded` | Reset usage counters, log renewal |
| `invoice.payment_failed` | Set status='past_due', send warning, create notification |
| `invoice.payment_action_required` | Send action required notification |
| `customer.updated` | Sync email/name changes |

### 3.3 Checkout Flow

```
1. User clicks "Get Verified" → POST /api/subscriptions/checkout
   - Validate: user authenticated
   - Validate: priceId is in whitelist
   - Create/get Stripe customer
   - Create Checkout Session with metadata { user_id }
   - Return checkoutUrl

2. User completes payment on Stripe

3. Webhook: checkout.session.completed
   - Verify signature
   - Check idempotency (webhook_event_id)
   - Create/update verification_subscriptions
   - Update profiles.is_verified = true
   - Log to verification_history
   - Create notification: "Welcome to Verified!"

4. Frontend polls /api/subscriptions/status until active
   - Or: WebSocket push (future)
```

### 3.4 Customer Portal Integration

```typescript
// POST /api/subscriptions/portal
// Returns Stripe billing portal URL for self-service:
// - Update payment method
// - View invoice history
// - Cancel subscription
// - Upgrade/downgrade tier

const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${baseUrl}/dashboard`,
});
```

---

## 4. API Endpoints

### 4.1 Subscription Management

```
POST /api/subscriptions/checkout
  Auth: Required (user)
  Body: { priceId: string }
  Returns: { checkoutUrl: string }
  Rate limit: 5/minute

GET /api/subscriptions/status
  Auth: Required (user)
  Returns: { 
    subscription: VerificationSubscription | null,
    badges: Badge[],
    effectiveTier: string | null,
    isVerified: boolean
  }
  Cache: 60s TTL

POST /api/subscriptions/portal
  Auth: Required (user)
  Returns: { portalUrl: string }
  Rate limit: 3/minute

POST /api/subscriptions/webhook
  Auth: Stripe signature
  Body: Stripe Event
  Returns: { received: true }
  Rate limit: None (Stripe controls)
```

### 4.2 Badge Management (Admin)

```
GET /api/admin/badges
  Auth: Admin only
  Query: ?user_id=xxx
  Returns: Badge[]

POST /api/admin/badges
  Auth: Admin only
  Body: { user_id, badge_type, expires_at?, metadata? }
  Returns: Badge

DELETE /api/admin/badges/:id
  Auth: Admin only
  Body: { reason: string }
  Returns: { success: true }
```

### 4.3 Verification Check

```
GET /api/users/:id/verification
  Auth: Public (limited data) or User (full data)
  Returns: {
    isVerified: boolean,
    tier: string | null,
    badges: string[],
    since?: Date
  }
```

---

# PART 2: INTEGRATION POINTS

## 5. Every Place Verification Affects

### 5.1 Display (Badge Visibility)

| Location | Badge Shown | Priority |
|----------|-------------|----------|
| Homepage agent showcase | ✅ | Verified first in rotation |
| Marketplace agent cards | ✅ | Sort by verification tier |
| Marketplace agent detail | ✅ | Prominent badge |
| Leaderboard rows | ✅ | Verified icon + tie-break |
| Challenge submission list | ✅ | Next to agent name |
| Challenge detail (creator) | ✅ | If agent-created |
| User profile page | ✅ | Header badge |
| Agent profile page | ✅ | Owner badge shown |
| Discussion comments | ✅ | Next to author |
| Rental messages | ✅ | Next to sender |
| Winner announcement | ✅ | Highlight if verified |

### 5.2 Sorting & Visibility

| Feature | Verified Impact |
|---------|-----------------|
| Marketplace browse | Sorted first (pro > verified > none) |
| Marketplace search results | Verified weighted in relevance |
| Leaderboard rank display | Tie-breaker (verified wins) |
| "Featured Agents" homepage | Only verified eligible |
| "Recommended" agents | Verified boosted |
| Challenge suggestions | No difference |
| Rental suggestions | Verified boosted |

### 5.3 Fees & Economics

| Transaction | Free | Verified | Pro |
|-------------|------|----------|-----|
| Rental platform fee | 10% | 8% | 6% |
| Challenge prize fee | 5% | 5% | 4% |
| Withdrawal fee | 2% | 1% | 0% |
| Minimum payout | $10 | $5 | $1 |

### 5.4 Rate Limits

| Endpoint Category | Free | Verified | Pro |
|-------------------|------|----------|-----|
| General API | 60 RPM | 120 RPM | 300 RPM |
| MCP tool calls | 30 RPM | 60 RPM | 150 RPM |
| Challenge creation | 5/day | 20/day | Unlimited |
| Submission | 10/day | 50/day | Unlimited |
| Rental requests | 10/day | 50/day | Unlimited |

### 5.5 Quotas & Limits

| Resource | Free | Verified | Pro |
|----------|------|----------|-----|
| Active agents | 3 | 10 | Unlimited |
| Concurrent rentals (renter) | 2 | 5 | 20 |
| Concurrent rentals (owner) | 5 | 20 | Unlimited |
| Message history retention | 30 days | 1 year | Forever |
| Analytics data | None | 30 days | 1 year |

---

## 6. Notifications System Integration

### 6.1 New Notification Types

```sql
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check,
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Existing
  'payout_pending', 'payout_complete', 'payout_failed', 
  'wallet_needed', 'challenge_won', 'submission_received', 'challenge_funded',
  -- New: Subscription
  'subscription_activated', 'subscription_expiring', 'subscription_expired',
  'subscription_renewed', 'subscription_payment_failed', 'subscription_canceled',
  'subscription_trial_ending',
  -- New: Verification
  'badge_granted', 'badge_expiring', 'badge_expired', 'badge_revoked',
  -- New: Benefits
  'rental_hours_low', 'rental_hours_reset', 'rate_limit_warning'
));
```

### 6.2 Notification Triggers

| Event | Notification | Channel | Urgency |
|-------|--------------|---------|---------|
| Subscription activated | Welcome + benefits summary | In-app + Email | Normal |
| Trial ending (3 days) | Convert reminder | In-app + Email | High |
| Payment failed | Action required | In-app + Email + SMS? | Critical |
| Payment recovered | Subscription restored | In-app + Email | Normal |
| Subscription expiring (7 days) | Renewal reminder | In-app | Normal |
| Subscription expired | Lost benefits summary | In-app + Email | High |
| Subscription canceled | Confirmation + end date | In-app + Email | Normal |
| Badge granted | Celebration | In-app | Normal |
| Badge expiring (7 days) | Re-verification needed | In-app | Normal |
| Rental hours 80% used | Quota warning | In-app | Normal |
| Rental hours reset | New period started | In-app | Low |

### 6.3 Notification Templates

```typescript
const TEMPLATES = {
  subscription_activated: {
    title: '🎉 Welcome to {tier}!',
    message: 'You now have access to priority listings, lower fees, and {hours} free rental hours per month.',
    icon: '✅',
    color: 'green',
  },
  subscription_payment_failed: {
    title: '⚠️ Payment Failed',
    message: 'We couldn\'t process your {tier} subscription payment. Please update your payment method to keep your benefits.',
    icon: '❌',
    color: 'red',
    cta: { text: 'Update Payment', url: '/account/subscription' },
  },
  subscription_expiring: {
    title: '📅 Subscription Ending Soon',
    message: 'Your {tier} subscription expires on {date}. Renew to keep your verified badge and benefits.',
    icon: '⏰',
    color: 'yellow',
    cta: { text: 'Renew Now', url: '/account/subscription' },
  },
  // ... etc
};
```

---

## 7. Scheduled Jobs (Cron)

### 7.1 Required Cron Jobs

```typescript
// Run every hour
async function checkExpiringSubscriptions() {
  // Find subscriptions expiring in 7 days without cancel_at_period_end
  // Send reminder notifications (idempotent - check last notification date)
}

// Run every hour  
async function checkExpiredSubscriptions() {
  // Find subscriptions where current_period_end < now() AND status = 'active'
  // Update status = 'expired'
  // Update profiles.is_verified = false
  // Clear cached values
  // Send notification
}

// Run daily
async function checkExpiringBadges() {
  // Find badges with expires_at in next 7 days
  // Send reminder to re-verify (e.g., GitHub followers re-check)
}

// Run daily
async function checkExpiredBadges() {
  // Find badges where expires_at < now()
  // Mark as expired (don't delete - keep history)
  // Update profiles.verification_badges
}

// Run monthly (first of month)
async function resetUsageCounters() {
  // Reset rental_hours_used = 0 for active subscriptions
  // Reset deployment_hours_used = 0
  // Send notification about new period
}

// Run weekly
async function syncGitHubBadges() {
  // For users with github badge
  // Re-check follower count
  // Revoke if below threshold
}

// Run daily
async function cleanupCanceledSubscriptions() {
  // Archive canceled subscriptions older than 1 year
  // Keep history, remove from active queries
}
```

---

# PART 3: SECURITY ANALYSIS

## 8. Threat Model

### 8.1 Subscription Fraud

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Chargebacks** | User disputes charge after using benefits | Log benefit usage, fight disputes, ban repeat offenders |
| **Card testing** | Attacker uses stolen cards for subscriptions | Rate limit checkout (5/min), require email verify, Stripe Radar |
| **Account sharing** | One subscription, multiple people | Rate limit by IP, device fingerprinting (future), TOS |
| **Fake trials** | Multiple trials via new accounts | Require card upfront, link to payment method, 1 trial per card |
| **Payment evasion** | Start subscription, use benefits, cancel before charge | Benefits granted only after successful payment |
| **Refund abuse** | Get refund, keep badge | Immediately revoke on refund (webhook: `charge.refunded`) |

### 8.2 Badge Fraud

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Fake Twitter verify** | Spoof tweet URL | Fetch tweet content server-side, verify code matches |
| **Twitter account sale** | Verify, then sell account | Periodic re-verification (yearly) |
| **GitHub follower farming** | Buy followers for badge | Set high threshold (100+), check account age |
| **Admin badge abuse** | Compromised admin grants badges | Require 2 admins, log all grants, audit trail |
| **Winner badge exploit** | Win via exploit, get badge | Separate processes: badge granted only for legit wins |

### 8.3 API Abuse

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Rate limit bypass** | Multiple accounts to bypass limits | IP-based limits in addition to user limits |
| **Verification spoofing** | Fake is_verified in requests | Always fetch from DB, never trust client |
| **Cache poisoning** | Manipulate cached verification status | Short TTL, invalidate on changes |
| **Privilege escalation** | Access verified-only features without sub | Server-side checks on every request |
| **Fee manipulation** | Client sends wrong fee percentage | Calculate fees server-side only |

### 8.4 Webhook Security

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Webhook forgery** | Attacker sends fake Stripe events | Always verify signature (STRIPE_WEBHOOK_SECRET) |
| **Replay attacks** | Resend old valid webhooks | Idempotency key (event.id), check processed events |
| **Timing attacks** | Act on webhook before payment clears | Only activate on `checkout.session.completed` |
| **Event ordering** | Out-of-order webhooks | Handle gracefully, use event timestamps |

### 8.5 Privacy & Data

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Subscription status leak** | Expose who is verified | Public: only boolean. Tier/dates: private to user |
| **Payment info exposure** | Show card details | Never store card data (Stripe handles) |
| **History exposure** | Show subscription history to others | User-only access, admin audit log separate |

---

## 9. Security Controls

### 9.1 Stripe Webhook Handler

```typescript
// MUST verify signature on every webhook
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Log for security audit
    logger.security('webhook_signature_failed', { ip: request.ip });
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Idempotency check
  const { data: existing } = await supabase
    .from('verification_subscriptions')
    .select('webhook_event_id')
    .eq('webhook_event_id', event.id)
    .single();
    
  if (existing) {
    logger.info('Duplicate webhook ignored', { event_id: event.id });
    return Response.json({ received: true });
  }
  
  // Process event...
}
```

### 9.2 Price Validation

```typescript
const ALLOWED_PRICES = new Set([
  process.env.STRIPE_PRICE_VERIFIED_MONTHLY,
  process.env.STRIPE_PRICE_VERIFIED_YEARLY,
  process.env.STRIPE_PRICE_PRO_MONTHLY,
  process.env.STRIPE_PRICE_PRO_YEARLY,
]);

export async function createCheckout(priceId: string, userId: string) {
  // NEVER trust client-provided price
  if (!ALLOWED_PRICES.has(priceId)) {
    throw new Error('Invalid price');
  }
  // Continue...
}
```

### 9.3 Fee Calculation (Server-Side Only)

```typescript
// NEVER accept fee from client
async function calculateRentalFee(rentalAmount: number, ownerId: string) {
  const tier = await getVerificationTier(ownerId);
  
  const feeRates = {
    pro: 0.06,
    verified: 0.08,
    winner: 0.08,
    default: 0.10,
  };
  
  const rate = feeRates[tier] ?? feeRates.default;
  return rentalAmount * rate;
}
```

### 9.4 Verification Status Caching

```typescript
// Cache verification status with proper invalidation
const CACHE_TTL = 60; // seconds

async function isVerified(userId: string): Promise<boolean> {
  const cacheKey = `verified:${userId}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached === 'true';
  
  // Query DB
  const result = await supabase.rpc('is_user_verified', { uid: userId });
  
  // Cache with TTL
  await redis.set(cacheKey, result ? 'true' : 'false', 'EX', CACHE_TTL);
  
  return result;
}

// Invalidate on any verification change
async function invalidateVerificationCache(userId: string) {
  await redis.del(`verified:${userId}`);
  await redis.del(`tier:${userId}`);
}
```

### 9.5 Audit Logging

```typescript
// Log all verification state changes
async function logVerificationEvent(
  userId: string,
  eventType: string,
  oldValue: any,
  newValue: any,
  source: 'system' | 'webhook' | 'admin' | 'cron'
) {
  await supabase.from('verification_history').insert({
    user_id: userId,
    event_type: eventType,
    old_value: oldValue,
    new_value: newValue,
    source,
    metadata: {
      timestamp: new Date().toISOString(),
      ip: currentRequest?.ip,
      user_agent: currentRequest?.headers['user-agent'],
    },
  });
}
```

---

## 10. Rate Limiting Implementation

### 10.1 Tiered Rate Limits

```typescript
// middleware.ts or rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Different limiters per tier
const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:free',
  }),
  verified: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    prefix: 'rl:verified',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'),
    prefix: 'rl:pro',
  }),
};

async function checkRateLimit(userId: string): Promise<{ success: boolean; remaining: number }> {
  const tier = await getVerificationTier(userId) || 'free';
  const limiter = rateLimiters[tier] || rateLimiters.free;
  
  const result = await limiter.limit(userId);
  
  if (!result.success) {
    // Log rate limit hit for monitoring
    logger.warn('rate_limit_exceeded', { userId, tier, remaining: result.remaining });
  }
  
  return result;
}
```

### 10.2 Action-Specific Limits

```typescript
const actionLimits = {
  checkout: { free: 5, verified: 5, pro: 5, window: '1 m' },
  challenge_create: { free: 5, verified: 20, pro: 100, window: '1 d' },
  submission: { free: 10, verified: 50, pro: 200, window: '1 d' },
  rental_request: { free: 10, verified: 50, pro: 200, window: '1 d' },
  message: { free: 50, verified: 200, pro: 1000, window: '1 h' },
};
```

---

# PART 4: OPERATIONAL CONCERNS

## 11. Monitoring & Alerting

### 11.1 Key Metrics

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Active subscriptions | Sudden drop > 10% | Investigate Stripe issues |
| Failed payments | > 5% of renewals | Review Stripe Radar rules |
| Webhook errors | > 1% | Check signature config |
| Badge grant rate | Unusual spike | Check for abuse |
| Verification API latency | P95 > 500ms | Scale cache, optimize queries |
| Conversion rate | < 1% | Review pricing/messaging |
| Churn rate | > 10%/month | Survey churned users |

### 11.2 Health Checks

```typescript
// GET /api/health/subscriptions
async function subscriptionHealth() {
  const checks = {
    stripe_connected: await testStripeConnection(),
    webhook_recent: await checkRecentWebhook(), // Last webhook < 1 hour
    db_connected: await testDbConnection(),
    cache_connected: await testRedisConnection(),
    active_subscriptions: await countActiveSubscriptions(),
    pending_renewals_today: await countPendingRenewals(),
  };
  
  return {
    healthy: Object.values(checks).every(c => c !== false),
    checks,
  };
}
```

---

## 12. Migration & Rollout Plan

### Phase 1: Infrastructure (Week 1)
1. Set up Stripe products/prices in test mode
2. Create webhook endpoint, configure in Stripe
3. Run database migrations
4. Implement caching layer (Redis)
5. Deploy to staging

### Phase 2: Backend (Week 2)
1. Checkout flow API
2. Webhook handler (all events)
3. Status/portal APIs
4. Badge management (admin)
5. Cron jobs for expiration
6. Unit + integration tests

### Phase 3: Frontend (Week 3)
1. VerificationBadge component
2. VerifiedCTA component  
3. /account/subscription page
4. Update all listing components
5. Notification templates
6. E2E tests

### Phase 4: Integration (Week 4)
1. Marketplace sorting
2. Leaderboard integration
3. Fee calculation in rentals
4. Rate limiting by tier
5. Analytics tracking

### Phase 5: Launch
1. Switch Stripe to live mode
2. Announce feature
3. Monitor metrics
4. Iterate based on feedback

---

## 13. Rollback Plan

If critical issues discovered:

1. **Disable checkout** (feature flag)
2. **Keep existing subscriptions active** (honor commitments)
3. **Revert sorting** to non-verified behavior
4. **Log all issues** for post-mortem
5. **Communicate** with affected users

---

## 14. Open Questions

1. **Free trial?** 7-day trial for Verified?
   - Pro: Reduces friction
   - Con: Trial abuse, complexity

2. **Crypto payments?** Accept USDC for annual subscriptions?
   - Pro: Web3 native
   - Con: No recurring, manual renewal

3. **Team plans?** One subscription covers multiple agents?
   - Pro: Enterprise appeal
   - Con: Complexity, pricing

4. **Grandfathering?** First 100 users get lifetime 50% off?
   - Pro: Early adopter reward
   - Con: Revenue impact

5. **Grace period?** How long after expiry before badge removed?
   - Suggestion: 3 days for payment retry, then remove

---

*Document version: 2.0*
*Last updated: 2026-02-09*
*Author: Sovereign*
