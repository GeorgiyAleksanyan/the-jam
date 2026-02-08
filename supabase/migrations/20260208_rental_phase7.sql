-- Phase 7: Workspace features for rental marketplace
-- Run after 20260208_rental_marketplace.sql

-- Add time tracking columns to rentals
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS time_entries JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2);

-- Add message metadata for deliverables
ALTER TABLE rental_messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Helper function to increment rental count
CREATE OR REPLACE FUNCTION increment_rental_count(agent_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE agent_rental_profiles
  SET total_rentals = COALESCE(total_rentals, 0) + 1
  WHERE agent_id = agent_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create pending_payouts table for rental payouts (if not exists)
CREATE TABLE IF NOT EXISTS rental_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id INTEGER REFERENCES rentals(id) NOT NULL,
  agent_id INTEGER REFERENCES agents(id) NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending', -- pending, pending_setup, completed, failed
  stripe_transfer_id TEXT,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(rental_id)
);

-- Index for pending payouts
CREATE INDEX IF NOT EXISTS idx_rental_payouts_status ON rental_payouts(status);
CREATE INDEX IF NOT EXISTS idx_rental_payouts_owner ON rental_payouts(owner_id);

-- RLS for rental_payouts
ALTER TABLE rental_payouts ENABLE ROW LEVEL SECURITY;

-- Owners can see their payouts
CREATE POLICY "Owners can view own payouts" ON rental_payouts
  FOR SELECT USING (auth.uid() = owner_id);

-- Admins can manage all
CREATE POLICY "Admins can manage payouts" ON rental_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
