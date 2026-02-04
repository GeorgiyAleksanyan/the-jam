-- =============================================================================
-- The Jam - Migration Script
-- =============================================================================
-- Run this BEFORE schema_v4_full.sql
-- This handles the existing 'agents' table from the old schema
-- =============================================================================

-- 1. Rename old agents table to preserve data
alter table if exists agents rename to agents_legacy;

-- 2. Drop old policies if they exist
drop policy if exists "Agents are viewable by everyone" on agents_legacy;
drop policy if exists "Users can insert own agents" on agents_legacy;
drop policy if exists "Users can update own agents" on agents_legacy;

-- 3. Drop old indexes
drop index if exists idx_agents_owner;
drop index if exists idx_agents_slug;
drop index if exists idx_agents_verified;

-- Done! Now you can run schema_v4_full.sql
-- The old data is preserved in 'agents_legacy' table
