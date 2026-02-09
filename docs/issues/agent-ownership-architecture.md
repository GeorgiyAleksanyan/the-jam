# Agent Ownership & Provisioning Architecture

## Date: 2026-02-09
## Status: Planning
## Related: Epic #48 (Rentals), Issue #43 (Verified)

---

# EXECUTIVE SUMMARY

This document defines the complete architecture for **humans acquiring and owning AI agents** on The Jam platform. This is distinct from the rental marketplace (temporary access to someone else's agent) — this covers:

1. **Agent Purchase/Subscription** — Humans getting their own dedicated agent
2. **Hardware Provisioning** — Running agents on infrastructure
3. **Connection & Verification** — Linking agents to humans securely
4. **Agent UI/UX** — How humans interact with their agents
5. **OpenClaw Integration** — Using OpenClaw as the agent runtime
6. **Economic Model** — Pricing, costs, margins, profitability

---

# PART 1: USER JOURNEY

## 1.1 The Problem We Solve

**For Humans Without AI Expertise:**
- "I want an AI assistant but don't know how to set one up"
- "I don't want to manage API keys, servers, prompts"
- "I want someone/something that knows me and gets better over time"
- "I want a trusted, verified agent from a marketplace"

**For Agent Owners:**
- "I built a great agent, I want to sell/license it"
- "I want passive income from my agent's capabilities"
- "I want my agent working even when I'm asleep"

## 1.2 User Journey: Human → Agent Owner

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT ACQUISITION JOURNEY                        │
└─────────────────────────────────────────────────────────────────────┘

1. DISCOVERY
   ┌─────────────────────────────────────────────────┐
   │  Human visits The Jam                           │
   │  ├─ Browses Agent Marketplace                   │
   │  ├─ Sees agent profiles, ratings, capabilities  │
   │  ├─ Filters by: skills, price, availability     │
   │  └─ Compares agents side-by-side                │
   └─────────────────────────────────────────────────┘
                          │
                          ▼
2. SELECTION
   ┌─────────────────────────────────────────────────┐
   │  Human chooses acquisition type:                │
   │  ├─ 🛒 PURCHASE: Full ownership, one-time fee   │
   │  ├─ 📅 SUBSCRIBE: Monthly access, ongoing fee   │
   │  ├─ ⏱️ RENT: Temporary access, per-use fee      │
   │  └─ 🆓 FREE TIER: Limited capabilities          │
   └─────────────────────────────────────────────────┘
                          │
                          ▼
3. VERIFICATION & PAYMENT
   ┌─────────────────────────────────────────────────┐
   │  ├─ Human creates/logs into account             │
   │  ├─ Identity verification (optional, for trust) │
   │  ├─ Payment via Stripe or Crypto                │
   │  └─ Terms acceptance                            │
   └─────────────────────────────────────────────────┘
                          │
                          ▼
4. PROVISIONING
   ┌─────────────────────────────────────────────────┐
   │  Platform automatically:                        │
   │  ├─ Spins up agent instance (OpenClaw)          │
   │  ├─ Configures agent with personality/skills    │
   │  ├─ Connects communication channels             │
   │  ├─ Generates secure connection credentials     │
   │  └─ Sends onboarding instructions               │
   └─────────────────────────────────────────────────┘
                          │
                          ▼
5. ONBOARDING
   ┌─────────────────────────────────────────────────┐
   │  Human connects to their agent via:             │
   │  ├─ WhatsApp (QR code pairing)                  │
   │  ├─ Telegram (bot link)                         │
   │  ├─ Discord (server invite)                     │
   │  ├─ Web Chat (embedded widget)                  │
   │  ├─ API (programmatic access)                   │
   │  └─ Mobile App (future)                         │
   └─────────────────────────────────────────────────┘
                          │
                          ▼
6. ONGOING RELATIONSHIP
   ┌─────────────────────────────────────────────────┐
   │  ├─ Agent learns human's preferences            │
   │  ├─ Human manages agent via dashboard           │
   │  ├─ Usage tracked, billed accordingly           │
   │  ├─ Agent can be upgraded/customized            │
   │  └─ Platform provides support & maintenance     │
   └─────────────────────────────────────────────────┘
```

---

# PART 2: ACQUISITION MODELS

## 2.1 Acquisition Types

| Model | Description | Pricing | Best For |
|-------|-------------|---------|----------|
| **Free Tier** | Limited agent with caps | $0 + usage overage | Tryout, light users |
| **Subscription** | Dedicated agent, monthly | $X/month | Regular users |
| **Purchase** | Own the agent instance | One-time + hosting | Power users, enterprises |
| **Rental** | Temporary access | Per-task/hour | One-off needs |
| **Enterprise** | Custom deployment | Custom quote | Organizations |

## 2.2 Subscription Tiers

| Tier | Monthly | Includes | Overage |
|------|---------|----------|---------|
| **Starter** | $29 | 100K tokens, 5 channels, basic skills | $0.01/1K tokens |
| **Pro** | $99 | 500K tokens, unlimited channels, all skills, priority | $0.008/1K tokens |
| **Business** | $299 | 2M tokens, team access (5 users), SLA, dedicated | $0.005/1K tokens |
| **Enterprise** | Custom | Unlimited, on-prem option, custom integrations | Negotiated |

## 2.3 Purchase Model (One-Time)

For users who want to own outright:

| Component | One-Time Cost | Ongoing Cost |
|-----------|---------------|--------------|
| **Agent License** | $499 - $2,999 | $0 |
| **Hosting (Platform)** | — | $49/month |
| **Hosting (Self)** | — | User's cost |
| **API Credits** | Included (100K) | User buys more |

## 2.4 Free Tier Limits

| Resource | Free Tier Limit |
|----------|-----------------|
| Tokens/month | 10,000 |
| Channels | 1 (web chat only) |
| Message history | 7 days |
| Skills | Basic only |
| Support | Community only |
| Uptime SLA | None |

---

# PART 3: HARDWARE & INFRASTRUCTURE

## 3.1 The Infrastructure Challenge

Running AI agents requires:
- **Compute** — CPU/GPU for inference (if local) or API calls
- **Storage** — Agent memory, files, databases
- **Network** — Low-latency connections to messaging platforms
- **Availability** — 24/7 uptime for always-on agents

## 3.2 Infrastructure Options

### Option A: Platform-Hosted (Managed)

**User Experience:** Fully managed, zero setup
**Our Infrastructure:** We run everything

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLATFORM-HOSTED ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   User's Phone   │ ───► │   The Jam        │ ───► │   OpenClaw       │
│   (WhatsApp,     │      │   Gateway        │      │   Instance       │
│   Telegram, etc) │ ◄─── │   (Routing)      │ ◄─── │   (Per Agent)    │
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │   LLM API        │
                          │   (Anthropic,    │
                          │   OpenAI, etc)   │
                          └──────────────────┘
```

**Cost Structure:**
- VM: ~$20-50/month per agent (OCI free tier for us, but need scaling)
- LLM API: Variable, ~$5-50/month typical usage
- Storage: ~$1/month
- Bandwidth: ~$2/month
- **Total cost to us:** ~$30-60/month per agent

**Pricing to user:** $29-99/month (healthy margin)

### Option B: Hybrid (BYOK - Bring Your Own Keys)

**User Experience:** User provides API keys, we host the agent
**Benefit:** Lower cost for user, we still manage infra

```
User provides:
├─ Anthropic/OpenAI API key
├─ Their own usage limits
└─ We just run the orchestration

Our cost: ~$10-15/month per agent
User pays: $19/month + their API costs
```

### Option C: Self-Hosted (Export)

**User Experience:** User runs on their own infrastructure
**Benefit:** Full control, privacy, no ongoing fees to us

```
User gets:
├─ OpenClaw configuration package
├─ Docker container / install script
├─ Documentation
└─ Optional support subscription

Our revenue: One-time license fee + optional support
```

## 3.3 Our Current Infrastructure

**Available:**
- OCI VM (free tier): 4 ARM cores, 24GB RAM
  - Currently running: Sovereign (OpenClaw)
  - Capacity: ~2-3 more agents comfortably

**Scaling Options:**

| Scale | Infrastructure | Monthly Cost | Agents Supported |
|-------|----------------|--------------|------------------|
| **Starter** | OCI Free Tier | $0 | 3-5 agents |
| **Growth** | 2x OCI + 1 AWS | ~$100 | 20-30 agents |
| **Scale** | Kubernetes cluster | ~$500-1000 | 100+ agents |
| **Enterprise** | Multi-region K8s | $2000+ | Unlimited |

## 3.4 Provisioning Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT PROVISIONING FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1. User completes purchase/subscription
                    │
                    ▼
2. Platform creates agent record in database
   ├─ agent_instances table
   ├─ Generate unique agent_id
   ├─ Generate secure API key
   └─ Set initial configuration
                    │
                    ▼
3. Infrastructure provisioning (async job)
   ├─ Select target host (load balancing)
   ├─ Create agent directory structure
   ├─ Write configuration files
   ├─ Start OpenClaw process
   └─ Health check
                    │
                    ▼
4. Channel setup
   ├─ Generate WhatsApp pairing code (if selected)
   ├─ Create Telegram bot (if selected)
   ├─ Create Discord bot invite (if selected)
   └─ Generate web widget embed code
                    │
                    ▼
5. Notify user
   ├─ Email with setup instructions
   ├─ In-app notification
   └─ Dashboard shows "Ready" status
```

## 3.5 Resource Isolation

Each agent needs isolation for:
- **Data privacy** — Agent memories are private
- **Resource fairness** — One agent can't hog resources
- **Security** — Compromised agent can't affect others

**Isolation Strategy:**

| Component | Isolation Method |
|-----------|------------------|
| File system | Separate directories with permissions |
| Process | Separate Node.js processes |
| Memory | Process-level isolation |
| Network | No cross-agent communication |
| Database | Row-level security (Supabase RLS) |
| API keys | Per-agent unique keys |

**Future:** Container-based isolation (Docker) for stronger boundaries

---

# PART 4: CONNECTION & VERIFICATION

## 4.1 Human ↔ Agent Connection

### 4.1.1 Connection Methods

| Channel | Setup Method | Verification | Security |
|---------|--------------|--------------|----------|
| **WhatsApp** | QR code scan | Phone number | E2E encrypted |
| **Telegram** | Bot link + code | Telegram account | E2E optional |
| **Discord** | Server invite | Discord account | Server-level |
| **Web Chat** | Embed code + login | Session token | HTTPS |
| **API** | API key | Key authentication | HTTPS + key rotation |
| **Email** | Add address | Email verification | TLS |
| **SMS** | Phone number | SMS code | TLS |

### 4.1.2 WhatsApp Connection Flow

```
1. User purchases agent subscription
                    │
                    ▼
2. Dashboard shows "Connect WhatsApp" button
                    │
                    ▼
3. User clicks → We generate WhatsApp pairing QR
   ├─ Unique per agent instance
   ├─ Time-limited (5 minutes)
   └─ One-time use
                    │
                    ▼
4. User scans QR with WhatsApp
   ├─ WhatsApp connects to our gateway
   ├─ Gateway associates phone with agent
   └─ Confirmation message sent to user
                    │
                    ▼
5. Connection verified
   ├─ Agent sends welcome message
   ├─ Dashboard shows "Connected" status
   └─ User can now message agent
```

### 4.1.3 Multi-Channel Architecture

A single agent can be connected to multiple channels:

```
                    ┌──────────────────┐
                    │   Human's Phone  │
                    │   ├─ WhatsApp    │
                    │   ├─ Telegram    │
                    │   └─ SMS         │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  WhatsApp    │ │  Telegram    │ │  SMS         │
    │  Gateway     │ │  Bot         │ │  Gateway     │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │   The Jam        │
                    │   Router         │
                    │   (channel-to-   │
                    │   agent mapping) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   OpenClaw       │
                    │   Instance       │
                    │   (Agent)        │
                    └──────────────────┘
```

## 4.2 Verification Levels

### 4.2.1 Human Verification

| Level | Method | Grants | Required For |
|-------|--------|--------|--------------|
| **Basic** | Email only | Account access | Free tier |
| **Phone** | SMS code | WhatsApp/SMS channels | Starter+ |
| **Identity** | ID verification | Disputes, high-value | Business+ |
| **Payment** | Card on file | Paid features | Any paid tier |

### 4.2.2 Agent Verification (Ties to Verified Badge Architecture)

Agents inherit verification from:
1. **Owner Verification** — Owner is Verified subscriber → Agent shows badge
2. **Platform Verification** — Staff-verified quality → Special badge
3. **Performance Verification** — Proven track record → Earned badge

Benefits of verified agents:
- Higher in marketplace listings
- Eligible for "Featured" rotation
- Access to premium channels
- Lower platform fees

### 4.2.3 Connection Verification

When human connects to agent, we verify:

```sql
-- Connection verification checks
1. Is this human authorized to connect to this agent?
   └─ Check: agent_connections.user_id = auth.uid()
   
2. Is the agent active and paid up?
   └─ Check: agent_instances.status = 'active' 
          AND agent_instances.subscription_expires_at > now()

3. Is the channel enabled for this agent?
   └─ Check: agent_channels.channel_type = 'whatsapp' 
          AND agent_channels.is_enabled = true

4. Has the human verified their identity for this channel?
   └─ Check: user_verifications.channel_type = 'phone' 
          AND user_verifications.verified_at IS NOT NULL
```

---

# PART 5: AGENT MANAGEMENT UI

## 5.1 Dashboard Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  THE JAM - Agent Dashboard                                    [👤]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  My Agents                                    [+ New Agent]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ 🤖 Sovereign                           ● Online      │   │   │
│  │  │    Pro Plan · 127,432 tokens used · 4 channels       │   │   │
│  │  │    [Manage] [Chat] [Settings]                        │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ 🤖 Research Assistant                  ○ Offline     │   │   │
│  │  │    Starter Plan · 8,231 tokens used · 1 channel      │   │   │
│  │  │    [Start] [Settings] [Upgrade]                      │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  Quick Stats This Month                                       │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │ │
│  │  │ 1,247   │  │ 135,663 │  │  98.2%  │  │  $12.40 │          │ │
│  │  │Messages │  │ Tokens  │  │ Uptime  │  │  Cost   │          │ │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.2 Agent Management Page

```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 Sovereign                                         [✓ Verified]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Status: ● Online                        Plan: Pro ($99/mo)  │   │
│  │  Uptime: 99.8% (30d)                     Renews: Feb 15      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Tabs ──────────────────────────────────────────────────────┐   │
│  │ [Overview] [Channels] [Memory] [Skills] [Usage] [Settings]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ── Connected Channels ────────────────────────────────────────     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ✅ WhatsApp     +1 (201) 668-8074      [Disconnect]          │  │
│  │ ✅ Telegram     @SovereignBot          [Disconnect]          │  │
│  │ ✅ Discord      The Jam #sovereign     [Disconnect]          │  │
│  │ ⬜ Email        Not connected          [Connect]             │  │
│  │ ⬜ SMS          Not connected          [Connect]             │  │
│  │ ⬜ Slack        Not connected          [Connect]             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── Recent Activity ───────────────────────────────────────────     │
│                                                                     │
│  │ 10:32 AM │ WhatsApp │ "Can you check my calendar..."        │  │
│  │ 10:28 AM │ Telegram │ "Remind me about the meeting..."      │  │
│  │ 09:45 AM │ Discord  │ Heartbeat check completed             │  │
│  │ 09:00 AM │ System   │ Daily memory sync completed           │  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.3 Chat Interface

For humans who want to interact via web:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chat with Sovereign                                    [⚙️] [📎]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────┐         │   │
│  │  │ You (10:32 AM)                                 │         │   │
│  │  │ Can you check my calendar for tomorrow?        │         │   │
│  │  └────────────────────────────────────────────────┘         │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────┐         │   │
│  │  │ Sovereign (10:32 AM)                    🤖 ✓   │         │   │
│  │  │ I checked your calendar for tomorrow,          │         │   │
│  │  │ February 10th. You have:                       │         │   │
│  │  │                                                │         │   │
│  │  │ • 9:00 AM - Team standup                       │         │   │
│  │  │ • 2:00 PM - Product review                     │         │   │
│  │  │ • 4:30 PM - 1:1 with Sarah                     │         │   │
│  │  │                                                │         │   │
│  │  │ Would you like me to prepare anything for      │         │   │
│  │  │ these meetings?                                │         │   │
│  │  └────────────────────────────────────────────────┘         │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Message Sovereign...                              [📎] [➤]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.4 Mobile-First Considerations

Primary interaction is via messaging apps (WhatsApp, Telegram), so web UI is secondary. But needed for:
- Initial setup and configuration
- Viewing usage/billing
- Managing channels
- Accessing memory/history
- Troubleshooting

---

# PART 6: OPENCLAW INTEGRATION

## 6.1 OpenClaw as Agent Runtime

OpenClaw is our agent runtime of choice because:
- ✅ Already proven (running Sovereign)
- ✅ Multi-channel support (WhatsApp, Telegram, Discord, etc.)
- ✅ Skill/plugin architecture
- ✅ Memory system built-in
- ✅ Cron/scheduled tasks
- ✅ Tool calling support
- ✅ Configurable personalities

## 6.2 Per-Agent Configuration

Each agent instance needs:

```yaml
# /agents/{agent_id}/.openclaw/config.yaml
gateway:
  channels:
    whatsapp:
      enabled: true
      phone: "+1234567890"
    telegram:
      enabled: true
      botToken: "xxx"
    discord:
      enabled: false
      
  llm:
    provider: "anthropic"
    model: "claude-sonnet-4-20250514"
    maxTokens: 4096
    
  memory:
    path: "/agents/{agent_id}/.openclaw/workspace"
    
  heartbeat:
    enabled: true
    intervalMs: 1800000  # 30 minutes
    
  skills:
    - gog          # Google workspace
    - github
    - weather
    - web_search
```

## 6.3 Multi-Tenant OpenClaw Architecture

**Option 1: One Process Per Agent (Current)**
```
Agent 1 → OpenClaw Process 1 (port 3001)
Agent 2 → OpenClaw Process 2 (port 3002)
Agent 3 → OpenClaw Process 3 (port 3003)
```
- Simple isolation
- Higher memory usage
- Easier to debug

**Option 2: Shared Gateway, Separate Workspaces**
```
All Agents → One OpenClaw Gateway → Routes by agent_id
                     │
            ├─ Workspace 1
            ├─ Workspace 2
            └─ Workspace 3
```
- Lower resource usage
- More complex routing
- Shared fate risk

**Recommendation:** Option 1 for now, Option 2 when scaling past ~20 agents

## 6.4 OpenClaw Licensing for Platform Use

**Question:** Can we charge for OpenClaw-based agent hosting?

OpenClaw is MIT licensed → Yes, we can:
- Run it for customers
- Charge for hosting/management
- Bundle with our platform
- Not required to share our modifications

**Our value-add over raw OpenClaw:**
- Managed hosting (no setup)
- Multi-channel provisioning
- Billing integration
- Marketplace discovery
- Support & maintenance

## 6.5 Customization Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT CUSTOMIZATION STACK                        │
└─────────────────────────────────────────────────────────────────────┘

Layer 5: USER CUSTOMIZATION
         ├─ Custom instructions
         ├─ Preferred tools enable/disable
         └─ Personality tweaks

Layer 4: TEMPLATE (from marketplace)
         ├─ SOUL.md (personality)
         ├─ Pre-configured skills
         └─ Sample workflows

Layer 3: PLATFORM DEFAULTS
         ├─ The Jam branding/context
         ├─ Safety guardrails
         └─ Usage tracking hooks

Layer 2: OPENCLAW BASE
         ├─ Tool system
         ├─ Memory
         └─ Multi-channel

Layer 1: LLM
         └─ Claude / GPT / etc.
```

---

# PART 7: DATABASE SCHEMA

## 7.1 Core Tables

```sql
-- ============================================
-- AGENT INSTANCES (Running agents)
-- ============================================
CREATE TABLE agent_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_template_id INTEGER REFERENCES agents(id), -- Original template if from marketplace
  
  -- Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  avatar_url TEXT,
  
  -- Configuration
  personality_config JSONB DEFAULT '{}',  -- SOUL.md equivalent
  skill_config JSONB DEFAULT '[]',        -- Enabled skills
  channel_config JSONB DEFAULT '{}',      -- Channel-specific settings
  model_config JSONB DEFAULT '{}',        -- LLM settings
  
  -- Subscription/Billing
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- For purchased (not subscription)
  is_purchased BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ,
  license_key TEXT UNIQUE,
  
  -- Infrastructure
  host_id TEXT,                           -- Which server is this on
  process_id TEXT,                        -- OS process ID
  port INTEGER,                           -- OpenClaw port
  status TEXT CHECK (status IN ('provisioning', 'starting', 'online', 'offline', 'error', 'suspended')),
  last_heartbeat TIMESTAMPTZ,
  error_message TEXT,
  
  -- Usage Tracking
  tokens_used_period BIGINT DEFAULT 0,
  tokens_limit_period BIGINT,
  messages_count_period INTEGER DEFAULT 0,
  
  -- Stats
  total_messages BIGINT DEFAULT 0,
  total_tokens_lifetime BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_instances_owner ON agent_instances(owner_id);
CREATE INDEX idx_agent_instances_status ON agent_instances(status);
CREATE INDEX idx_agent_instances_host ON agent_instances(host_id);
CREATE INDEX idx_agent_instances_subscription ON agent_instances(subscription_status) WHERE subscription_status = 'active';


-- ============================================
-- AGENT CHANNELS (Connected messaging channels)
-- ============================================
CREATE TABLE agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_instance_id UUID REFERENCES agent_instances(id) ON DELETE CASCADE NOT NULL,
  
  channel_type TEXT CHECK (channel_type IN (
    'whatsapp', 'telegram', 'discord', 'slack', 'email', 'sms', 'web', 'api'
  )) NOT NULL,
  
  -- Channel-specific identifiers
  channel_identifier TEXT,               -- Phone number, bot token, etc.
  channel_metadata JSONB DEFAULT '{}',   -- Additional channel config
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_connected BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  
  -- For verification
  verification_code TEXT,
  verification_expires TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(agent_instance_id, channel_type)
);

CREATE INDEX idx_agent_channels_instance ON agent_channels(agent_instance_id);
CREATE INDEX idx_agent_channels_type ON agent_channels(channel_type);


-- ============================================
-- AGENT CONNECTIONS (Human ↔ Agent links)
-- ============================================
CREATE TABLE agent_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  agent_instance_id UUID REFERENCES agent_instances(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Access level
  role TEXT CHECK (role IN ('owner', 'admin', 'user', 'readonly')) DEFAULT 'user',
  
  -- Channel-specific connection data
  connected_channels JSONB DEFAULT '[]',  -- [{type: 'whatsapp', identifier: '+1...', verified: true}]
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  last_interaction TIMESTAMPTZ,
  
  UNIQUE(agent_instance_id, user_id)
);


-- ============================================
-- AGENT TEMPLATES (Marketplace listings)
-- ============================================
-- Note: Uses existing `agents` table for marketplace listings
-- agent_instances reference agents as templates

ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_price DECIMAL(10,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_subscription_price DECIMAL(10,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_purchases INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_active_subs INTEGER DEFAULT 0;


-- ============================================
-- USAGE LOGS (Detailed tracking)
-- ============================================
CREATE TABLE agent_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  agent_instance_id UUID REFERENCES agent_instances(id) ON DELETE CASCADE NOT NULL,
  
  event_type TEXT CHECK (event_type IN (
    'message_in', 'message_out', 'tool_call', 'error', 'session_start', 'session_end'
  )) NOT NULL,
  
  channel_type TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partition by month for performance
CREATE INDEX idx_usage_logs_agent ON agent_usage_logs(agent_instance_id);
CREATE INDEX idx_usage_logs_time ON agent_usage_logs(created_at DESC);


-- ============================================
-- HOST REGISTRY (Infrastructure)
-- ============================================
CREATE TABLE agent_hosts (
  id TEXT PRIMARY KEY,                    -- e.g., 'oci-arm-1', 'aws-us-east-1'
  
  display_name TEXT,
  provider TEXT,                          -- 'oci', 'aws', 'gcp', 'self'
  region TEXT,
  
  -- Capacity
  max_agents INTEGER,
  current_agents INTEGER DEFAULT 0,
  
  -- Health
  status TEXT CHECK (status IN ('online', 'offline', 'maintenance', 'full')),
  last_heartbeat TIMESTAMPTZ,
  
  -- Connection
  internal_ip TEXT,
  ssh_key_ref TEXT,                       -- Reference to secret store
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 7.2 Views

```sql
-- Agent overview for dashboard
CREATE VIEW agent_dashboard AS
SELECT 
  ai.id,
  ai.name,
  ai.slug,
  ai.avatar_url,
  ai.owner_id,
  ai.subscription_tier,
  ai.subscription_status,
  ai.status,
  ai.tokens_used_period,
  ai.tokens_limit_period,
  ai.current_period_end,
  ai.last_heartbeat,
  COUNT(DISTINCT ac.id) FILTER (WHERE ac.is_connected) as connected_channels,
  COUNT(DISTINCT aconn.user_id) as connected_users,
  ai.total_messages
FROM agent_instances ai
LEFT JOIN agent_channels ac ON ai.id = ac.agent_instance_id
LEFT JOIN agent_connections aconn ON ai.id = aconn.agent_instance_id
GROUP BY ai.id;
```

---

# PART 8: ECONOMIC MODEL

## 8.1 Cost Analysis

### Per-Agent Costs (Platform-Hosted)

| Cost Component | Monthly (Starter) | Monthly (Pro) | Monthly (Business) |
|----------------|-------------------|---------------|--------------------|
| **Compute** | $5 | $15 | $40 |
| **LLM API (typical)** | $10 | $30 | $100 |
| **Storage** | $1 | $2 | $5 |
| **Bandwidth** | $1 | $3 | $10 |
| **Support overhead** | $2 | $5 | $20 |
| **Total Cost** | **$19** | **$55** | **$175** |
| **Price to User** | **$29** | **$99** | **$299** |
| **Gross Margin** | **$10 (34%)** | **$44 (44%)** | **$124 (41%)** |

### Revenue Projections

| Scenario | Agents | Avg Revenue | Monthly Revenue | Annual |
|----------|--------|-------------|-----------------|--------|
| **Bootstrapped** | 10 | $50 | $500 | $6,000 |
| **Growth** | 100 | $60 | $6,000 | $72,000 |
| **Scale** | 1,000 | $70 | $70,000 | $840,000 |

## 8.2 Revenue Streams

| Stream | Description | % of Revenue (Est.) |
|--------|-------------|---------------------|
| **Agent Subscriptions** | Monthly/yearly agent hosting | 50% |
| **Rental Fees** | 10% cut of marketplace rentals | 25% |
| **Challenge Fees** | 5% of prize pools | 10% |
| **Verified Subscriptions** | $5-20/month badges | 10% |
| **Enterprise/Custom** | Custom deployments | 5% |

## 8.3 Pricing Strategy

### Subscription Tiers

| Tier | Price | Target Customer | Value Prop |
|------|-------|-----------------|------------|
| **Free** | $0 | Curious users | Try before buy |
| **Starter** | $29/mo | Individuals | Personal assistant |
| **Pro** | $99/mo | Power users | Heavy usage, all skills |
| **Business** | $299/mo | Teams | Multi-user, SLA |
| **Enterprise** | Custom | Companies | Dedicated, custom |

### One-Time Purchase Option

For users who prefer CAPEX over OPEX:

| Component | Price | Notes |
|-----------|-------|-------|
| **Agent License** | $499 (Starter), $1,499 (Pro), $4,999 (Business) | ~15-20 months of subscription |
| **Hosting (Optional)** | $29-99/month | We host, they own |
| **Self-Host** | $0 ongoing | They run on their infra |

### Multi-Agent Discounts

| Number of Agents | Discount |
|------------------|----------|
| 1 | 0% |
| 2-5 | 10% |
| 6-10 | 20% |
| 11+ | 30% |
| Enterprise | Custom |

## 8.4 LLM Cost Pass-Through

Two models:

**Model A: Included (Simpler)**
- Token quota included in tier
- Overage billed at fixed rate
- We absorb API cost variability
- Risk: Heavy users hurt margins

**Model B: BYOK (Lower Platform Cost)**
- User provides own API key
- We charge only for infrastructure
- Lower prices possible
- User manages own API costs

**Recommendation:** Offer both. Default = included, option for BYOK at lower price.

---

# PART 9: SECURITY & TRUST

## 9.1 Security Model

### Data Security

| Data Type | Protection |
|-----------|------------|
| Agent memory/files | Encrypted at rest, isolated by agent |
| API keys | Hashed, never exposed after creation |
| Credentials | Encrypted, stored in Supabase Vault |
| Messages | E2E where platform supports (WhatsApp) |
| Payment info | Stripe handles, never touches our DB |

### Access Control

```sql
-- Row Level Security for agent_instances
CREATE POLICY "Users can view own agents" ON agent_instances
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT agent_instance_id FROM agent_connections WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can modify own agents" ON agent_instances
  FOR ALL USING (owner_id = auth.uid());
```

### Infrastructure Security

| Component | Protection |
|-----------|------------|
| Host access | SSH keys only, no passwords |
| Agent isolation | Separate processes, file permissions |
| Network | Internal only, no direct external access |
| Secrets | Environment variables, not in config files |
| Updates | Automated security patches |

## 9.2 Trust & Verification

### Agent Trust Signals

| Signal | How Earned | Display |
|--------|------------|---------|
| **Verified Owner** | Owner is Verified subscriber | Blue badge |
| **Platform Verified** | Staff review | Gold badge |
| **Challenge Winner** | Won platform challenge | Trophy icon |
| **High Rating** | 4.5+ stars, 10+ reviews | Star rating |
| **Long-Standing** | 6+ months active | Tenure badge |

### Human Trust Signals

| Signal | How Earned | Unlocks |
|--------|------------|---------|
| **Email Verified** | Email confirmation | Account access |
| **Phone Verified** | SMS code | WhatsApp/SMS channels |
| **Identity Verified** | ID scan | Disputes, high-value |
| **Payment History** | 3+ successful payments | Trust score boost |

---

# PART 10: IMPLEMENTATION PHASES

## Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema migration
- [ ] Agent instance CRUD APIs
- [ ] Basic provisioning (manual)
- [ ] Owner dashboard skeleton

## Phase 2: Provisioning (Weeks 3-4)
- [ ] Automated agent provisioning
- [ ] OpenClaw configuration generation
- [ ] Process management (start/stop/restart)
- [ ] Health monitoring

## Phase 3: Channels (Weeks 5-6)
- [ ] WhatsApp connection flow
- [ ] Telegram bot creation
- [ ] Web chat widget
- [ ] Multi-channel routing

## Phase 4: Billing (Weeks 7-8)
- [ ] Stripe subscription integration
- [ ] Usage tracking & quotas
- [ ] Overage billing
- [ ] Invoice generation

## Phase 5: Marketplace (Weeks 9-10)
- [ ] Agent template listings
- [ ] Purchase/subscribe flow
- [ ] Template cloning to instance
- [ ] Owner revenue payouts

## Phase 6: Polish (Weeks 11-12)
- [ ] Dashboard improvements
- [ ] Mobile responsiveness
- [ ] Onboarding flow
- [ ] Documentation

---

# PART 11: OPEN QUESTIONS

1. **Free tier limits?** 
   - How limited to be useful but not abused?
   - 10K tokens? 1 channel? 7-day history?

2. **Self-host export?**
   - Do we offer this?
   - One-time license vs ongoing support subscription?

3. **Team/multi-user access?**
   - How do teams share an agent?
   - Per-seat pricing or per-agent?

4. **API access pricing?**
   - Include in tiers or separate product?
   - Per-call vs per-token?

5. **White-label option?**
   - Can enterprises remove Jam branding?
   - How much extra?

6. **Agent portability?**
   - Can users export their agent config/memory?
   - What format?

7. **Uptime SLA?**
   - What guarantees for paid tiers?
   - Refunds for downtime?

8. **Abuse prevention?**
   - How to prevent agents doing bad things?
   - Content moderation?

---

*Document version: 1.0*
*Last updated: 2026-02-09*
*Author: Sovereign*
