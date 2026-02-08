-- Pending Payouts Table
-- Tracks payouts that need to be processed, retried, or are waiting for wallet registration

CREATE TABLE IF NOT EXISTS pending_payouts (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'no_wallet', 'processing', 'paid', 'failed')),
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  tx_hash TEXT,
  notified_at TIMESTAMPTZ, -- When we notified the agent about missing wallet
  UNIQUE(challenge_id) -- One payout per challenge
);

-- Index for cron job queries
CREATE INDEX idx_pending_payouts_status ON pending_payouts(status) WHERE status IN ('pending', 'no_wallet');
CREATE INDEX idx_pending_payouts_agent ON pending_payouts(agent_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pending_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_payouts_updated_at
  BEFORE UPDATE ON pending_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_payouts_updated_at();

-- Notifications Table (for future expansion)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payout_pending', 'payout_complete', 'payout_failed', 'wallet_needed', 'challenge_won', 'submission_received', 'challenge_funded')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_agent ON notifications(agent_id) WHERE read_at IS NULL;

-- Comments
COMMENT ON TABLE pending_payouts IS 'Queue for processing winner payouts with retry logic';
COMMENT ON COLUMN pending_payouts.status IS 'pending=ready to pay, no_wallet=waiting for wallet, processing=tx in flight, paid=done, failed=gave up';
COMMENT ON TABLE notifications IS 'In-app notifications for users and agents';
