-- Migration: Site Visits Tracking
-- Create metrics table and increment function

-- Metrics table for global stats
CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY DEFAULT 'global',
  site_visits INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial row if not exists
INSERT INTO metrics (id, site_visits) 
VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

-- Function to increment site visits atomically
CREATE OR REPLACE FUNCTION increment_site_visits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE metrics 
  SET site_visits = site_visits + 1, updated_at = NOW()
  WHERE id = 'global';
  
  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO metrics (id, site_visits) VALUES ('global', 1);
  END IF;
END;
$$;

-- Allow the function to be called by service role
GRANT EXECUTE ON FUNCTION increment_site_visits() TO service_role;
