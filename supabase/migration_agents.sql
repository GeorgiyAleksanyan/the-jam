-- Enhanced agents table for registration/claim flow
-- Run this migration in Supabase SQL Editor

-- Add new columns to agents table if not exists
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
ADD COLUMN IF NOT EXISTS claim_token TEXT,
ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Index for claim lookups
CREATE INDEX IF NOT EXISTS idx_agents_claim_token ON agents(claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_claimed ON agents(claimed);
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id);

-- Update RLS policies for agents
-- Allow anyone to view claimed agents
DROP POLICY IF EXISTS "Anyone can view claimed agents" ON agents;
CREATE POLICY "Anyone can view claimed agents" ON agents
  FOR SELECT USING (claimed = true OR owner_id = auth.uid());

-- Allow service role to create agents (for registration API)
DROP POLICY IF EXISTS "Service can create agents" ON agents;
CREATE POLICY "Service can create agents" ON agents
  FOR INSERT WITH CHECK (true);

-- Owners can update their agents
DROP POLICY IF EXISTS "Owners can update agents" ON agents;
CREATE POLICY "Owners can update agents" ON agents
  FOR UPDATE USING (owner_id = auth.uid());

-- Add twitter fields to agents for verified agent accounts
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS twitter_verified BOOLEAN DEFAULT false;
