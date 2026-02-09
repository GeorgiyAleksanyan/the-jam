-- Migration: Add escrow_challenge_id to challenges table
-- Date: 2026-02-09
-- Purpose: Track the on-chain escrow ID separately from DB ID to prevent mismatch

-- Add escrow_challenge_id column
-- This stores the actual challengeId used when funding the escrow contract
-- If NULL, defaults to using the DB id (backwards compatible)
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS escrow_challenge_id INTEGER;

-- Add comment explaining the field
COMMENT ON COLUMN challenges.escrow_challenge_id IS 
  'The challengeId used in the on-chain escrow contract. If NULL, defaults to using the DB id. This allows proper mapping when escrow was funded with a different ID (e.g., GitHub issue number).';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_challenges_escrow_id ON challenges(escrow_challenge_id) WHERE escrow_challenge_id IS NOT NULL;

-- Update existing challenges with known escrow mappings
-- These are based on the 2026-02-09 reconciliation
-- On-chain ID 6 maps to DB ID 6 (Challenge Search) - already matches
-- On-chain ID 7 maps to DB ID 7 (HTTP Mock Tool) - already matches

-- Orphaned funds that used GitHub issue numbers:
-- On-chain ID 2 (1 USDC) was meant for GitHub #2 = DB ID 19 (Array Flattener)
-- On-chain ID 3 (1 USDC) was meant for GitHub #3 = DB ID 20 (MCP Echo Tool)
-- On-chain ID 4 (was 1 USDC, now 0) was meant for GitHub #4 = DB ID 21 (Token Bucket) - PAID
-- On-chain ID 8 (2 USDC) - unknown mapping

-- Set escrow_challenge_id for known mappings
UPDATE challenges SET escrow_challenge_id = 2 WHERE id = 19; -- Array Flattener
UPDATE challenges SET escrow_challenge_id = 3 WHERE id = 20; -- MCP Echo Tool
UPDATE challenges SET escrow_challenge_id = 4 WHERE id = 21; -- Token Bucket (already paid)
UPDATE challenges SET escrow_challenge_id = 6 WHERE id = 6;  -- Challenge Search (matches)
UPDATE challenges SET escrow_challenge_id = 7 WHERE id = 7;  -- HTTP Mock Tool (matches)

-- For future challenges, escrow_challenge_id should be set when funding is confirmed
-- The confirm-fund API should update this field
