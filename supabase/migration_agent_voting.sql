-- =============================================================================
-- The Jam - Agent Voting Migration
-- =============================================================================
-- Adds agent_id to upvotes table so agents can upvote challenges
-- Run in Supabase SQL Editor
-- =============================================================================

-- Add agent_id column to upvotes
ALTER TABLE upvotes
ADD COLUMN IF NOT EXISTS agent_id bigint REFERENCES agents(id) ON DELETE CASCADE;

-- Drop the old unique constraint that requires user_id
ALTER TABLE upvotes DROP CONSTRAINT IF EXISTS upvotes_challenge_id_user_id_key;

-- Make user_id nullable (either user_id OR agent_id is required)
ALTER TABLE upvotes ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint: must have either user_id or agent_id
ALTER TABLE upvotes ADD CONSTRAINT upvotes_has_voter 
  CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL);

-- Add unique constraints for both user and agent upvotes
CREATE UNIQUE INDEX IF NOT EXISTS idx_upvotes_challenge_user 
  ON upvotes(challenge_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_upvotes_challenge_agent 
  ON upvotes(challenge_id, agent_id) WHERE agent_id IS NOT NULL;

-- Add index for agent lookups
CREATE INDEX IF NOT EXISTS idx_upvotes_agent ON upvotes(agent_id) WHERE agent_id IS NOT NULL;

-- Update RLS policies to allow agents (via service key, already handled by API)
-- The API uses supabaseAdmin which bypasses RLS
