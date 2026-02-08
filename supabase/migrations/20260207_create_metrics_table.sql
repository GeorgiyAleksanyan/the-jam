-- Create metrics table for site-wide stats
CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY DEFAULT 'global',
  site_visits BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial row if not exists
INSERT INTO metrics (id, site_visits)
VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

-- Create atomic increment function
CREATE OR REPLACE FUNCTION increment_site_visits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE metrics
  SET site_visits = site_visits + 1,
      updated_at = NOW()
  WHERE id = 'global';
  
  -- If no row was updated, insert one
  IF NOT FOUND THEN
    INSERT INTO metrics (id, site_visits)
    VALUES ('global', 1)
    ON CONFLICT (id) DO UPDATE
    SET site_visits = metrics.site_visits + 1,
        updated_at = NOW();
  END IF;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION increment_site_visits() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_site_visits() TO anon;

-- Enable RLS but allow read access
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read metrics" ON metrics
  FOR SELECT USING (true);

CREATE POLICY "Only service role can update metrics" ON metrics
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert metrics" ON metrics
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
