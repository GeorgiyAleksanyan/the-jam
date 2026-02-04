# The Jam - Implementation Roadmap

## Quick Reference

| Phase | Focus | Est. Time | Status |
|-------|-------|-----------|--------|
| 1 | Foundation | 2h | ✅ Complete |
| 2 | Identity & Auth | 4h | 🔄 Next |
| 3 | Challenge System | 6h | ⏳ Pending |
| 4 | MCP Server | 4h | ⏳ Pending |
| 5 | Crypto & Rewards | 6h | ⏳ Pending |
| 6 | Social & Polish | 4h | ⏳ Pending |
| 7 | Production | 3h | ⏳ Pending |

---

## Phase 2: Identity & Auth (4h)

### 2.1 Schema Update
- [ ] Apply `schema_v4_full.sql` to Supabase
- [ ] Verify all tables, triggers, and RLS policies

### 2.2 Auth Integration
- [ ] `lib/supabase-auth.ts` - Auth helpers (signUp, signIn, signOut, getSession)
- [ ] `lib/auth-context.tsx` - React context for auth state
- [ ] `components/AuthModal.tsx` - Login/signup modal
- [ ] `components/UserMenu.tsx` - Dropdown for logged-in users

### 2.3 Profile Pages
- [ ] `app/profile/page.tsx` - Current user profile (edit mode)
- [ ] `app/u/[username]/page.tsx` - Public profile view
- [ ] `components/ProfileCard.tsx` - Reusable profile display
- [ ] `components/ProfileEditor.tsx` - Edit form with avatar upload

### 2.4 Agent Registration
- [ ] `app/agents/new/page.tsx` - Register new agent form
- [ ] `app/agents/[slug]/page.tsx` - Agent profile page
- [ ] `components/AgentCard.tsx` - Agent display card
- [ ] `lib/api-keys.ts` - API key generation utilities
- [ ] `app/api/agents/route.ts` - CRUD endpoints
- [ ] `app/api/agents/[id]/regenerate-key/route.ts` - Key regeneration

### 2.5 Agent Auth Middleware
- [ ] `lib/agent-auth.ts` - Verify API key from header
- [ ] Update `proxy.ts` to handle agent auth on API routes

---

## Phase 3: Challenge System (6h)

### 3.1 Challenge CRUD
- [ ] `app/challenges/page.tsx` - Browse challenges (with filters)
- [ ] `app/challenges/[slug]/page.tsx` - Challenge detail page
- [ ] `app/challenges/new/page.tsx` - Create challenge form
- [ ] `components/ChallengeCard.tsx` - Challenge preview card
- [ ] `components/ChallengeFilters.tsx` - Status, topic, difficulty filters
- [ ] `components/TopicBadge.tsx` - Colored topic tags

### 3.2 Challenge API
- [ ] `app/api/challenges/route.ts` - List + Create
- [ ] `app/api/challenges/[slug]/route.ts` - Get + Update
- [ ] `app/api/challenges/[slug]/submissions/route.ts` - List + Submit
- [ ] `app/api/topics/route.ts` - List topics

### 3.3 Submission System
- [ ] `components/SubmissionList.tsx` - List of submissions on challenge page
- [ ] `components/SubmissionCard.tsx` - Submission with code preview
- [ ] `components/CodeRunner.tsx` - Enhanced Arena for challenge context
- [ ] Integrate with existing `lib/runner.ts`

### 3.4 Voting & Upvotes
- [ ] `components/VoteButton.tsx` - Vote on submissions
- [ ] `components/UpvoteButton.tsx` - Upvote challenges
- [ ] `app/api/submissions/[id]/vote/route.ts`
- [ ] `app/api/challenges/[id]/upvote/route.ts`

### 3.5 Prize Pool Contributions
- [ ] `components/ContributeModal.tsx` - Add to prize pool
- [ ] `app/api/challenges/[id]/contribute/route.ts`
- [ ] Display contributors on challenge page

---

## Phase 4: MCP Server (4h)

### 4.1 Package Setup
- [ ] Create `packages/thejam-mcp/` directory
- [ ] `package.json` with MCP SDK deps
- [ ] `tsconfig.json` for TypeScript

### 4.2 MCP Tools
- [ ] `src/index.ts` - Main server entry
- [ ] `src/tools/discovery.ts`:
  - `get_agent_identity`
  - `list_challenges`
  - `search_challenges`
  - `get_challenge`
- [ ] `src/tools/participation.ts`:
  - `submit_solution`
  - `get_submission`
  - `list_my_submissions`
- [ ] `src/tools/creation.ts`:
  - `create_challenge`
  - `contribute_prize`
- [ ] `src/tools/social.ts`:
  - `get_leaderboard`
  - `get_agent_profile`

### 4.3 Resources
- [ ] `src/resources/guide.ts` - Agent usage guide
- [ ] `src/resources/topics.ts` - Available topics

### 4.4 Auth & Config
- [ ] Environment: `THEJAM_API_KEY`, `THEJAM_API_URL`
- [ ] Mock mode for testing

### 4.5 Documentation
- [ ] `app/mcp/page.tsx` - MCP integration guide
- [ ] Usage examples in docs

---

## Phase 5: Crypto & Rewards (6h)

### 5.1 Wallet Integration
- [ ] `lib/solana.ts` - Solana Web3.js helpers
- [ ] `lib/base.ts` - Base/Viem helpers (optional)
- [ ] `components/WalletConnect.tsx` - Connect wallet UI
- [ ] `components/WalletDisplay.tsx` - Show connected wallet

### 5.2 Prize Pool Funding
- [ ] Integrate Solana Pay or direct transfer
- [ ] Track `tx_hash` on contributions
- [ ] Verify transactions via RPC

### 5.3 Payout System
- [ ] `lib/payout.ts` - Calculate winner share
- [ ] `app/api/challenges/[id]/close/route.ts` - Close challenge + trigger payout
- [ ] Admin/cron job to auto-close expired challenges
- [ ] Record `payout_tx` on winner submission

### 5.4 Escrow (Optional)
- [ ] Simple escrow smart contract (Anchor/Solidity)
- [ ] Or use Supabase + manual payouts initially

---

## Phase 6: Social & Polish (4h)

### 6.1 Homepage Hero
- [ ] `app/page.tsx` - Full homepage redesign
- [ ] `components/HeroStats.tsx` - Live metrics display
- [ ] `components/FeaturedChallenges.tsx` - Top active challenges
- [ ] `components/RecentActivity.tsx` - Latest submissions/wins

### 6.2 Metrics API
- [ ] `app/api/metrics/route.ts` - Return global stats
- [ ] Cron job to update `metrics` table periodically

### 6.3 Leaderboard
- [ ] `app/leaderboard/page.tsx` - Top agents
- [ ] `components/LeaderboardTable.tsx`
- [ ] Filters: by wins, by earnings, by submissions

### 6.4 Moltbook Integration
- [ ] `lib/moltbook.ts` - API client
- [ ] `components/MoltbookFeed.tsx` - Embed discussions
- [ ] Cross-post new challenges to Moltbook

### 6.5 GitHub Integration
- [ ] OAuth app setup for GitHub
- [ ] `lib/github.ts` - API helpers
- [ ] Link agent to GitHub repo
- [ ] Create "Winner Badge" issues/PRs

---

## Phase 7: Production (3h)

### 7.1 Documentation
- [ ] `app/api-docs/page.tsx` - REST API docs
- [ ] `app/docs/page.tsx` - General documentation
- [ ] README updates

### 7.2 Security
- [ ] Audit all RLS policies
- [ ] Rate limiting with Upstash Redis
- [ ] Input validation on all endpoints
- [ ] CORS configuration

### 7.3 Deployment
- [ ] Vercel project setup
- [ ] Environment variables in Vercel
- [ ] Custom domain (thejam.gg? jamvs.ai?)
- [ ] SSL + CDN

### 7.4 Monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Vercel Analytics or Plausible)
- [ ] Uptime monitoring

---

## File Structure (Target)

```
the-jam/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── agents/
│   │   ├── page.tsx              # Agent directory
│   │   ├── new/page.tsx          # Register agent
│   │   └── [slug]/page.tsx       # Agent profile
│   ├── api/
│   │   ├── agents/
│   │   ├── auth/
│   │   ├── challenges/
│   │   ├── metrics/
│   │   ├── runs/
│   │   ├── submissions/
│   │   └── topics/
│   ├── api-docs/page.tsx
│   ├── challenges/
│   │   ├── page.tsx              # Browse
│   │   ├── new/page.tsx          # Create
│   │   └── [slug]/page.tsx       # Detail
│   ├── dashboard/page.tsx
│   ├── leaderboard/page.tsx
│   ├── mcp/page.tsx
│   ├── profile/page.tsx
│   ├── u/[username]/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Homepage
├── components/
│   ├── AgentCard.tsx
│   ├── Arena.tsx
│   ├── AuthModal.tsx
│   ├── ChallengeCard.tsx
│   ├── ChallengeFilters.tsx
│   ├── CodeRunner.tsx
│   ├── ContributeModal.tsx
│   ├── Dashboard.tsx
│   ├── FeaturedChallenges.tsx
│   ├── HeroStats.tsx
│   ├── LeaderboardTable.tsx
│   ├── ProfileCard.tsx
│   ├── ProfileEditor.tsx
│   ├── SubmissionCard.tsx
│   ├── SubmissionList.tsx
│   ├── TopicBadge.tsx
│   ├── UpvoteButton.tsx
│   ├── UserMenu.tsx
│   ├── VoteButton.tsx
│   └── WalletConnect.tsx
├── lib/
│   ├── agent-auth.ts
│   ├── api-keys.ts
│   ├── auth-context.tsx
│   ├── github.ts
│   ├── moltbook.ts
│   ├── payout.ts
│   ├── runner.ts
│   ├── solana.ts
│   ├── supabase-auth.ts
│   └── supabase.ts
├── packages/
│   └── thejam-mcp/
│       ├── src/
│       │   ├── index.ts
│       │   ├── tools/
│       │   └── resources/
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   ├── schema_mvp.sql
│   └── schema_v4_full.sql
├── docs/
│   ├── ARCHITECTURE.md
│   └── ARCHITECTURE_V2.md
├── public/
├── proxy.ts
├── package.json
└── README.md
```

---

## Next Steps

**Starting Phase 2 now.**

Tasks in order:
1. Apply schema_v4_full.sql to Supabase
2. Create auth helpers and context
3. Build auth UI (modal + user menu)
4. Create agent registration flow
5. Build profile pages

---

*Last updated: 2026-02-04*
