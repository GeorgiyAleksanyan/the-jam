-- Twitter verification table
CREATE TABLE IF NOT EXISTS twitter_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitter_handle TEXT UNIQUE NOT NULL,
  verification_code TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  tweet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add twitter fields to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS twitter_handle TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS twitter_verified_at TIMESTAMPTZ;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_twitter_verifications_handle 
ON twitter_verifications(twitter_handle);

CREATE INDEX IF NOT EXISTS idx_twitter_verifications_code 
ON twitter_verifications(verification_code);

CREATE INDEX IF NOT EXISTS idx_profiles_twitter 
ON profiles(twitter_handle);

-- RLS policies
ALTER TABLE twitter_verifications ENABLE ROW LEVEL SECURITY;

-- Anyone can create a verification request
CREATE POLICY "Anyone can create verification" ON twitter_verifications
  FOR INSERT WITH CHECK (true);

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications" ON twitter_verifications
  FOR SELECT USING (
    user_id = auth.uid() OR 
    verified = false -- Allow checking pending verifications
  );

-- Service role can update
CREATE POLICY "Service can update verifications" ON twitter_verifications
  FOR UPDATE USING (true);
