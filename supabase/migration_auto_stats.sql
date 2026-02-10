-- Migration: Add triggers for automatic stats updates
-- Date: 2026-02-09
-- Purpose: Keep agent stats in sync automatically

-- Function to recalculate agent stats
-- Using BIGINT to match Supabase's default serial type
CREATE OR REPLACE FUNCTION recalc_agent_stats(agent_id_param BIGINT)
RETURNS VOID AS $$
DECLARE
  submission_count INTEGER;
  win_count INTEGER;
  earnings_total NUMERIC;
BEGIN
  -- Count submissions
  SELECT COUNT(*) INTO submission_count
  FROM submissions
  WHERE agent_id = agent_id_param;

  -- Count wins
  SELECT COUNT(*) INTO win_count
  FROM submissions
  WHERE agent_id = agent_id_param AND is_winner = TRUE;

  -- Sum earnings from paid payouts
  SELECT COALESCE(SUM(amount), 0) INTO earnings_total
  FROM pending_payouts
  WHERE agent_id = agent_id_param AND status = 'paid';

  -- Update agent stats
  UPDATE agents
  SET 
    total_submissions = submission_count,
    total_wins = win_count,
    total_earnings = earnings_total,
    updated_at = NOW()
  WHERE id = agent_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for submissions
CREATE OR REPLACE FUNCTION trigger_recalc_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_agent_stats(OLD.agent_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_agent_stats(NEW.agent_id);
    -- Also recalc old agent if agent_id changed
    IF TG_OP = 'UPDATE' AND OLD.agent_id != NEW.agent_id THEN
      PERFORM recalc_agent_stats(OLD.agent_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for payouts
CREATE OR REPLACE FUNCTION trigger_recalc_on_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_agent_stats(OLD.agent_id);
    RETURN OLD;
  ELSE
    -- Only recalc if status changed to/from 'paid'
    IF TG_OP = 'INSERT' OR 
       (TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.amount != NEW.amount)) THEN
      PERFORM recalc_agent_stats(NEW.agent_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_recalc_on_submission_insert ON submissions;
DROP TRIGGER IF EXISTS trg_recalc_on_submission_update ON submissions;
DROP TRIGGER IF EXISTS trg_recalc_on_submission_delete ON submissions;
DROP TRIGGER IF EXISTS trg_recalc_on_payout_insert ON pending_payouts;
DROP TRIGGER IF EXISTS trg_recalc_on_payout_update ON pending_payouts;
DROP TRIGGER IF EXISTS trg_recalc_on_payout_delete ON pending_payouts;

-- Create triggers on submissions table
CREATE TRIGGER trg_recalc_on_submission_insert
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_on_submission();

CREATE TRIGGER trg_recalc_on_submission_update
  AFTER UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_on_submission();

CREATE TRIGGER trg_recalc_on_submission_delete
  AFTER DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_on_submission();

-- Create triggers on pending_payouts table
CREATE TRIGGER trg_recalc_on_payout_insert
  AFTER INSERT ON pending_payouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_on_payout();

CREATE TRIGGER trg_recalc_on_payout_update
  AFTER UPDATE ON pending_payouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_on_payout();

CREATE TRIGGER trg_recalc_on_payout_delete
  AFTER DELETE ON pending_payouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_on_payout();

-- Also add function to update challenge submission_count
CREATE OR REPLACE FUNCTION update_challenge_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE challenges 
    SET submission_count = (
      SELECT COUNT(*) FROM submissions WHERE challenge_id = OLD.challenge_id
    )
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  ELSE
    UPDATE challenges 
    SET submission_count = (
      SELECT COUNT(*) FROM submissions WHERE challenge_id = NEW.challenge_id
    )
    WHERE id = NEW.challenge_id;
    
    IF TG_OP = 'UPDATE' AND OLD.challenge_id != NEW.challenge_id THEN
      UPDATE challenges 
      SET submission_count = (
        SELECT COUNT(*) FROM submissions WHERE challenge_id = OLD.challenge_id
      )
      WHERE id = OLD.challenge_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_challenge_submission_count ON submissions;

CREATE TRIGGER trg_update_challenge_submission_count
  AFTER INSERT OR UPDATE OR DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_submission_count();

-- Run initial recalculation for all agents
DO $$
DECLARE
  agent_record RECORD;
BEGIN
  FOR agent_record IN SELECT id FROM agents LOOP
    PERFORM recalc_agent_stats(agent_record.id);
  END LOOP;
END $$;
