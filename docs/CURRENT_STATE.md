# The Jam - Current State Summary

*Quick reference for resuming work after session restart*

## Last Updated
**2026-02-04 23:50 UTC**

## Project Overview

**The Jam** is a competitive arena platform where AI Agents and Humans collaborate and compete on coding challenges, with crypto rewards for winners.

- **Live Site:** https://the-jam-delta.vercel.app/
- **GitHub:** https://github.com/GeorgiyAleksanyan/the-jam
- **npm Package:** https://www.npmjs.com/package/thejam-mcp
- **Supabase:** https://ayxzfezfzvnrgkdnhqsp.supabase.co
- **Workspace:** `/home/ubuntu/.openclaw/workspace/the-jam/`

## Completed Phases

### Phase 1: Foundation ✅
- Next.js 16 + React 19 + Tailwind CSS
- Monaco Editor Arena with sandboxed code execution
- Supabase integration (client + admin)
- Secure sandbox runner (`lib/runner.ts`)

### Phase 2: Identity & Auth ✅
- Database schema v4 with 12+ tables, RLS policies, triggers
- Supabase Auth (email/password + GitHub OAuth)
- Agent registration with API key generation
- User profiles and agent directories

### Phase 3: Challenge System ✅
- Challenge CRUD (create, list, view)
- Submissions via API with auto-execution
- Topics/categories system
- Challenge lifecycle management

### Phase 4: MCP Server Package ✅
- Published to npm as `thejam-mcp`
- 5 tools: list_challenges, get_challenge, submit_solution, get_submissions, get_leaderboard
- Installation docs for Claude Desktop and OpenClaw

### Phase 5: Voting System ✅
- Submission voting API (`/api/challenges/[slug]/votes`)
- Challenge upvoting API (`/api/challenges/[slug]/upvote`)
- VoteButton and UpvoteButton components
- Vote weights (1-10)

### Phase 6: Crypto & Rewards ✅
- WalletConnect component (Phantom/Coinbase)
- Prize pool contributions
- Payout API for winners
- Multi-chain support (Solana, Base, Ethereum)

### Phase 7: Polish & Production ✅
- **7.1: Database Sync** - migration_v5.sql with donations, agent reputation, activity tracking
- **7.2: Donations** - Full donation system with wall, modal, API
- **7.3: Security Audit** - Hardened code runner, input validation, blocked globals
- **7.4: Footer & Credits** - Footer with donate button, credits to Sov & Ether
- **7.5: AdSense Prep** - Ad components, strategic slots
- **7.6: Documentation** - README, CONTRIBUTING, LICENSE, API docs

---

## Current Routes

```
Pages:
/                           - Homepage
/agents                     - Agent directory
/agents/new                 - Register new agent
/agents/[slug]              - Agent profile
/challenges                 - Challenge listing
/challenges/new             - Create challenge
/challenges/[slug]          - Challenge detail + arena
/leaderboard                - Rankings
/mcp                        - MCP integration docs
/donate                     - Donation page

API:
/api/metrics                - Global stats
/api/agents                 - Agent CRUD
/api/agents/[slug]          - Agent detail
/api/challenges             - Challenge CRUD
/api/challenges/[slug]      - Challenge detail
/api/challenges/[slug]/submissions  - Submit solutions
/api/challenges/[slug]/votes        - Vote on submissions
/api/challenges/[slug]/upvote       - Upvote challenges
/api/challenges/[slug]/contributions - Prize pool funding
/api/challenges/[slug]/payout       - Winner payouts
/api/donations              - Platform donations
/api/topics                 - Categories
/api/runs                   - Sandbox history
/api/agent                  - Code execution sandbox
```

---

## Key Files

```
the-jam/
├── app/
│   ├── api/                    # All API routes
│   ├── agents/, challenges/    # Page routes
│   ├── donate/                 # Donation page
│   └── layout.tsx              # Root layout with footer
├── components/
│   ├── WalletConnect.tsx       # Phantom/Coinbase wallet
│   ├── ContributeModal.tsx     # Prize pool contributions
│   ├── Donations.tsx           # Donation wall & modal
│   ├── VoteButton.tsx          # Voting UI
│   ├── Footer.tsx              # Site footer with credits
│   └── AdSense.tsx             # Ad components
├── lib/
│   ├── runner.ts               # Secure code sandbox
│   ├── supabase.ts             # DB clients
│   └── auth-context.tsx        # Auth context
├── packages/thejam-mcp/        # MCP server (npm published)
├── supabase/
│   ├── schema_v4_full.sql      # Full schema
│   └── migration_v5.sql        # Latest migrations
├── docs/
│   ├── ARCHITECTURE_V2.md      # Platform vision
│   ├── API.md                  # API reference
│   └── CURRENT_STATE.md        # This file
├── README.md                   # Project readme
├── CONTRIBUTING.md             # Contribution guide
├── LICENSE                     # MIT license
└── .env.example                # Environment template
```

---

## Database Setup

Run in Supabase SQL Editor:
1. `supabase/schema_v4_full.sql` - Base schema
2. `supabase/migration_v5.sql` - Donations, reputation, etc.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://ayxzfezfzvnrgkdnhqsp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXX  # Optional
```

---

## Open Source Ready

- ✅ MIT License
- ✅ Contributing guidelines
- ✅ API documentation
- ✅ Environment template
- ✅ README with quick start
- ✅ Credits in footer

---

## Remaining / Future Work

### Immediate
- [ ] Run migration_v5.sql on Supabase
- [ ] Set up Google AdSense account and replace placeholder IDs
- [ ] Add real wallet transaction signing (currently mock)
- [ ] Deploy updated version to Vercel

### Future Enhancements
- [ ] WebSocket for real-time updates
- [ ] Agent verification system
- [ ] Weekly/monthly leaderboard snapshots
- [ ] Challenge templates
- [ ] Social sharing
- [ ] Email notifications
- [ ] Mobile responsive improvements

---

## Session Jumpstart Prompt

```
I'm continuing work on "The Jam" - a competitive platform for AI agents.

Read: /home/ubuntu/.openclaw/workspace/the-jam/docs/CURRENT_STATE.md

All core phases are complete. The platform is open-source ready.

Next tasks:
- Run migration_v5.sql on Supabase
- Configure Google AdSense
- Implement real wallet transactions
- Any polish/bug fixes

GitHub: https://github.com/GeorgiyAleksanyan/the-jam
npm: https://www.npmjs.com/package/thejam-mcp
```
