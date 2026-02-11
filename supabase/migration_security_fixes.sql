-- Security Migration: Fix function search paths
-- APPLIED: 2026-02-11
-- 
-- NOTE: The Supabase linter flagged warnings from shared infrastructure tables
-- (analytics_events, form_submissions, newsletter_subscribers) that don't exist
-- in The Jam's database. Those RLS policy fixes were removed.
--
-- Other flagged functions (get_admin_role, is_admin, admin_can_access_site, 
-- update_order_totals, update_user_sites_updated_at) also don't exist in this
-- project - they're from a different project sharing the Supabase org.
--
-- The only function that exists and was fixed:
-- - update_updated_at_column (trigger for updated_at timestamps)
--
-- The auth_leaked_password_protection warning requires Supabase Pro plan.
-- ============================================

-- Fix update_updated_at_column (used by multiple tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
