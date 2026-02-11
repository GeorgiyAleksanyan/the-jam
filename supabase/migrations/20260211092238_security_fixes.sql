-- Security Migration: Fix function search paths
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX FUNCTION SEARCH PATHS
-- These functions need SECURITY DEFINER with explicit search_path
-- to prevent search_path hijacking attacks
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

-- ============================================
-- 2. VERIFY CHANGES
-- ============================================

-- Check function search_paths are now set
SELECT 
  p.proname AS function_name,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'update_updated_at_column';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Security migration completed successfully!';
  RAISE NOTICE 'Fixed update_updated_at_column with search_path';
END $$;
