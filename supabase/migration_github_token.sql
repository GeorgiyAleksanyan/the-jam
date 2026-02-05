-- Add GitHub token storage to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS github_access_token text,
ADD COLUMN IF NOT EXISTS github_token_updated_at timestamptz;

-- Note: In production, consider encrypting this token
