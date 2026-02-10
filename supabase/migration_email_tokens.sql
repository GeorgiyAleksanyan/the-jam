-- Migration: Email verification and tokens
-- Run this in Supabase SQL Editor

-- Add verified columns to email_signups if they don't exist
ALTER TABLE email_signups 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create email_tokens table for verification and unsubscribe links
CREATE TABLE IF NOT EXISTS email_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'newsletter',
  token VARCHAR(64) NOT NULL UNIQUE,
  action VARCHAR(20) NOT NULL, -- 'verify' or 'unsubscribe'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(email, type, action)
);

-- Enable RLS
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- Service-only policy (no client access)
DROP POLICY IF EXISTS "Service only" ON email_tokens;
CREATE POLICY "Service only" ON email_tokens FOR ALL USING (false);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens(expires_at);

-- Clean up expired tokens (can be run periodically)
-- DELETE FROM email_tokens WHERE expires_at < NOW();

-- Grant access to service role
GRANT ALL ON email_tokens TO service_role;
GRANT USAGE, SELECT ON SEQUENCE email_tokens_id_seq TO service_role;
