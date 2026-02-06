-- =============================================================================
-- Migration: Add Upvote Threshold for Free Challenges
-- =============================================================================
-- This enables community validation for challenges without funding requirements.
-- Free challenges require upvote_threshold (default 20) upvotes to open.

-- Add upvote_threshold column to challenges
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS upvote_threshold int DEFAULT 20;

-- Update existing challenges: funded challenges don't need upvote threshold
UPDATE challenges 
SET upvote_threshold = 0 
WHERE prize_pool > 0 OR funding_threshold > 0;

-- =============================================================================
-- Update status transition function to handle upvote threshold
-- =============================================================================
CREATE OR REPLACE FUNCTION check_challenge_status_transition(p_challenge_id bigint)
RETURNS text AS $$
DECLARE
  v_challenge RECORD;
  v_new_status text;
  v_submission_count int;
  v_is_funded boolean;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  
  v_new_status := v_challenge.status;
  
  -- Count submissions
  SELECT COUNT(*) INTO v_submission_count FROM submissions WHERE challenge_id = p_challenge_id;
  
  -- Determine if this is a funded challenge
  v_is_funded := v_challenge.funding_threshold > 0 OR v_challenge.prize_pool > 0;
  
  -- Proposed -> Funding: when any funding added (funded challenges only)
  IF v_challenge.status = 'proposed' AND v_challenge.prize_pool > 0 AND v_is_funded THEN
    v_new_status := 'funding';
  END IF;
  
  -- Funding -> Open: when funding threshold met
  IF v_challenge.status IN ('proposed', 'funding') 
     AND v_is_funded
     AND v_challenge.prize_pool >= v_challenge.funding_threshold 
     AND v_challenge.funding_threshold > 0 THEN
    v_new_status := 'open';
  END IF;
  
  -- Proposed -> Open: when upvote threshold met (free challenges only)
  IF v_challenge.status = 'proposed' 
     AND NOT v_is_funded
     AND v_challenge.upvotes >= COALESCE(v_challenge.upvote_threshold, 20) THEN
    v_new_status := 'open';
  END IF;
  
  -- Open -> Active: when first submission received
  IF v_challenge.status = 'open' AND v_submission_count > 0 THEN
    v_new_status := 'active';
  END IF;
  
  -- Active -> Voting: when ends_at passed
  IF v_challenge.status = 'active' 
     AND v_challenge.ends_at IS NOT NULL 
     AND v_challenge.ends_at < now() THEN
    v_new_status := 'voting';
  END IF;
  
  -- Update if changed
  IF v_new_status != v_challenge.status THEN
    UPDATE challenges SET status = v_new_status, updated_at = now() WHERE id = p_challenge_id;
    
    INSERT INTO challenge_status_log (challenge_id, from_status, to_status, triggered_by)
    VALUES (p_challenge_id, v_challenge.status, v_new_status, 'system');
  END IF;
  
  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Trigger: Also check status on upvote changes
-- =============================================================================
DROP TRIGGER IF EXISTS check_challenge_status_on_upvote ON challenges;
CREATE TRIGGER check_challenge_status_on_upvote
  AFTER UPDATE OF upvotes ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_challenge_status();

-- =============================================================================
-- DONE
-- =============================================================================
