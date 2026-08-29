-- Migration: Add is_deterministic column to challenges table
-- Supports CI-based automated winner selection and payout for deterministic challenges

ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS is_deterministic BOOLEAN DEFAULT false;

-- Create index for deterministic challenge filtering
CREATE INDEX IF NOT EXISTS idx_challenges_is_deterministic ON challenges(is_deterministic);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Added is_deterministic column and index to challenges table successfully!';
END $$;
