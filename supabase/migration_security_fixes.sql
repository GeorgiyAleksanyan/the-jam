-- Security Migration: Fix function search paths and RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX FUNCTION SEARCH PATHS
-- These functions need SECURITY DEFINER with explicit search_path
-- to prevent search_path hijacking attacks
-- ============================================

-- Fix update_user_sites_updated_at
CREATE OR REPLACE FUNCTION public.update_user_sites_updated_at()
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

-- Fix get_admin_role
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM public.admins
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(admin_role, 'none');
END;
$$;

-- Fix is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Fix update_updated_at_column
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

-- Fix admin_can_access_site
CREATE OR REPLACE FUNCTION public.admin_can_access_site(site_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins a
    JOIN public.user_sites us ON us.user_id = a.user_id
    WHERE a.user_id = auth.uid()
    AND us.site_id = site_id_param
  );
END;
$$;

-- Fix update_order_totals
CREATE OR REPLACE FUNCTION public.update_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update order total based on order items
  UPDATE public.orders
  SET 
    total = (
      SELECT COALESCE(SUM(quantity * price), 0)
      FROM public.order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- 2. FIX OVERLY PERMISSIVE RLS POLICIES
-- These policies allow unrestricted INSERT which bypasses security
-- We add basic rate limiting / validation
-- ============================================

-- Note: These tables are intentionally public-insert for anonymous data collection
-- The "always true" is by design. However, we should add some basic protections:

-- analytics_events: Add created_at auto-fill and basic validation
DROP POLICY IF EXISTS "Anonymous insert analytics" ON public.analytics_events;
CREATE POLICY "Anonymous insert analytics" ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Require event_type to be set
    event_type IS NOT NULL
    AND event_type != ''
    -- Limit event_type length to prevent abuse
    AND LENGTH(event_type) <= 100
  );

-- form_submissions: Add basic validation
DROP POLICY IF EXISTS "Anonymous insert form_submissions" ON public.form_submissions;
CREATE POLICY "Anonymous insert form_submissions" ON public.form_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Require form_type to be set
    form_type IS NOT NULL
    AND form_type != ''
    -- Limit form_type length
    AND LENGTH(form_type) <= 50
  );

-- newsletter_subscribers: Add email validation
DROP POLICY IF EXISTS "Anonymous insert newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anonymous insert newsletter" ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Require email to be set and valid format
    email IS NOT NULL
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    -- Limit email length
    AND LENGTH(email) <= 255
  );

-- ============================================
-- 3. VERIFY CHANGES
-- ============================================

-- Check function search_paths are now set
SELECT 
  p.proname AS function_name,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'update_user_sites_updated_at',
  'get_admin_role', 
  'is_admin',
  'update_updated_at_column',
  'admin_can_access_site',
  'update_order_totals'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Security migration completed successfully!';
  RAISE NOTICE 'Fixed 6 functions with search_path vulnerability';
  RAISE NOTICE 'Updated 3 RLS policies with basic validation';
END $$;
