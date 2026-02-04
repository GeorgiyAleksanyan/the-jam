# The Jam - Current State Summary

*Quick reference for resuming work after session restart*

## Last Updated
**2026-02-04 22:07 UTC**

## Completed Work

### Phase 1: Foundation ✅
- Next.js 16 + React 19 scaffold
- Monaco Editor Arena with code execution
- Basic Supabase integration
- Sandbox runner (`lib/runner.ts` using `node:vm`)

### Phase 2: Identity & Auth ✅
- **Supabase Schema v4** applied (`supabase/schema_v4_full.sql`)
  - 12 tables: profiles, agents, challenges, submissions, votes, upvotes, topics, etc.
  - RLS policies on all tables
  - Triggers for auto-updates (vote counts, submission counts, etc.)
  - Views: agent_leaderboard, active_challenges
  
- **Auth System**
  - `lib/auth-context.tsx` - React context with session management
  - `components/AuthModal.tsx` - Email/password + GitHub OAuth
  - `components/UserMenu.tsx` - Dropdown for logged-in users
  - `app/auth/callback/route.ts` - OAuth handler
  
- **Agent System**
  - `app/agents/new/page.tsx` - Registration with API key generation
  - `app/agents/[slug]/page.tsx` - Agent profile with stats
  - `app/agents/page.tsx` - Agent directory
  - `app/api/agents/route.ts` - List + Create
  - `app/api/agents/[slug]/route.ts` - Get by slug
  
- **Core Pages**
  - `app/page.tsx` - Homepage with hero stats, how-it-works, arena
  - `app/challenges/page.tsx` - Challenge listing
  - `app/leaderboard/page.tsx` - Top agents
  - `app/mcp/page.tsx` - MCP integration guide
  
- **Components**
  - `components/Header.tsx` - Site nav with auth
  - `components/HeroStats.tsx` - Live metrics display
  - `components/Arena.tsx` - Code editor (improved)
  - `components/Dashboard.tsx` - Execution history

## In Progress

### Phase 3: Challenge System (Next)
- [ ] `app/challenges/new/page.tsx` - Create challenge form
- [ ] `app/challenges/[slug]/page.tsx` - Challenge detail + submissions
- [ ] `app/api/challenges/route.ts` - List + Create
- [ ] `app/api/challenges/[slug]/route.ts` - Get + Update
- [ ] `app/api/challenges/[slug]/submissions/route.ts` - Submit solutions
- [ ] Voting UI and API

## Key Configuration

### Supabase Project
- **URL:** `https://ayxzfezfzvnrgkdnhqsp.supabase.co`
- **Schema:** v4 applied (all tables created)

### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://ayxzfezfzvnrgkdnhqsp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### GitHub Repository
- **URL:** https://github.com/GeorgiyAleksanyan/the-jam
- **Branch:** main
- **Last commit:** Phase 2 complete (41417eb)

## File Structure (Current)

```
the-jam/
├── app/
│   ├── agents/
│   │   ├── page.tsx              # Agent directory
│   │   ├── new/page.tsx          # Register agent
│   │   └── [slug]/page.tsx       # Agent profile
│   ├── api/
│   │   ├── agent/route.ts        # Sandbox submit
│   │   ├── agents/route.ts       # Agent CRUD
│   │   ├── agents/[slug]/route.ts
│   │   ├── metrics/route.ts      # Global stats
│   │   └── runs/route.ts         # Execution history
│   ├── auth/callback/route.ts    # OAuth
│   ├── challenges/page.tsx       # Challenge list
│   ├── leaderboard/page.tsx      # Rankings
│   ├── mcp/page.tsx              # MCP docs
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Homepage
├── components/
│   ├── Arena.tsx
│   ├── AuthModal.tsx
│   ├── Dashboard.tsx
│   ├── Header.tsx
│   ├── HeroStats.tsx
│   └── UserMenu.tsx
├── lib/
│   ├── auth-context.tsx
│   ├── runner.ts
│   └── supabase.ts
├── supabase/
│   ├── schema_v4_full.sql        # Current schema
│   └── migration_*.sql           # Migration scripts
├── docs/
│   ├── ARCHITECTURE_V2.md        # Full architecture
│   └── ROADMAP.md                # Implementation plan
└── proxy.ts                      # Rate limiting (edge)
```

## Resume Commands

```bash
# Navigate to project
cd /home/ubuntu/.openclaw/workspace/the-jam

# Check status
git status
git log --oneline -5

# Run dev server
npm run dev

# Build
npm run build
```

## Next Actions

1. **Continue Phase 3:**
   - Create challenge creation page
   - Create challenge detail page with submission list
   - Add challenge API routes
   - Wire up submission flow

2. **Or Deploy Current State:**
   - Set up Vercel project
   - Configure environment variables
   - Deploy to test live

---

*This file should be read at the start of each new session when resuming The Jam development.*
