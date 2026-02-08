-- Phase 8: API Key Access for Rentals
-- Run after 20260208_rental_phase7.sql

-- Create rental API keys table
CREATE TABLE IF NOT EXISTS rental_api_keys (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE NOT NULL,
  
  key_hash TEXT UNIQUE NOT NULL,     -- SHA-256 hash for lookup
  key_preview TEXT NOT NULL,          -- "jam_rental_sk_...abcd" for display
  
  name TEXT DEFAULT 'API Key',
  scopes TEXT[] DEFAULT ARRAY['execute', 'read'],
  
  rate_limit_rpm INTEGER DEFAULT 60,  -- Requests per minute
  rate_limit_rpd INTEGER DEFAULT 1000, -- Requests per day
  
  token_limit INTEGER,                -- Max tokens allowed (null = unlimited)
  tokens_used INTEGER DEFAULT 0,
  
  request_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_api_keys_rental ON rental_api_keys(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_api_keys_hash ON rental_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_rental_api_keys_active ON rental_api_keys(rental_id) 
  WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE rental_api_keys ENABLE ROW LEVEL SECURITY;

-- Renters can view their own keys
CREATE POLICY "Renters view own rental keys" ON rental_api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rentals 
      WHERE rentals.id = rental_api_keys.rental_id 
      AND rentals.renter_id = auth.uid()
    )
  );

-- Renters can create keys for their rentals
CREATE POLICY "Renters create keys" ON rental_api_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rentals 
      WHERE rentals.id = rental_api_keys.rental_id 
      AND rentals.renter_id = auth.uid()
    )
  );

-- Renters can update (revoke) their keys
CREATE POLICY "Renters revoke keys" ON rental_api_keys
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rentals 
      WHERE rentals.id = rental_api_keys.rental_id 
      AND rentals.renter_id = auth.uid()
    )
  );

-- Function to auto-revoke keys when rental ends
CREATE OR REPLACE FUNCTION revoke_rental_api_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled', 'disputed') AND OLD.status NOT IN ('completed', 'cancelled', 'disputed') THEN
    UPDATE rental_api_keys
    SET revoked_at = NOW()
    WHERE rental_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-revoke keys
DROP TRIGGER IF EXISTS rental_status_revoke_keys ON rentals;
CREATE TRIGGER rental_status_revoke_keys
  AFTER UPDATE OF status ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION revoke_rental_api_keys();
