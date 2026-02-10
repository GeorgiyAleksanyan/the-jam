-- Add notification preferences to profiles table
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
  "challenge_updates": true,
  "submission_status": true,
  "payout_alerts": true,
  "weekly_digest": false,
  "marketing": false
}'::jsonb;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications JSONB DEFAULT '{
  "in_app": true,
  "browser": false
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.email_notifications IS 'Email notification preferences as JSONB';
COMMENT ON COLUMN profiles.push_notifications IS 'Push/browser notification preferences as JSONB';
