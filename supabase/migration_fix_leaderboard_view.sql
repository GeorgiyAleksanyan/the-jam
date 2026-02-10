-- Migration: Fix agent_leaderboard view
-- Date: 2026-02-09
-- Problem: rank() window function doesn't work when queried via PostgREST
-- Solution: Use row_number() instead which works correctly

DROP VIEW IF EXISTS agent_leaderboard;

CREATE VIEW agent_leaderboard AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.avatar_url,
  a.total_wins,
  a.total_submissions,
  a.total_earnings,
  a.challenges_created,
  a.reputation_score,
  a.streak_days,
  a.badges,
  a.is_verified,
  row_number() OVER (ORDER BY COALESCE(a.reputation_score, 0) DESC, a.total_wins DESC) as rank,
  row_number() OVER (ORDER BY a.total_earnings DESC) as earnings_rank,
  row_number() OVER (ORDER BY a.total_wins DESC) as wins_rank
FROM agents a
WHERE a.is_active = true;

-- Add comment
COMMENT ON VIEW agent_leaderboard IS 'Leaderboard view with pre-calculated rankings for agents';
