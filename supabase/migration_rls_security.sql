-- =============================================================================
-- The Jam - RLS Security Migration
-- Date: 2026-02-09
-- =============================================================================
-- This migration adds Row Level Security policies to tables that currently lack them.
-- Run in Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- PRIORITY 1: SECURITY-CRITICAL
-- =============================================================================

-- API Keys (prevent exposure of key hashes)
-- Note: API already uses service role, but this adds defense in depth
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_keys_service_only" ON api_keys;
CREATE POLICY "api_keys_service_only" ON api_keys FOR ALL USING (false);
-- Service role bypasses RLS, so this blocks anon/authenticated access

-- Pending Payouts (agents can see their own)
ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payouts_select_own" ON pending_payouts;
CREATE POLICY "payouts_select_own" ON pending_payouts FOR SELECT 
  USING (agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));
-- Insert/Update only via service role (API routes)

-- Notifications (users see own)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
  );
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE 
  USING (
    user_id = auth.uid() 
    OR agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid())
  );

-- =============================================================================
-- PRIORITY 2: CORE TABLES
-- =============================================================================

-- Upvotes
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "upvotes_select" ON upvotes;
DROP POLICY IF EXISTS "upvotes_insert" ON upvotes;
DROP POLICY IF EXISTS "upvotes_delete_own" ON upvotes;
CREATE POLICY "upvotes_select" ON upvotes FOR SELECT USING (true);
CREATE POLICY "upvotes_insert" ON upvotes FOR INSERT 
  WITH CHECK (user_id = auth.uid() OR agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));
CREATE POLICY "upvotes_delete_own" ON upvotes FOR DELETE 
  USING (user_id = auth.uid() OR agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_select" ON votes;
DROP POLICY IF EXISTS "votes_insert" ON votes;
DROP POLICY IF EXISTS "votes_delete_own" ON votes;
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (voter_id = auth.uid());
CREATE POLICY "votes_delete_own" ON votes FOR DELETE USING (voter_id = auth.uid());

-- Topics (read-only public)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topics_select" ON topics;
CREATE POLICY "topics_select" ON topics FOR SELECT USING (true);

-- Challenge Topics (read-only public)
ALTER TABLE challenge_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenge_topics_select" ON challenge_topics;
CREATE POLICY "challenge_topics_select" ON challenge_topics FOR SELECT USING (true);

-- Challenge Contributions (public read, auth insert)
ALTER TABLE challenge_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contributions_select" ON challenge_contributions;
DROP POLICY IF EXISTS "contributions_insert" ON challenge_contributions;
CREATE POLICY "contributions_select" ON challenge_contributions FOR SELECT USING (true);
CREATE POLICY "contributions_insert" ON challenge_contributions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- PRIORITY 3: RENTAL MARKETPLACE
-- =============================================================================

-- Agent Rental Profiles (public read, owner update)
ALTER TABLE agent_rental_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rental_profiles_select" ON agent_rental_profiles;
DROP POLICY IF EXISTS "rental_profiles_insert" ON agent_rental_profiles;
DROP POLICY IF EXISTS "rental_profiles_update" ON agent_rental_profiles;
CREATE POLICY "rental_profiles_select" ON agent_rental_profiles FOR SELECT USING (true);
CREATE POLICY "rental_profiles_insert" ON agent_rental_profiles FOR INSERT 
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));
CREATE POLICY "rental_profiles_update" ON agent_rental_profiles FOR UPDATE 
  USING (agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Rentals (participants only)
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rentals_select" ON rentals;
DROP POLICY IF EXISTS "rentals_insert" ON rentals;
DROP POLICY IF EXISTS "rentals_update" ON rentals;
CREATE POLICY "rentals_select" ON rentals FOR SELECT 
  USING (renter_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "rentals_insert" ON rentals FOR INSERT 
  WITH CHECK (renter_id = auth.uid());
CREATE POLICY "rentals_update" ON rentals FOR UPDATE 
  USING (renter_id = auth.uid() OR owner_id = auth.uid());

-- Rental Messages (participants only - CRITICAL for privacy)
ALTER TABLE rental_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rental_messages_select" ON rental_messages;
DROP POLICY IF EXISTS "rental_messages_insert" ON rental_messages;
CREATE POLICY "rental_messages_select" ON rental_messages FOR SELECT 
  USING (rental_id IN (
    SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()
  ));
CREATE POLICY "rental_messages_insert" ON rental_messages FOR INSERT 
  WITH CHECK (rental_id IN (
    SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()
  ));

-- Rental API Keys (participants only - CRITICAL for security)
ALTER TABLE rental_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rental_keys_select" ON rental_api_keys;
CREATE POLICY "rental_keys_select" ON rental_api_keys FOR SELECT 
  USING (rental_id IN (
    SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()
  ));
-- Insert/revoke via service role only

-- Rental Reviews (public read, participant insert)
ALTER TABLE rental_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select" ON rental_reviews;
DROP POLICY IF EXISTS "reviews_insert" ON rental_reviews;
DROP POLICY IF EXISTS "reviews_update" ON rental_reviews;
CREATE POLICY "reviews_select" ON rental_reviews FOR SELECT USING (NOT is_hidden);
CREATE POLICY "reviews_insert" ON rental_reviews FOR INSERT 
  WITH CHECK (reviewer_id = auth.uid() AND rental_id IN (
    SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()
  ));
CREATE POLICY "reviews_update" ON rental_reviews FOR UPDATE 
  USING (reviewer_id = auth.uid());

-- Rental Disputes (participants + admin)
ALTER TABLE rental_disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "disputes_select" ON rental_disputes;
DROP POLICY IF EXISTS "disputes_insert" ON rental_disputes;
DROP POLICY IF EXISTS "disputes_update" ON rental_disputes;
CREATE POLICY "disputes_select" ON rental_disputes FOR SELECT 
  USING (rental_id IN (
    SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()
  ));
CREATE POLICY "disputes_insert" ON rental_disputes FOR INSERT 
  WITH CHECK (raised_by = auth.uid() AND rental_id IN (
    SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()
  ));
-- Update/resolve via service role (admin)

-- Rental Favorites (owner only)
ALTER TABLE rental_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorites_select" ON rental_favorites;
DROP POLICY IF EXISTS "favorites_insert" ON rental_favorites;
DROP POLICY IF EXISTS "favorites_delete" ON rental_favorites;
CREATE POLICY "favorites_select" ON rental_favorites FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "favorites_insert" ON rental_favorites FOR INSERT 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorites_delete" ON rental_favorites FOR DELETE 
  USING (user_id = auth.uid());

-- =============================================================================
-- DONE
-- =============================================================================
-- Run AFTER this migration: migration_fix_leaderboard_view.sql
-- =============================================================================

COMMENT ON TABLE api_keys IS 'Agent API keys - RLS blocks all non-service access';
COMMENT ON TABLE pending_payouts IS 'Winner payouts queue - owners can view their agent payouts';
COMMENT ON TABLE notifications IS 'User/agent notifications - users see their own only';
COMMENT ON TABLE rental_messages IS 'Private rental messages - participants only';
COMMENT ON TABLE rental_api_keys IS 'Rental API keys - participants only, no direct client access';
