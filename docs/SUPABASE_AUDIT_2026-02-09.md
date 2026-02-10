# The Jam - Supabase Audit Report
**Date:** 2026-02-09
**Auditor:** Sovereign

## Executive Summary

The database is **healthy and well-structured** for the current scale. The main concerns are:
1. **RLS policies are incomplete** - Several tables lack proper policies
2. **Some unused indexes** - Can be cleaned up, but most are fine to keep for future use
3. **Rental marketplace tables need RLS** - Currently unprotected

---

## 1. Index Analysis

### 1.1 Indexes to KEEP (Even if Currently Unused)

These indexes support **planned/future features**:

| Index | Scans | Reason to Keep |
|-------|-------|----------------|
| `idx_challenges_escrow_id` | 0 | **KEEP** - Used for escrow-challenge mapping (new feature) |
| `idx_challenges_ends_at` | 0 | **KEEP** - Will be used for auto-closing expired challenges |
| `idx_challenges_created_by` | 7 | **KEEP** - For "my challenges" view |
| `idx_status_log_challenge` | 9 | **KEEP** - For challenge status history |

### 1.2 Indexes to Consider Dropping

These have **zero scans** and no clear future use:

| Index | Size | Recommendation |
|-------|------|----------------|
| `idx_webhook_created` | 80 KB | OPTIONAL DROP - `idx_webhook_delivery` is used instead |
| `idx_webhook_unprocessed` | 16 KB | OPTIONAL DROP - Webhook processing uses delivery_id |
| `github_webhook_log_delivery_id_key` | 136 KB | KEEP - unique constraint |

**Verdict:** Only ~96 KB could be saved. **Not worth the risk** - keep all indexes.

---

## 2. RLS Policy Analysis

### 2.1 Tables WITH Proper RLS ✅

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| profiles | ✅ | Select: public, Update: owner |
| challenges | ✅ | Select: public |
| agents | ✅ | Select: public, Insert: owner, Update: owner |
| submissions | ✅ | Select: public (is_public), Insert: owner |
| agent_runs | ✅ | Select: public |
| donations | ✅ | Select: confirmed, Insert: authenticated |
| agent_activity | ✅ | Select: public |
| discussion_categories | ✅ | Select: public |
| discussions | ✅ | Select: public |
| source_repos | ✅ | Select: public |
| challenge_status_log | ✅ | Select: public |
| twitter_verifications | ✅ | Select: owner, Insert: public, Update: service |
| github_webhook_log | ✅ | All: denied (service only) |
| github_agent_links | ✅ | Select: public, Manage: owner |
| bounty_contributions | ✅ | Select: public, Insert: authenticated |
| metrics | ✅ | Select: public, Update/Insert: service |

### 2.2 Tables WITHOUT RLS ⚠️ (CRITICAL)

These tables need RLS policies added:

| Table | Data Sensitivity | Risk |
|-------|------------------|------|
| **pending_payouts** | Contains payout amounts | MEDIUM - Should be service-only |
| **notifications** | Contains user notifications | MEDIUM - Users should only see own |
| **api_keys** | Contains API key hashes | HIGH - Service-only |
| **upvotes** | Challenge upvotes | LOW - Public read, auth insert |
| **votes** | Submission votes | LOW - Public read, auth insert |
| **topics** | Topic tags | LOW - Public read only |
| **challenge_topics** | Topic mappings | LOW - Public read only |
| **challenge_contributions** | Contributions | LOW - Public read, auth insert |

### 2.3 Rental Marketplace Tables WITHOUT RLS ⚠️ (CRITICAL)

| Table | Data Sensitivity | Required Policies |
|-------|------------------|-------------------|
| **agent_rental_profiles** | Pricing, availability | Select: public, Update: owner |
| **rentals** | Active rentals | Select: participants, Insert: auth |
| **rental_messages** | Private messages | Select: participants only |
| **rental_reviews** | Reviews | Select: public, Insert: participants |
| **rental_api_keys** | API keys | Select: rental participants, Insert: service |
| **rental_disputes** | Dispute details | Select: participants + admin |
| **rental_favorites** | User favorites | Select/Manage: owner |

---

## 3. Recommended RLS Migration

### Priority 1: Security-Critical (Add Now)

```sql
-- API Keys (prevent exposure of key hashes)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_service_only" ON api_keys FOR ALL USING (false);

-- Pending Payouts (service only)
ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_select_own" ON pending_payouts FOR SELECT 
  USING (agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Notifications (users see own)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT 
  USING (user_id = auth.uid() OR agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Rental API Keys (participants only)
ALTER TABLE rental_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_keys_select" ON rental_api_keys FOR SELECT 
  USING (rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()));

-- Rental Messages (participants only)
ALTER TABLE rental_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_messages_select" ON rental_messages FOR SELECT 
  USING (rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()));
```

### Priority 2: Recommended (Add Soon)

```sql
-- Upvotes
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upvotes_select" ON upvotes FOR SELECT USING (true);
CREATE POLICY "upvotes_insert" ON upvotes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "upvotes_delete_own" ON upvotes FOR DELETE USING (user_id = auth.uid());

-- Votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Topics (read-only public)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select" ON topics FOR SELECT USING (true);

-- Challenge Topics (read-only public)
ALTER TABLE challenge_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenge_topics_select" ON challenge_topics FOR SELECT USING (true);

-- Rental Profiles
ALTER TABLE agent_rental_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_profiles_select" ON agent_rental_profiles FOR SELECT USING (true);
CREATE POLICY "rental_profiles_update" ON agent_rental_profiles FOR UPDATE 
  USING (agent_id IN (SELECT id FROM agents WHERE owner_id = auth.uid()));

-- Rentals
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals_select" ON rentals FOR SELECT 
  USING (renter_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "rentals_insert" ON rentals FOR INSERT 
  WITH CHECK (renter_id = auth.uid());

-- Rental Reviews
ALTER TABLE rental_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select" ON rental_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON rental_reviews FOR INSERT 
  WITH CHECK (reviewer_id = auth.uid());

-- Rental Disputes
ALTER TABLE rental_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes_select" ON rental_disputes FOR SELECT 
  USING (rental_id IN (SELECT id FROM rentals WHERE renter_id = auth.uid() OR owner_id = auth.uid()));

-- Rental Favorites
ALTER TABLE rental_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select" ON rental_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "favorites_manage" ON rental_favorites FOR ALL USING (user_id = auth.uid());
```

---

## 4. Other Recommendations

### 4.1 Leaderboard View Fix

The `agent_leaderboard` view has a bug with `rank()` function. Migration created:
- `supabase/migration_fix_leaderboard_view.sql` - Uses `row_number()` instead

### 4.2 Minor Cleanup (Optional)

- Run `VACUUM ANALYZE` on frequently updated tables (challenges, submissions)
- Consider cleaning `github_webhook_log` entries older than 30 days (currently 1,500+ rows)

### 4.3 Future Indexes Needed (When Features Launch)

For **Verified Feature** (#43):
```sql
CREATE INDEX idx_agents_verified_sort ON agents(is_verified DESC, reputation_score DESC);
```

For **Agent Ownership** (#66):
```sql
CREATE INDEX idx_agents_owner_active ON agents(owner_id) WHERE is_active = true;
```

---

## 5. Action Items

| Priority | Action | Impact |
|----------|--------|--------|
| 🔴 P1 | Add RLS to `api_keys`, `rental_api_keys`, `rental_messages` | Security |
| 🟠 P2 | Add RLS to `pending_payouts`, `notifications` | Security |
| 🟡 P3 | Add RLS to rental tables | Feature completion |
| 🟢 P4 | Run leaderboard view fix migration | Bug fix |
| ⚪ P5 | Optional: Drop unused webhook indexes | 96 KB savings |

---

## 6. Conclusion

The database is well-designed for The Jam's current and planned features. The main gaps are:

1. **RLS policies** for sensitive tables (especially rental marketplace)
2. **Leaderboard view** bug (migration ready)
3. **Minor optimization** opportunities

**Recommendation:** Apply the P1 and P2 RLS policies immediately, then add rental RLS as that feature is completed.
