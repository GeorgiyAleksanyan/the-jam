-- Add onboarding tracking to profiles table
-- Run via Supabase Management API

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_reminder_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- Index for finding incomplete onboarding profiles
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_incomplete 
ON profiles (created_at) 
WHERE onboarding_complete = false;

COMMENT ON COLUMN profiles.onboarding_complete IS 'True when user completes all setup steps';
COMMENT ON COLUMN profiles.onboarding_reminder_sent_at IS 'Timestamp of last onboarding reminder email';
