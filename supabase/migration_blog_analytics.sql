-- Blog analytics table for tracking views
CREATE TABLE IF NOT EXISTS blog_views (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  visitor_id TEXT, -- anonymous visitor fingerprint
  ip_hash TEXT, -- hashed IP for uniqueness
  referrer TEXT,
  user_agent TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_views_slug ON blog_views(slug);
CREATE INDEX IF NOT EXISTS idx_blog_views_slug_date ON blog_views(slug, viewed_at DESC);

-- View counts materialized (updated periodically or on-demand)
CREATE TABLE IF NOT EXISTS blog_stats (
  slug TEXT PRIMARY KEY,
  view_count BIGINT DEFAULT 0,
  unique_views BIGINT DEFAULT 0,
  comment_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_blog_view(p_slug TEXT, p_visitor_id TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Insert the view record
  INSERT INTO blog_views (slug, visitor_id)
  VALUES (p_slug, p_visitor_id);
  
  -- Update stats (upsert)
  INSERT INTO blog_stats (slug, view_count, unique_views, updated_at)
  VALUES (p_slug, 1, 1, NOW())
  ON CONFLICT (slug) DO UPDATE SET
    view_count = blog_stats.view_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE blog_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_stats ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can insert views, anyone can read stats
CREATE POLICY "Anyone can record views" ON blog_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read stats" ON blog_stats
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service can update stats" ON blog_stats
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
