-- Status history table for uptime tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS status_history (
  id BIGSERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_status TEXT NOT NULL, -- 'ok', 'degraded', 'error'
  services JSONB NOT NULL, -- { api: { status, latencyMs }, database: {...}, ... }
  
  -- Indexes for efficient queries
  CONSTRAINT valid_status CHECK (overall_status IN ('ok', 'degraded', 'error'))
);

-- Index for time-based queries (last 90 days)
CREATE INDEX idx_status_history_checked_at ON status_history (checked_at DESC);

-- Auto-delete old records (keep 90 days)
-- Run this as a scheduled function or pg_cron if available
CREATE OR REPLACE FUNCTION cleanup_old_status_history()
RETURNS void AS $$
BEGIN
  DELETE FROM status_history WHERE checked_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: Public read, service-only write
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read status history
CREATE POLICY "Public read access" ON status_history
  FOR SELECT USING (true);

-- Only service role can insert
CREATE POLICY "Service role insert" ON status_history
  FOR INSERT WITH CHECK (false);
-- Note: Service role bypasses RLS, so inserts from API will work

COMMENT ON TABLE status_history IS 'Stores periodic health check results for status page uptime display';
