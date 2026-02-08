-- Agent Rental Marketplace Database Schema
-- Migration: 20260208_rental_marketplace.sql
-- Part of Epic #48

-- ============================================================================
-- TABLE 1: agent_rental_profiles
-- Extends agents with rental-specific settings
-- ============================================================================

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
  hourly_rate DECIMAL(10,2),
  task_rate_min DECIMAL(10,2),
  task_rate_max DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  token_rate DECIMAL(10,6),
  currency TEXT DEFAULT 'USD',
  accepts_crypto BOOLEAN DEFAULT true,
  accepts_fiat BOOLEAN DEFAULT false,
  
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  
  -- Profile Content
  tagline TEXT,
  skills TEXT[],
  languages TEXT[],
  response_time TEXT CHECK (response_time IN ('instant', 'minutes', 'hours', 'days')),
  portfolio_urls TEXT[],
  sample_work JSONB,
  
  -- Computed Stats
  total_rentals INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),
  
  -- Settings
  requires_approval BOOLEAN DEFAULT true,
  auto_accept_verified BOOLEAN DEFAULT false,
  min_rental_duration INTEGER,
  max_rental_duration INTEGER,
  cancellation_policy TEXT CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  custom_terms TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rental_profiles_available ON agent_rental_profiles(is_available) WHERE is_available = true;
CREATE INDEX idx_rental_profiles_skills ON agent_rental_profiles USING GIN(skills);
CREATE INDEX idx_rental_profiles_pricing ON agent_rental_profiles(hourly_rate, monthly_rate);
CREATE INDEX idx_rental_profiles_rating ON agent_rental_profiles(avg_rating DESC NULLS LAST);

-- ============================================================================
-- TABLE 2: rentals
-- Core rental session tracking
-- ============================================================================

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
  platform_fee DECIMAL(10,2),
  owner_payout DECIMAL(10,2),
  
  -- Status Flow
  status TEXT CHECK (status IN (
    'pending_approval',
    'rejected',
    'pending_payment',
    'payment_failed',
    'escrow_funded',
    'active',
    'paused',
    'pending_review',
    'revision_requested',
    'completed',
    'disputed',
    'cancelled',
    'refunded',
    'expired'
  )) DEFAULT 'pending_approval',
  
  -- Task Details
  task_title TEXT,
  task_description TEXT,
  task_requirements JSONB,
  
  -- Deliverables
  deliverables JSONB,
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 2,
  
  -- Time Tracking
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_minutes INTEGER DEFAULT 0,
  time_entries JSONB,
  
  -- Token Tracking
  tokens_used INTEGER DEFAULT 0,
  token_limit INTEGER,
  
  -- Subscription
  subscription_start DATE,
  subscription_end DATE,
  stripe_subscription_id TEXT,
  
  -- Payment Info
  payment_method TEXT CHECK (payment_method IN ('stripe', 'crypto')),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  escrow_tx_hash TEXT,
  payout_tx_hash TEXT,
  
  -- Communication
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Metadata
  renter_notes TEXT,
  owner_notes TEXT,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rentals_agent ON rentals(agent_id);
CREATE INDEX idx_rentals_renter ON rentals(renter_id);
CREATE INDEX idx_rentals_owner ON rentals(owner_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_created ON rentals(created_at DESC);
CREATE INDEX idx_rentals_active ON rentals(agent_id) WHERE status = 'active';

-- ============================================================================
-- TABLE 3: rental_messages
-- In-rental communication
-- ============================================================================

CREATE TABLE rental_messages (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT CHECK (sender_type IN ('renter', 'owner', 'agent', 'system')) NOT NULL,
  
  message_type TEXT CHECK (message_type IN (
    'text',
    'deliverable',
    'revision',
    'status_change',
    'payment',
    'system'
  )) DEFAULT 'text',
  
  content TEXT,
  attachments JSONB,
  metadata JSONB,
  
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rental_messages_rental ON rental_messages(rental_id);
CREATE INDEX idx_rental_messages_created ON rental_messages(rental_id, created_at DESC);

-- ============================================================================
-- TABLE 4: rental_reviews
-- Two-way review system
-- ============================================================================

CREATE TABLE rental_reviews (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  reviewer_type TEXT CHECK (reviewer_type IN ('renter', 'owner')) NOT NULL,
  reviewee_type TEXT CHECK (reviewee_type IN ('agent', 'renter')) NOT NULL,
  
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5) NOT NULL,
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  review_text TEXT,
  review_response TEXT,
  response_at TIMESTAMPTZ,
  
  is_hidden BOOLEAN DEFAULT false,
  hide_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rental_id, reviewer_type)
);

CREATE INDEX idx_rental_reviews_rental ON rental_reviews(rental_id);

-- ============================================================================
-- TABLE 5: rental_api_keys
-- API access tokens for programmatic usage
-- ============================================================================

CREATE TABLE rental_api_keys (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  api_key TEXT UNIQUE NOT NULL,
  key_hash TEXT NOT NULL,
  
  name TEXT,
  scopes TEXT[],
  
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_rpd INTEGER DEFAULT 1000,
  
  token_limit INTEGER,
  tokens_used INTEGER DEFAULT 0,
  
  request_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rental_api_keys_rental ON rental_api_keys(rental_id);
CREATE INDEX idx_rental_api_keys_hash ON rental_api_keys(key_hash) WHERE revoked_at IS NULL;

-- ============================================================================
-- TABLE 6: rental_disputes
-- Dispute tracking and resolution
-- ============================================================================

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
  evidence JSONB,
  
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
  
  dispute_messages JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rental_disputes_rental ON rental_disputes(rental_id);
CREATE INDEX idx_rental_disputes_status ON rental_disputes(status);

-- ============================================================================
-- TABLE 7: rental_favorites
-- Users can favorite agents
-- ============================================================================

CREATE TABLE rental_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX idx_rental_favorites_user ON rental_favorites(user_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update timestamps
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

-- Update agent stats on rental status change
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

-- Update rating averages after review
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
      WHERE r.agent_id = v_agent_id AND rv.reviewee_type = 'agent' AND rv.is_hidden = false
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM rental_reviews rv
      JOIN rentals r ON rv.rental_id = r.id
      WHERE r.agent_id = v_agent_id AND rv.reviewee_type = 'agent' AND rv.is_hidden = false
    )
  WHERE agent_id = v_agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reviews_rating
  AFTER INSERT OR UPDATE ON rental_reviews
  FOR EACH ROW EXECUTE FUNCTION update_agent_rating();

-- Increment message count on rental
CREATE OR REPLACE FUNCTION update_rental_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rentals
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at
  WHERE id = NEW.rental_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_messages_count
  AFTER INSERT ON rental_messages
  FOR EACH ROW EXECUTE FUNCTION update_rental_message_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE agent_rental_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_favorites ENABLE ROW LEVEL SECURITY;

-- agent_rental_profiles policies
CREATE POLICY "Rental profiles viewable when available" ON agent_rental_profiles
  FOR SELECT USING (is_available = true);

CREATE POLICY "Owners can view own profiles" ON agent_rental_profiles
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can manage rental profiles" ON agent_rental_profiles
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
  );

-- rentals policies
CREATE POLICY "Rental participants can view" ON rentals
  FOR SELECT USING (renter_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Renters can create rentals" ON rentals
  FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Participants can update rentals" ON rentals
  FOR UPDATE USING (renter_id = auth.uid() OR owner_id = auth.uid());

-- rental_messages policies
CREATE POLICY "Rental participants can view messages" ON rental_messages
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

CREATE POLICY "Rental participants can send messages" ON rental_messages
  FOR INSERT WITH CHECK (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

-- rental_reviews policies
CREATE POLICY "Reviews viewable by all" ON rental_reviews
  FOR SELECT USING (is_hidden = false);

CREATE POLICY "Participants can view own hidden reviews" ON rental_reviews
  FOR SELECT USING (reviewer_id = auth.uid());

CREATE POLICY "Participants can create reviews" ON rental_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Reviewees can respond" ON rental_reviews
  FOR UPDATE USING (
    rental_id IN (
      SELECT id FROM rentals 
      WHERE (reviewer_type = 'renter' AND owner_id = auth.uid())
         OR (reviewer_type = 'owner' AND renter_id = auth.uid())
    )
  );

-- rental_api_keys policies
CREATE POLICY "Renters can manage API keys" ON rental_api_keys
  FOR ALL USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid())
  );

CREATE POLICY "Owners can view API keys" ON rental_api_keys
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE owner_id = auth.uid())
  );

-- rental_disputes policies
CREATE POLICY "Dispute participants can view" ON rental_disputes
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

CREATE POLICY "Participants can raise disputes" ON rental_disputes
  FOR INSERT WITH CHECK (raised_by = auth.uid());

CREATE POLICY "Participants can update disputes" ON rental_disputes
  FOR UPDATE USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid())
  );

-- rental_favorites policies
CREATE POLICY "Users manage own favorites" ON rental_favorites
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- SERVICE ROLE BYPASS (for API routes)
-- ============================================================================

-- Allow service role to bypass RLS for admin operations
CREATE POLICY "Service role full access to rental_profiles" ON agent_rental_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to rentals" ON rentals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to messages" ON rental_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to reviews" ON rental_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to api_keys" ON rental_api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to disputes" ON rental_disputes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to favorites" ON rental_favorites
  FOR ALL TO service_role USING (true) WITH CHECK (true);
