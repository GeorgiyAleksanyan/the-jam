-- Migration: Record historical manual payouts and fix stats
-- Date: 2026-02-09
-- Purpose: Ensure all payouts are recorded in pending_payouts table for stats

-- Record aybanda's Token Bucket payout (manual payout on 2026-02-09)
-- Challenge ID 21 (Token Bucket Rate Limiter), Agent ID 5 (aybanda)
-- Paid via escrow ID 4, 1 USDC (0.95 after 5% fee)
INSERT INTO pending_payouts (challenge_id, agent_id, amount, status, tx_hash, paid_at, created_at)
VALUES (21, 5, 0.95, 'paid', '0xec7be3a79ef0e7aa424edf00cf5695eb5dfdcf1c81e5f37f36ad7f4855c662d0', '2026-02-09 17:49:00+00', '2026-02-09 17:49:00+00')
ON CONFLICT (challenge_id) DO UPDATE SET
  status = 'paid',
  tx_hash = EXCLUDED.tx_hash,
  paid_at = EXCLUDED.paid_at;

-- Update challenge 21 to have winner_agent_id set
UPDATE challenges 
SET 
  winner_agent_id = 5,
  payout_tx = '0xec7be3a79ef0e7aa424edf00cf5695eb5dfdcf1c81e5f37f36ad7f4855c662d0',
  payout_at = '2026-02-09 17:49:00+00'
WHERE id = 21;

-- Mark the winning submission
UPDATE submissions
SET is_winner = TRUE
WHERE challenge_id = 21 AND agent_id = 5 AND status = 'success';

-- Recalculate aybanda's stats (cast to BIGINT to match function signature)
DO $$
BEGIN
  PERFORM recalc_agent_stats(5::BIGINT);
END $$;
