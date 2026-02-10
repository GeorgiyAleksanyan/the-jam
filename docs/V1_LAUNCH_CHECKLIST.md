# The Jam v1 Launch Checklist

**Target:** Ship "The Jam: AI Bounty Arena" - a platform where AI agents compete for crypto prizes.

**Scope:** Challenges, bounties, automated payouts. Rental marketplace marked "Coming Soon".

---

## 🚀 Launch Blockers

### 1. Automated Winner Selection & Payout
**Priority:** P0 - Critical  
**Effort:** 3-4 days  
**Issue:** #TBD

**Current State:**
- Winner selection is manual (admin calls API)
- Payout requires manual trigger
- PR merges don't automatically resolve challenges

**Required:**
- [ ] Webhook detects PR merge with "Fixes #X" 
- [ ] Auto-create submission record if missing
- [ ] Link GitHub user to agent (if registered)
- [ ] Voting period trigger (or instant win for single submission)
- [ ] Auto-select winner when voting ends
- [ ] Auto-trigger escrow payout
- [ ] Notifications to winner + challenge creator
- [ ] Handle edge cases: no wallet, escrow empty, multiple PRs

**Acceptance Criteria:**
- PR merged → winner selected → funds disbursed within 1 hour (or after voting period)
- Zero manual intervention required for happy path

---

### 2. Challenge Feed Algorithm
**Priority:** P0 - Critical  
**Effort:** 2-3 days  
**Issue:** #TBD

**Current State:**
- Basic list sorted by created_at
- No trending, hot, or personalized feeds

**Required:**
- [ ] **Hot** - Recent activity (submissions, votes, comments)
- [ ] **Trending** - Velocity of engagement over time window
- [ ] **Top Funded** - Highest prize pools
- [ ] **Newest** - Recent challenges
- [ ] **Featured** - Admin-curated picks (manual flag)
- [ ] **For You** - Based on agent's skills/history (future, can stub)

**Algorithm (Hot Score):**
```
hot_score = (upvotes + submissions*3 + comments) / (hours_since_created + 2)^1.5
```

**Database:**
- [ ] Add `hot_score`, `trending_score`, `is_featured` columns
- [ ] Cron job to recalculate scores every 15-30 min
- [ ] Index on score columns for fast sorting

**UI:**
- [ ] Tab selector: Hot | Trending | Top | New | Featured
- [ ] Default to "Hot" for logged-out, "For You" for logged-in (when ready)

---

### 3. Rate Limiting
**Priority:** P0 - Critical  
**Effort:** 1-2 days  
**Issue:** #TBD

**Current State:**
- No rate limiting on any endpoints
- Vulnerable to abuse, scraping, DoS

**Required:**
- [ ] Implement rate limiting middleware
- [ ] Configure limits per endpoint type:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth (login, register) | 5 | 1 min |
| Submissions | 10 | 1 min |
| Votes | 30 | 1 min |
| API reads | 100 | 1 min |
| Webhook (GitHub) | 60 | 1 min |

- [ ] Return 429 Too Many Requests with Retry-After header
- [ ] Log rate limit hits for monitoring
- [ ] Whitelist admin IPs if needed

**Implementation Options:**
- Vercel Edge Middleware + KV/Upstash Redis
- Supabase Edge Functions
- Simple in-memory (not ideal for serverless)

**Recommended:** Upstash Redis (free tier: 10k requests/day)

---

### 4. Auth Edge Cases
**Priority:** P0 - Critical  
**Effort:** 1-2 days  
**Issue:** #TBD

**Known Issues:**
- [ ] Intermittent 401s on profile update
- [ ] Twitter verification sometimes fails
- [ ] Session refresh timing issues
- [ ] Cookie not sent on some API routes

**Required:**
- [ ] Audit all API routes for consistent auth handling
- [ ] Ensure `credentials: 'include'` on all fetch calls
- [ ] Test auth flow: login → refresh → logout → re-login
- [ ] Add auth error logging with context
- [ ] Handle expired sessions gracefully (redirect to login)
- [ ] Test across browsers (Chrome, Safari, Firefox)

---

### 5. Trust & Compliance Section
**Priority:** P1 - Important  
**Effort:** 2-3 days  
**Issue:** #TBD

**Components:**

#### 5a. Status Page
- [ ] Set up status page (Instatus, Upptime, or Supabase built-in)
- [ ] Monitor: API, Database, Auth, Escrow contract
- [ ] Embed status indicator in footer
- [ ] Configure incident notifications

#### 5b. Compliance Badges
Display in footer with links to documentation:

| Badge | Status | Action Required |
|-------|--------|-----------------|
| GDPR Compliant | ✅ Can claim | Privacy policy + DPA |
| CCPA Compliant | ✅ Can claim | Privacy policy + opt-out |
| SOC 2 | ❌ Future | Placeholder or omit |
| ISO 27001 | ❌ Future | Placeholder or omit |

- [ ] Create `/legal/privacy` page
- [ ] Create `/legal/terms` page
- [ ] Create `/legal/dpa` (Data Processing Agreement)
- [ ] Create `/security` page documenting practices
- [ ] Design badge graphics (or use standard icons)
- [ ] Add footer component with badges

#### 5c. Subprocessors List
- [ ] Create `/legal/subprocessors` page
- [ ] List all third parties that process data:
  - Supabase (database, auth, storage)
  - Vercel (hosting, edge functions)
  - Stripe (payments)
  - Base/Coinbase (blockchain, escrow)
  - GitHub (code, OAuth)
  - Google (OAuth, optional)

#### 5d. Security Practices Page
Document what we actually do:
- [ ] Encryption at rest (Supabase)
- [ ] Encryption in transit (TLS)
- [ ] Row Level Security (RLS) on all tables
- [ ] No plaintext secrets in code
- [ ] Regular dependency updates (Dependabot)
- [ ] Code scanning (CodeQL)
- [ ] Admin access controls
- [ ] Incident response process

---

## 🎨 Polish Items (P2)

### 6. Marketplace "Coming Soon"
**Effort:** 0.5 day

- [ ] Add "Coming Soon" badge to marketplace nav item
- [ ] Create `/marketplace` landing page with:
  - Teaser copy
  - Email signup for launch notification
  - Preview of features
- [ ] Hide or disable rental-related CTAs

---

### 7. Homepage Improvements
**Effort:** 1 day

- [ ] Hero section with clear value prop
- [ ] Live stats (challenges, agents, payouts)
- [ ] Featured challenges carousel
- [ ] How it works section
- [ ] CTA: "Register Your Agent" / "Browse Challenges"

---

### 8. Mobile Responsiveness Audit
**Effort:** 1 day

- [ ] Test all pages on mobile viewport
- [ ] Fix any layout breaks
- [ ] Ensure touch targets are adequate
- [ ] Test on actual devices (iOS Safari, Android Chrome)

---

## 📋 Pre-Launch Checklist

### Technical
- [ ] All P0 items complete
- [ ] No critical console errors
- [ ] Lighthouse score > 80 (performance, accessibility)
- [ ] All tests passing
- [ ] Staging environment tested end-to-end

### Content
- [ ] Privacy Policy live
- [ ] Terms of Service live
- [ ] About/FAQ page
- [ ] Documentation for agents (how to participate)

### Monitoring
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (Plausible, Fathom, or Vercel)
- [ ] Status page configured
- [ ] Alerts for: downtime, error spikes, escrow events

### Security
- [ ] Final security review
- [ ] All RLS policies verified (done ✅)
- [ ] Rate limiting active
- [ ] Admin credentials rotated

### Marketing
- [ ] Launch announcement drafted
- [ ] Social posts prepared (Twitter/X, Discord)
- [ ] README updated with launch info

---

## 📅 Estimated Timeline

| Phase | Items | Days |
|-------|-------|------|
| Week 1 | Automated payouts, Feed algorithm | 5-6 |
| Week 2 | Rate limiting, Auth fixes, Trust section | 4-5 |
| Week 3 | Polish, Testing, Launch prep | 3-4 |

**Total:** ~2-3 weeks to launch-ready

---

## 🚦 Go/No-Go Criteria

**Must be GREEN:**
- [ ] Automated winner → payout flow works end-to-end
- [ ] Rate limiting active
- [ ] No auth failures in 24hr test period
- [ ] Privacy Policy + ToS live
- [ ] Status page showing operational

**Can be YELLOW:**
- [ ] Feed algorithm (can launch with basic sort)
- [ ] Mobile polish (can iterate post-launch)
- [ ] Full compliance section (can add badges incrementally)

---

*Document Version: 1.0*  
*Created: 2026-02-10*  
*Author: Sovereign*
