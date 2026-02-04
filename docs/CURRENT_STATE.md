# The Jam - Current State Summary

*Quick reference for resuming work after session restart*

## Last Updated
**2026-02-04 22:18 UTC**

## Project Overview

**The Jam** is a competitive arena platform where AI Agents and Humans collaborate and compete on coding challenges, with crypto rewards for winners.

- **Live Site:** https://the-jam-delta.vercel.app/
- **GitHub:** https://github.com/GeorgiyAleksanyan/the-jam
- **Supabase:** https://ayxzfezfzvnrgkdnhqsp.supabase.co
- **Workspace:** `/home/ubuntu/.openclaw/workspace/the-jam/`

## Completed Phases

### Phase 1: Foundation ✅
- Next.js 16 + React 19 + Tailwind CSS
- Monaco Editor Arena with sandboxed code execution
- Supabase integration (client + admin)
- Sandbox runner (`lib/runner.ts` using `node:vm`)

### Phase 2: Identity & Auth ✅
- **Database:** Full schema v4 with 12 tables, RLS policies, triggers
- **Auth:** Supabase Auth (email/password + GitHub OAuth)
- **Agents:** Registration with API key generation
- **Pages:** Homepage, agents directory, agent profiles, leaderboard, MCP guide

### Phase 3: Challenge System ✅
- **Challenge CRUD:** Create, list, view challenges
- **Submissions:** Submit code via API, auto-execute, score
- **Components:** ChallengeArena, SubmissionList
- **Topics:** Tag system for categorizing challenges

---

## Current Routes

```
Pages:
/                           - Homepage with hero stats + sandbox arena
/agents                     - Agent directory
/agents/new                 - Register new agent (auth required)
/agents/[slug]              - Agent profile page
/challenges                 - Challenge listing with filters
/challenges/new             - Create challenge (auth required)
/challenges/[slug]          - Challenge detail + submissions + test arena
/leaderboard                - Top agents by wins/earnings
/mcp                        - MCP integration documentation
/auth/callback              - OAuth callback handler

API:
/api/metrics                - Global site stats (GET)
/api/agents                 - List agents (GET) / Create agent (POST)
/api/agents/[slug]          - Get agent by slug (GET)
/api/challenges             - List (GET) / Create challenge (POST)
/api/challenges/[slug]      - Get challenge detail (GET)
/api/challenges/[slug]/submissions - List (GET) / Submit solution (POST)
/api/topics                 - List topics (GET)
/api/runs                   - Sandbox execution history (GET)
/api/agent                  - Test code in sandbox (POST)
```

---

## Remaining Work

### Phase 4: MCP Server Package (~3h)
- [ ] Create `packages/thejam-mcp/` monorepo structure
- [ ] Implement MCP server with tools:
  - `list_challenges` - Browse open challenges
  - `get_challenge` - Get challenge details
  - `submit_solution` - Submit code for a challenge
  - `get_submissions` - View agent's submissions
  - `get_leaderboard` - View rankings
- [ ] Publish to npm as `@thejam/mcp` or `thejam-mcp`
- [ ] Update `/mcp` page with installation instructions

### Phase 5: Voting System (~2h)
- [ ] `app/api/challenges/[slug]/votes/route.ts` - Vote on submissions
- [ ] `app/api/challenges/[slug]/upvote/route.ts` - Upvote challenges
- [ ] `components/VoteButton.tsx` - Voting UI
- [ ] Update submission scoring with vote weights

### Phase 6: Crypto & Rewards (~4h)
- [ ] Wallet connection (Phantom/Coinbase)
- [ ] Prize pool contribution flow
- [ ] Winner payout mechanism
- [ ] Transaction history

### Phase 7: Polish & Deploy (~2h)
- [ ] Error boundaries
- [ ] Loading states
- [ ] SEO meta tags
- [ ] Production deployment (Vercel)

---

## Key Files

```
the-jam/
├── app/
│   ├── agents/             # Agent pages
│   │   ├── page.tsx        # Directory
│   │   ├── new/page.tsx    # Registration
│   │   └── [slug]/page.tsx # Profile
│   ├── challenges/         # Challenge pages
│   │   ├── page.tsx        # Listing
│   │   ├── new/page.tsx    # Creation
│   │   └── [slug]/page.tsx # Detail
│   ├── api/                # API routes
│   │   ├── agents/         # Agent CRUD
│   │   ├── challenges/     # Challenge + Submission CRUD
│   │   ├── metrics/        # Stats
│   │   └── topics/         # Categories
│   ├── auth/callback/      # OAuth
│   ├── leaderboard/        # Rankings
│   ├── mcp/                # MCP docs
│   ├── layout.tsx          # Root (AuthProvider, Header)
│   └── page.tsx            # Homepage
├── components/
│   ├── Arena.tsx           # Homepage sandbox
│   ├── ChallengeArena.tsx  # Challenge-specific sandbox
│   ├── SubmissionList.tsx  # Submission display
│   ├── AuthModal.tsx       # Login/signup
│   ├── UserMenu.tsx        # User dropdown
│   ├── Header.tsx          # Site nav
│   └── HeroStats.tsx       # Metrics display
├── lib/
│   ├── supabase.ts         # Supabase clients
│   ├── auth-context.tsx    # Auth React context
│   └── runner.ts           # Sandbox code execution
├── supabase/
│   └── schema_v4_full.sql  # Complete database schema
├── docs/
│   ├── ARCHITECTURE_V2.md  # Full platform vision
│   ├── ROADMAP.md          # Phase breakdown
│   └── CURRENT_STATE.md    # This file
└── proxy.ts                # Rate limiting middleware
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://ayxzfezfzvnrgkdnhqsp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

---

## Development Commands

```bash
cd /home/ubuntu/.openclaw/workspace/the-jam

npm install          # Install dependencies
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server

git status           # Check for changes
git log --oneline -5 # Recent commits
```

---

## Session Jumpstart Prompt

Use this to resume work in a new chat:

```
I'm building "The Jam" - a competitive platform for AI agents.

Read these files first:
- /home/ubuntu/.openclaw/workspace/the-jam/docs/CURRENT_STATE.md
- /home/ubuntu/.openclaw/workspace/the-jam/docs/ARCHITECTURE_V2.md

Phases 1-3 are complete (Foundation, Auth, Challenges).

Next: [CHOOSE ONE]
- Continue with Phase 4 (MCP Server Package)
- Continue with Phase 5 (Voting System)
- Deploy to Vercel first

GitHub: https://github.com/GeorgiyAleksanyan/the-jam
```

---

*Last commit: c7beeee - docs: Update CURRENT_STATE.md with Phase 3 completion*
