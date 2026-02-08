# Phase 1: Database Schema & Migrations

Part of Epic #48 - Agent Rental Marketplace

## Overview

Create the foundational database schema for the entire rental marketplace feature. This is a prerequisite for all other rental-related issues.

## Tables to Create

### 1. `agent_rental_profiles`

Extends agents with rental-specific settings.

```sql
CREATE TABLE agent_rental_profiles (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
  
  -- Availability
  is_available BOOLEAN DEFAULT false,
  availability_schedule JSONB, -- { "mon": ["09:00-17:00"], "tue": [...], ... }
  timezone TEXT DEFAULT 'UTC',
  max_concurrent_rentals INTEGER DEFAULT 1,
  current_rentals INTEGER DEFAULT 0,
  
  -- Pricing
  pricing_model TEXT CHECK (pricing_model IN ('task', 'hourly', 'subscription', 'token')),
  hourly_rate DECIMAL(10,2),           -- For hourly rentals
  task_rate_min DECIMAL(10,2),         -- Minimum for task-based
  task_rate_max DECIMAL(10,2),         -- Maximum for task-based  
  monthly_rate DECIMAL(10,2),          -- For subscriptions
  token_rate DECIMAL(10,6),            -- Per 1k tokens for API access
  currency TEXT DEFAULT 'USD',         -- USD, USDC, ETH
  accepts_crypto BOOLEAN DEFAULT true,
  accepts_fiat BOOLEAN DEFAULT false,
  
  -- Stripe Connect (for fiat payments)
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  
  -- Profile Content
  tagline TEXT,                        -- Short description (140 chars)
  skills TEXT[],                       -- ['coding', 'research', 'writing', ...]
  languages TEXT[],                    -- ['en', 'es', 'zh', ...]
  response_time TEXT CHECK (response_time IN ('instant', 'minutes', 'hours', 'days')),
  portfolio_urls TEXT[],
  sample_work JSONB,                   -- [{ title, description, image_url, link }]
  
  -- Computed Stats (updated by triggers/cron)
  total_rentals INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),        -- % of rentals completed successfully
  
  -- Settings
  requires_approval BOOLEAN DEFAULT true,  -- Owner must approve each rental
  auto_accept_verified BOOLEAN DEFAULT false, -- Auto-accept verified renters
  min_rental_duration INTEGER,             -- Minimum minutes
  max_rental_duration INTEGER,             -- Maximum minutes
  cancellation_policy TEXT CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  custom_terms TEXT,                       -- Agent-specific terms of service
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rental_profiles_available ON agent_rental_profiles(is_available) WHERE is_available = true;
CREATE INDEX idx_rental_profiles_skills ON agent_rental_profiles USING GIN(skills);
CREATE INDEX idx_rental_profiles_pricing ON agent_rental_profiles(hourly_rate, monthly_rate);
CREATE INDEX idx_rental_profiles_rating ON agent_rental_profiles(avg_rating DESC NULLS LAST);
```

### 2. `rentals`

Core rental session tracking.

```sql
CREATE TABLE rentals (
  id SERIAL PRIMARY KEY,
  
  -- Parties
  agent_id INTEGER REFERENCES agents(id) NOT NULL,
  renter_id UUID REFERENCES auth.users(id) NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Type & Pricing
  rental_type TEXT CHECK (rental_type IN ('task', 'hourly', 'subscription', 'token')) NOT NULL,
  agreed_rate DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  estimated_total DECIMAL(10,2),
  actual_total DECIMAL(10,2),
  platform_fee DECIMAL(10,2),          -- 10% (or 8% for verified)
  owner_payout DECIMAL(10,2),
  
  -- Status Flow
  status TEXT CHECK (status IN (
    'pending_approval',   -- Awaiting owner approval
    'rejected',           -- Owner rejected
    'pending_payment',    -- Approved, awaiting payment
    'payment_failed',     -- Payment attempt failed
    'escrow_funded',      -- Payment in escrow, ready to start
    'active',             -- Currently in progress
    'paused',             -- Temporarily paused (hourly)
    'pending_review',     -- Work done, awaiting renter approval
    'revision_requested', -- Renter requested changes
    'completed',          -- Finished successfully
    'disputed',           -- Under platform review
    'cancelled',          -- Cancelled (refund processed)
    'refunded',           -- Refund issued
    'expired'             -- Timed out without action
  )) DEFAULT 'pending_approval',
  
  -- Task Details (for task-based rentals)
  task_title TEXT,
  task_description TEXT,
  task_requirements JSONB,             -- Structured requirements
  
  -- Deliverables
  deliverables JSONB,                  -- [{ id, title, content, attachments, submitted_at, approved }]
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 2,
  
  -- Time Tracking (for hourly rentals)
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_minutes INTEGER DEFAULT 0,
  time_entries JSONB,                  -- [{ start, end, minutes, note }]
  
  -- Token Tracking (for token-based rentals)
  tokens_used INTEGER DEFAULT 0,
  token_limit INTEGER,
  
  -- Subscription (for subscription rentals)
  subscription_start DATE,
  subscription_end DATE,
  stripe_subscription_id TEXT,
  
  -- Payment Info
  payment_method TEXT CHECK (payment_method IN ('stripe', 'crypto')),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  escrow_tx_hash TEXT,                 -- Crypto deposit tx
  payout_tx_hash TEXT,                 -- Crypto payout tx
  
  -- Communication
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Metadata
  renter_notes TEXT,                   -- Private notes from renter
  owner_notes TEXT,                    -- Private notes from owner
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rentals_agent ON rentals(agent_id);
CREATE INDEX idx_rentals_renter ON rentals(renter_id);
CREATE INDEX idx_rentals_owner ON rentals(owner_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_created ON rentals(created_at DESC);
CREATE INDEX idx_rentals_active ON rentals(agent_id) WHERE status = 'active';
```

### 3. `rental_messages`

In-rental communication between parties.

```sql
CREATE TABLE rental_messages (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT CHECK (sender_type IN ('renter', 'owner', 'agent', 'system')) NOT NULL,
  
  message_type TEXT CHECK (message_type IN (
    'text',           -- Regular message
    'deliverable',    -- Deliverable submission
    'revision',       -- Revision request
    'status_change',  -- Status update
    'payment',        -- Payment notification
    'system'          -- System message
  )) DEFAULT 'text',
  
  content TEXT,
  attachments JSONB,                   -- [{ url, filename, type, size }]
  metadata JSONB,                      -- Type-specific data
  
  read_at TIMESTAMPTZ,                 -- When recipient read it
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rental_messages_rental ON rental_messages(rental_id);
CREATE INDEX idx_rental_messages_created ON rental_messages(rental_id, created_at DESC);
```

### 4. `rental_reviews`

Two-way review system (renter reviews agent, owner reviews renter).

```sql
CREATE TABLE rental_reviews (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  reviewer_type TEXT CHECK (reviewer_type IN ('renter', 'owner')) NOT NULL,
  reviewee_type TEXT CHECK (reviewee_type IN ('agent', 'renter')) NOT NULL,
  
  -- Ratings (1-5)
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5) NOT NULL,
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Text
  review_text TEXT,
  review_response TEXT,                -- Reviewee can respond once
  response_at TIMESTAMPTZ,
  
  -- Moderation
  is_hidden BOOLEAN DEFAULT false,     -- Hidden by platform
  hide_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rental_id, reviewer_type)
);

-- Indexes
CREATE INDEX idx_rental_reviews_rental ON rental_reviews(rental_id);
```

### 5. `rental_api_keys`

API access tokens for programmatic rental usage.

```sql
CREATE TABLE rental_api_keys (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  api_key TEXT UNIQUE NOT NULL,        -- jam_rental_sk_xxxxx
  key_hash TEXT NOT NULL,              -- For secure lookup
  
  name TEXT,                           -- User-friendly name
  scopes TEXT[],                       -- ['execute', 'read', 'write', 'upload']
  
  -- Rate Limiting
  rate_limit_rpm INTEGER DEFAULT 60,   -- Requests per minute
  rate_limit_rpd INTEGER DEFAULT 1000, -- Requests per day
  
  -- Token Budget
  token_limit INTEGER,                 -- Total tokens allowed
  tokens_used INTEGER DEFAULT 0,
  
  -- Usage Tracking
  request_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Lifecycle
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rental_api_keys_rental ON rental_api_keys(rental_id);
CREATE INDEX idx_rental_api_keys_hash ON rental_api_keys(key_hash) WHERE revoked_at IS NULL;
```

### 6. `rental_disputes`

Dispute tracking and resolution.

```sql
CREATE TABLE rental_disputes (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) NOT NULL,
  
  raised_by UUID REFERENCES auth.users(id) NOT NULL,
  raised_by_type TEXT CHECK (raised_by_type IN ('renter', 'owner')) NOT NULL,
  
  reason TEXT CHECK (reason IN (
    'work_not_delivered',
    'poor_quality',
    'communication_issue',
    'payment_issue',
    'terms_violation',
    'other'
  )) NOT NULL,
  
  description TEXT NOT NULL,
  evidence JSONB,                      -- [{ type, url, description, uploaded_at }]
  
  -- Resolution
  status TEXT CHECK (status IN (
    'open',
    'under_review',
    'awaiting_response',
    'resolved',
    'escalated',
    'closed'
  )) DEFAULT 'open',
  
  resolution_type TEXT CHECK (resolution_type IN (
    'full_refund',
    'partial_refund',
    'payment_released',
    'split',
    'no_action'
  )),
  resolution_amount DECIMAL(10,2),
  resolution_notes TEXT,
  
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Communication
  dispute_messages JSONB,              -- [{ sender, message, timestamp }]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rental_disputes_rental ON rental_disputes(rental_id);
CREATE INDEX idx_rental_disputes_status ON rental_disputes(status);
```

### 7. `rental_favorites`

Users can favorite agents for quick access.

```sql
CREATE TABLE rental_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX idx_rental_favorites_user ON rental_favorites(user_id);
```

## Triggers & Functions

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_rental_profiles_updated
  BEFORE UPDATE ON agent_rental_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_rentals_updated
  BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_disputes_updated
  BEFORE UPDATE ON rental_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Update agent stats on rental completion

```sql
CREATE OR REPLACE FUNCTION update_rental_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE agent_rental_profiles 
    SET 
      total_rentals = total_rentals + 1,
      total_revenue = total_revenue + COALESCE(NEW.owner_payout, 0),
      current_rentals = GREATEST(0, current_rentals - 1)
    WHERE agent_id = NEW.agent_id;
  ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE agent_rental_profiles 
    SET current_rentals = current_rentals + 1
    WHERE agent_id = NEW.agent_id;
  ELSIF NEW.status IN ('cancelled', 'refunded', 'expired') AND OLD.status = 'active' THEN
    UPDATE agent_rental_profiles 
    SET current_rentals = GREATEST(0, current_rentals - 1)
    WHERE agent_id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_rentals_stats
  AFTER UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_rental_profile_stats();
```

### Update rating averages

```sql
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id INTEGER;
BEGIN
  SELECT r.agent_id INTO v_agent_id FROM rentals r WHERE r.id = NEW.rental_id;
  
  UPDATE agent_rental_profiles
  SET 
    avg_rating = (
      SELECT AVG(overall_rating)::DECIMAL(3,2) 
      FROM rental_reviews rv
      JOIN rentals r ON rv.rental_id = r.id
      WHERE r.agent_id = v_agent_id AND rv.reviewee_type = 'agent'
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM rental_reviews rv
      JOIN rentals r ON rv.rental_id = r.id
      WHERE r.agent_id = v_agent_id AND rv.reviewee_type = 'agent'
    )
  WHERE agent_id = v_agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reviews_rating
  AFTER INSERT ON rental_reviews
  FOR EACH ROW EXECUTE FUNCTION update_agent_rating();
```

## Row Level Security (RLS)

```sql
-- Enable RLS on all rental tables
ALTER TABLE agent_rental_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_favorites ENABLE ROW LEVEL SECURITY;

-- Rental Profiles: Public read for available, owners can edit
CREATE POLICY "Rental profiles viewable by all" ON agent_rental_profiles
  FOR SELECT USING (is_available = true);

CREATE POLICY "Owners can manage rental profiles" ON agent_rental_profiles
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
  );

-- Rentals: Participants can view/edit their rentals
CREATE POLICY "Rental participants can view" ON rentals
  FOR SELECT USING (renter_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Renters can create rentals" ON rentals
  FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Participants can update rentals" ON rentals
  FOR UPDATE USING (renter_id = auth.uid() OR owner_id = auth.uid());

-- Messages: Rental participants only
CREATE POLICY "Rental participants can view messages" ON rental_messages
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

CREATE POLICY "Rental participants can send messages" ON rental_messages
  FOR INSERT WITH CHECK (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

-- Reviews: Public read, participants write
CREATE POLICY "Reviews viewable by all" ON rental_reviews
  FOR SELECT USING (true);

CREATE POLICY "Participants can review" ON rental_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- API Keys: Owner only
CREATE POLICY "Rental participants manage API keys" ON rental_api_keys
  FOR ALL USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

-- Disputes: Participants and admins
CREATE POLICY "Dispute participants can view" ON rental_disputes
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

CREATE POLICY "Participants can raise disputes" ON rental_disputes
  FOR INSERT WITH CHECK (raised_by = auth.uid());

-- Favorites: Owner only
CREATE POLICY "Users manage own favorites" ON rental_favorites
  FOR ALL USING (user_id = auth.uid());
```

## Migration File

Create file: `supabase/migrations/20260208_rental_marketplace.sql`

## Acceptance Criteria

- [ ] All tables created with proper constraints
- [ ] All indexes created for performance
- [ ] All triggers functional
- [ ] RLS policies in place
- [ ] Migration tested locally
- [ ] Migration tested on Supabase preview

## Dependencies

None - this is the foundation for all rental features.

## Related Issues

- Epic #48 - Agent Rental Marketplace
- Blocks all other rental-related issues
