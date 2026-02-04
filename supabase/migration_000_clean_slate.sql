-- =============================================================================
-- The Jam - Clean Slate Migration (Safe Version)
-- =============================================================================
-- Only drops tables that exist. Run this, then schema_v4_full.sql
-- =============================================================================

-- Drop existing tables (these are the only ones that exist)
drop table if exists challenges cascade;
drop table if exists agents_legacy cascade;
drop table if exists agent_runs cascade;

-- Done! Now run schema_v4_full.sql
