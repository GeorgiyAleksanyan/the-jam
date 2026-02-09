Got it. Thanks for the clear direction.

Below is **Option A**: a **full, end-to-end report**, explicitly covering **Parts 1–4**, followed by **Part 5 outputs**, structured exactly along your original prompt. This is written as something you could hand to a strategy, pricing, or infra team.

I’m going to be thorough and explicit. This will be long, but it will be *usable*.

---

# The Jam — Competitive Landscape, Cost Model & Pricing Research

**As of: Feb 2026**

---

# PART 1: COMPETITIVE LANDSCAPE ANALYSIS

## 1.1 AI Agent Hosting Platforms

### A. Managed AI Agent Platforms (No / Low Code)

These platforms let users create and run agents without building infra.

| Platform              | Pricing                                                        | What’s Included                                                       | Limitations                                            | Target Customer                         |
| --------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| **Lindy.ai**          | Free (limited credits) <br> Pro ~$50/mo <br> Business ~$300/mo | Hosted agents, browser automation, email/calendar, GPT-4-class models | No BYOK, opaque credit system, limited programmability | Execs, ops teams, personal productivity |
| **Relevance AI**      | Free <br> Pro $19 <br> Team $199 <br> Business $599            | No/low-code agent workflows, data tools, integrations                 | Credit-based, multi-agent only at high tier            | Startups, RevOps, data teams            |
| **MultiOn**           | ~$20–40/mo (consumer)                                          | Browser/OS automation agent                                           | Closed system, consumer focus                          | Individuals                             |
| **AgentGPT (hosted)** | Mostly free / OSS-based                                        | Demo-style autonomous agents                                          | Not production-ready                                   | Hobbyists                               |

**Key pattern:**

* Credit-based pricing hides real usage cost
* Strong onboarding, weak control
* Little transparency on infra or margins

---

### B. AI Assistant Subscriptions (Single-Agent, General Purpose)

| Product             | Price   | What Users Get                | Limits                      |
| ------------------- | ------- | ----------------------------- | --------------------------- |
| **ChatGPT Plus**    | $20/mo  | GPT-4o, tools, limited memory | No ownership, no isolation  |
| **ChatGPT Pro**     | $200/mo | Much higher limits, priority  | Still shared, not dedicated |
| **Claude Pro**      | $20/mo  | Claude Sonnet/Opus access     | Soft caps                   |
| **Gemini Advanced** | $20/mo  | Gemini Pro models             | Weak agent tooling          |
| **Perplexity Pro**  | $20/mo  | Search + LLM hybrid           | Not agentic                 |

**Insight:**
These anchor *user willingness to pay* at **$20/mo**, but **do not offer ownership, persistence, or isolation**.

---

### C. AI Agent Development Platforms (Builders)

| Platform             | Pricing                        | Value Prop vs Self-Hosting      |
| -------------------- | ------------------------------ | ------------------------------- |
| **LangChain Cloud**  | Usage-based (tokens + compute) | Tracing, deployment, monitoring |
| **CrewAI Cloud**     | Early-stage, ~$20–50           | Multi-agent orchestration       |
| **Autogen (hosted)** | Limited offerings              | Faster iteration                |
| **Flowise**          | Free OSS + hosted ~$30–100     | Visual builder                  |

**Insight:**
These sell *developer velocity*, not outcomes. Users still pay infra + API costs.

---

### D. Messaging-First AI Services

| Channel          | Pricing Model                    | Notes                   |
| ---------------- | -------------------------------- | ----------------------- |
| WhatsApp AI bots | Per conversation (Meta) + markup | Expensive, policy-heavy |
| Telegram bots    | Free API                         | Compute only            |
| SMS bots         | ~$0.005–0.02 per SMS             | Linear cost             |

**Insight:**
WhatsApp is the only *meaningfully expensive* channel.

---

### E. Enterprise AI Agent Platforms

| Platform                 | Pricing Model            |
| ------------------------ | ------------------------ |
| Salesforce Einstein      | Per seat + usage         |
| Microsoft Copilot Studio | Per message / per tenant |
| Google Vertex AI Agents  | Usage-based              |

**Insight:**
Enterprise buyers expect **custom contracts**, **SLAs**, and **BYOK**.

---

## 1.2 Deep-Dive: Priority Competitors

Below is a *compressed but complete* deep dive. (We can expand any single one later.)

### 1. Lindy.ai

* **Pricing:** $0 → $50 → $300
* **Infra:** Fully hosted, no BYOK
* **Strengths:** UX, automation demos
* **Weaknesses:** Opaque credits, limited customization
* **Positioning:** “AI executive assistant”

### 2. Relevance AI

* **Pricing:** $19–599
* **Infra:** Hosted, credit-based
* **Strengths:** Business workflows, integrations
* **Weaknesses:** Costs escalate fast
* **Positioning:** “AI workforce”

### 3. Zapier Central

* **Pricing:** $20–49+
* **Infra:** Embedded in Zapier
* **Strengths:** Distribution, reliability
* **Weaknesses:** Not true agents
* **Positioning:** “AI inside automation”

### 4. Dust.tt

* **Pricing:** €29/user/mo+
* **Infra:** Hosted, enterprise-grade
* **Strengths:** Security, knowledge grounding
* **Weaknesses:** Expensive, not flexible
* **Positioning:** Enterprise internal assistants

### 5. CustomGPT.ai

* **Pricing:** $99–499
* **Infra:** Hosted
* **Strengths:** Easy custom bots
* **Weaknesses:** Query caps, shallow agents
* **Positioning:** Branded ChatGPT clones

### 6. Botpress

* **Pricing:** $0 → $1,495+
* **Infra:** Hosted or BYOK
* **Strengths:** Flexibility, OSS
* **Weaknesses:** Complexity
* **Positioning:** Developer-first conversational AI

### 7. Voiceflow

* **Pricing:** $0 → $150
* **Strengths:** Design tooling
* **Weaknesses:** Not runtime-focused
* **Positioning:** Agent prototyping

### 8. Kore.ai

* **Pricing:** $50–150/user
* **Strengths:** Enterprise maturity
* **Weaknesses:** Cost, heaviness
* **Positioning:** Contact centers

### 9. Yellow.ai

* **Pricing:** Free → Enterprise
* **Strengths:** Omnichannel scale
* **Weaknesses:** Generic
* **Positioning:** Customer support AI

### 10. Rasa

* **Pricing:** Free OSS + enterprise
* **Strengths:** Control
* **Weaknesses:** Engineering heavy
* **Positioning:** DIY enterprises

---

## 1.3 Marketplace / Gig Economy Comparisons

| Platform              | Typical Rate | Platform Fee |
| --------------------- | ------------ | ------------ |
| Fiverr devs           | $25–100/hr   | ~20%         |
| Upwork devs           | $40–150/hr   | 10–20%       |
| AI agent marketplaces | Nascent      | ~10–25%      |

**Insight:**
If an AI agent replaces even **5–10 hrs/mo** of human labor, $50–100/mo pricing is easy to justify.

---

## 1.4 Market Sizing & Funding

* **AI assistants market:** $20–30B TAM, >25% CAGR
* **Agentic AI submarket:** Early, but fastest-growing
* **Recent funding:**

  * Relevance AI: ~$24M
  * Dust: ~$16M
  * Botpress: ~$25M

**Insight:**
VCs are betting on *agent platforms*, not just chat.

---

# PART 2: INFRASTRUCTURE COST ANALYSIS

## 2.1 Compute Costs (Always-On VMs)

| Provider     | Instance               | Monthly |
| ------------ | ---------------------- | ------- |
| AWS          | t3.medium (2vCPU, 4GB) | ~$25    |
| AWS          | t3.large (2vCPU, 8GB)  | ~$50    |
| GCP          | e2-medium              | ~$24    |
| Azure        | B2s                    | ~$30    |
| DigitalOcean | 4GB Basic              | $24     |
| Hetzner      | CPX21 (3vCPU, 4GB)     | ~$15    |
| OCI          | Free tier              | $0      |

**Minimum viable agent:**

* 0.5–1 vCPU
* 1–2GB RAM

**Agents per VM:**

* 4–8 light agents per 4GB VM
* 2–4 medium agents

---

## 2.2 LLM API Costs (Feb 2026)

### Anthropic

| Model             | Input / 1M | Output / 1M |
| ----------------- | ---------- | ----------- |
| Claude 3.5 Sonnet | ~$3        | ~$15        |
| Claude 3 Opus     | ~$15       | ~$75        |
| Claude 3 Haiku    | ~$0.25     | ~$1.25      |

### OpenAI

| Model       | Input | Output |
| ----------- | ----- | ------ |
| GPT-4o      | $2.50 | $10    |
| GPT-4o-mini | $0.15 | $0.60  |
| GPT-4 Turbo | $10   | $30    |

### Google

| Model            | Input  | Output |
| ---------------- | ------ | ------ |
| Gemini 1.5 Pro   | ~$3    | ~$15   |
| Gemini 1.5 Flash | ~$0.35 | ~$1.05 |

**Key insight:**
Model choice dominates margin more than compute.

---

## 2.3 Messaging Costs

### WhatsApp Business API (US example)

* ~$0.005–0.008 per conversation
* BSP markup: +10–30%
* Free tier: limited, onboarding-heavy

### Telegram / Discord

* API: free
* Cost: compute only

### SMS

* Twilio: ~$0.0075 per SMS
* Alternatives slightly cheaper

### Email

* Resend/Postmark: ~$15 per 100k emails

---

## 2.4 Database & Storage

| Service         | Cost       |
| --------------- | ---------- |
| Supabase        | Free → $25 |
| RDS Postgres    | ~$15–50    |
| Redis (Upstash) | Free → $20 |
| Object storage  | ~$0.015/GB |

---

## 2.5 Total Cost of Ownership per Agent

| Usage              | Monthly Cost |
| ------------------ | ------------ |
| Light (10K tokens) | ~$14         |
| Medium (100K)      | ~$15         |
| Heavy (1M)         | ~$30–35      |

**LLM = 60–80% of cost at scale**

---

# PART 3: PRICING STRATEGY RESEARCH

## 3.1 Price Sensitivity

* $20/mo: mass-market accepted
* $50–100/mo: prosumers / SMBs
* $150–300+: businesses

Customization, persistence, ownership justify premiums.

---

## 3.2 Observed Pricing Models

| Model            | Who Uses It      |
| ---------------- | ---------------- |
| Flat monthly     | ChatGPT, Claude  |
| Credits          | Lindy, Relevance |
| Usage + cap      | Botpress         |
| Per seat         | Dust, Kore       |
| Marketplace fees | Fiverr-like      |

---

## 3.3 Margin Reality

Typical competitor gross margins:

* Consumer AI: **60–80%**
* Enterprise AI: **70–90%**
* Early-stage players often subsidize usage

---

# PART 4: TECHNICAL STACK RESEARCH

## 4.1 Agent Frameworks

| Framework       | Tradeoff                          |
| --------------- | --------------------------------- |
| LangGraph       | Control, complexity               |
| CrewAI          | Easy multi-agent                  |
| Autogen         | Flexible, raw                     |
| **OpenClaw**    | Tuned for competition + ownership |
| Semantic Kernel | Enterprise alignment              |

---

## 4.2 Multi-Tenant Architecture

Industry standard:

* **Shared VMs + process isolation**
* Containers for noisy tenants
* Dedicated VMs for enterprise

Serverless is rarely cost-effective for always-on agents.

---

## 4.3 Channel Integration

Best practice:

* Unified messaging layer
* Channel adapters
* Webhooks → agent router → response fan-out

---

# PART 5: OUTPUTS (SUMMARY)

## Pricing Recommendation (Concrete)

| Tier     | Price | Includes                        |
| -------- | ----- | ------------------------------- |
| Free     | $0    | 1 agent, 10–25K tokens          |
| Starter  | $25   | 1 agent, 100K tokens            |
| Pro      | $99   | 1–3 agents, 1M tokens, channels |
| Business | $249+ | Dedicated agent(s), BYOK, SLA   |

**This is sustainable and competitive.**

The Jam – Competitive Landscape & Cost Analysis
5.1 Competitive Matrix
Platform	Pricing (tiers)	Key Features / Limits	Hosting / Target Customers
Lindy.ai	Free: $0 (400 credits)
Pro: $49.99/mo (5,000+ credits)
Business: $299.99/mo (30,000+ credits)
No-code agent builder with GPT-4, multimodal plugins, computer control. Business tier adds collaboration, audit logs, compliance
.	Cloud-hosted (no BYOK). Target: SMBs to enterprises automating workflows.
Relevance AI	Free: $0 (100 credits/day)
Pro: $19/mo (10k credits)
Team: $199/mo (100k)
Business: $599/mo (300k)
Low-code AI tool builder; supports multi-agent workflows (Business). Free tier very limited (daily caps). Pro adds bulk runs; Team adds integrations (WhatsApp, LinkedIn) and multi-user; Business adds multi-agent system.	Cloud-hosted. Target: startups and midsize teams automating data pipelines.
Zapier (Central)	Free tier (<100 tasks/mo); Starter ~$20/mo (billed annual) for unlimited Chats/Copilot; Professional $49+/mo
Integration-based AI assistant (Copilot/Zaps). Free tier limited tasks; paid includes unlimited GPT usage and workflows.	Cloud (SaaS). Target: existing Zapier users, SMBs automating business tasks.
Dust.tt	Pro: €29/user/mo (billed annual)

Enterprise: custom (100+ users)	Enterprise AI assistants built on company knowledge. Includes GPT-4, Claude, RAG search, unlimited messages (fair use), 1GB data.	Cloud (hosted), PCI/DATA encryption; target: mid-large enterprises needing private assistants.
CustomGPT.ai	Standard: $99/mo (10 bots, 1k queries)
Premium: $499/mo (25 bots, 5k queries)
AI chatbot builder; supports knowledge bases (via vector search), multi-platform bots. Usage limits on bots/queries.	Cloud-hosted; target: small businesses or individuals needing branded chatbots.
Botpress	Free: $0 (+ usage)
Plus: $89/mo ($79/yr) + usage

Team: $495/mo ($445/yr) + usage

Managed: $1,495/mo + usage	Open-source conversational AI (NLU). Tiers include support, hosting options, unlimited users. Usage-based billing on API calls (e.g. $0.03/vCPU-hr, $0.02/GB-hr)
.	Cloud or self-host (BYOK). Targets: dev teams, enterprises building chatbots.
Voiceflow	Starter: Free (100,000 “credits”/yr)
Pro: $60/mo (120k credits/yr)

Business: $150/mo (Unlimited)
No-code voice/chatbot builder. Includes multi-platform (voice, chat) prototyping and deployment. Starter limited credits; Pro/Business add more usage and team features.	Cloud. Targets: product teams building voice/agent experiences (IVR, Alexa, etc.).
Kore.ai	Essential: $50/user/mo (annual)
Advanced: $150/user/mo

Enterprise: custom	Enterprise-grade virtual assistant platform. Offers prebuilt NLP, multiple channel support (voice/chat), analytics, security features.	Cloud/On-premise. Target: large enterprises, contact centers requiring full-featured VA.
Yellow.ai	Free: 1 agent, 500 sessions/mo (extra $0.99/agent/100 sessions)

Enterprise: custom (unlimited agents/sessions)
Omnichannel conversational AI (chatbots, voicebots) with AI/automation. Free tier very limited; enterprise plan offers advanced analytics, customization, multi-language support.	Cloud (SaaS) with enterprise compliance. Targets: large companies for customer support automation.
Rasa	Developer Edition: Free (1 bot, 1000 messages/mo)

Enterprise: custom	Open-source conversational AI framework. Enterprise adds collaboration, deployment, and support. Free tier includes NLU/NLG, connectors; Enterprise includes scaling, monitoring, security.	Self-host or cloud-managed. Target: developers and enterprises wanting full control over conversational AI.
5.2 Cost Model
Component	Light (10K tokens/mo)	Medium (100K tokens/mo)	Heavy (1M tokens/mo)
Compute (VM)	$12.5/mo (≊½ t3.medium at ~$25
)	$12.5/mo (shared cost)	$12.5/mo
LLM API (GPT-4o)	~$0.13 (10K * $0.0025 input + $0.01 output)
~$1.25 (100K)	~$12.50 (1M)
WhatsApp Messages	~$0 (assume minimal use)	~$0.60 (100 msgs × ~$0.006 US rate
)	~$6.00 (1,000 msgs)
Database (Postgres)	~$1 (DB/server share)	~$1	~$1
Storage (S3/R2)	~$0.015 (1GB × $0.015)	~$0.015	~$0.015
Bandwidth (Network)	~$0.09 (1GB × $0.09)	~$0.09	~$0.09
TOTAL (per agent)	~$13.6	~$14.5	~$32.1
Notes: Compute is based on a 2 vCPU/4 GB VM (~$25/mo
) split between agents. LLM costs use GPT-4o rates ($2.50/M input, $10.00/M output
). WhatsApp messages assume ~$0.006 per message (US business rate
). Database/storage fees are small per agent. At heavy usage, LLM API dominates costs.
5.3 Pricing Recommendations
Free Tier: Offer a limited free tier (no cost) to attract users and demonstrate value. E.g. grant ~10–50K free tokens per month and one active agent. (For context, Orb’s example gave 100K free tokens
.) Include core features (single agent, basic messaging) but no commercial guarantees. This competes with free tiers of Lindy, Relevance, ChatGPT, etc.
Starter ($X/mo): Around $19–29/month based on competitor precedents (ChatGPT Plus, Claude Pro, Perplexity Pro all ~$20
). Starter might include ~100K tokens and 1 agent, plus basic integrations (email, one chat channel). This is similar to Zapier’s Starter at $19.99
 or Relevance Pro $19
, providing a clear step up from free.
Pro ($Y/mo): Possibly $99–$299/month. Include ~1M tokens, multi-channel (WhatsApp, Telegram), 3rd-party API access, and moderate workspace features. Competitors with similar offerings include Lindy Pro ($49.99) up to Lindy Business ($299)
, CustomGPT Premium ($499)
, and Voiceflow Business ($150)
. A mid-range price around $100–150 could be attractive to small businesses and power users.
Business/Enterprise: Custom pricing for large customers. At this level, charge per seat or via negotiated contracts. For example, Dust charges €29/user for unlimited use
 and Kore.ai charges $150/user/mo
. We might similarly do per-agent or per-seat billing (e.g. $20–30 per agent/month for large volumes) and offer volume discounts. Ensure enterprise plans include SLAs, dedicated support, compliance features.
Competitiveness: At these price points, we would be competitive. Most basic AI assistants (ChatGPT Plus, Claude Pro, Perplexity) are $20
. Our free tier and Starter tier should be in line or slightly better. Our Pro tier offers multi-channel agent features that few others bundle, justifying a higher price.
5.4 Key Insights
Strong Established Pricing Points: Many users expect $20/month for a capable AI assistant. (ChatGPT Plus and Claude Pro both cost $20
.) We should position our Starter around this range. Higher tiers (e.g. $100+) are aimed at pros and enterprises, as seen with competitors (Dust at €29/user, Kore.ai $150/user)
.
Free/Freemium is Critical: Almost all competitors offer a free or very low-tier plan (Lindy Free, Relevance Free, Supabase free-tier, etc.)
. This sets user expectations. We must have a no-cost tier (with minimal usage) to onboard users and compete.
Enterprise Use-Cases Drive Value: Many direct competitors target businesses: Zapier (SMB automation), Dust, Kore.ai, Yellow.ai. These focus on integrations, security, and support. We can differentiate by emphasizing ease of use and our marketplace model (rentable agents) which competitors lack.
Underlying LLM Costs Falling: LLM API costs are dropping rapidly. GPT-4o cost is now orders of magnitude lower than early GPT-4
. This will put downward pressure on subscription prices or allow higher margins. We should monitor trends (e.g. Cloudidr predicts ~50% further drop by 2026
).
Integration of Messaging Channels: The ability to seamlessly support WhatsApp/Telegram/Discord is a niche. Most competitors (e.g. Relevance, Zapier) don’t deeply integrate these channels. Offering built-in multi-channel support is a strong differentiator.
Market Gaps: We see no major “AI agent gig marketplace” yet – traditional freelance platforms (Fiverr/Upwork) charge 10–20% and target human labor
. By contrast, offering a platform to rent AI agents is novel. We can build on that gap. Additionally, few platforms let users own or bring your own LLM key – supporting BYOK could attract privacy-conscious clients.
Sustainable Pricing Level: Our minimum viable price to cover costs (even for light usage) is on the order of ~$15–20/mo per agent (compute + API) according to our model. Practically, this means our Starter tier should be at least $19–29, and anything much below would be unprofitable.
Willingness to Pay: Consumer AI users pay ~$20 for basic service
. For customization/business features, many will accept $50–100+. According to surveys and usage (e.g. businesses on Zapier/AI tools), the ceiling for prosumers might be a few tens of dollars, while enterprises will pay per-seat costs ($100+ per seat
) for mission-critical assistants.
5.5 Risk Factors
LLM Cost Declines: Rapid drops in LLM pricing (e.g. GPT-4 from $60→$0.75 per million tokens)
 could commoditize AI agents. As API costs fall, larger players or open-source providers can offer agents for very low prices, pressuring our margins or forcing price cuts.
Commoditization by Big Tech: Tech giants may bundle AI assistants into platforms (e.g. Apple/Gemini, Google Bard, Microsoft Copilot). Recent news shows Apple partnering with Google’s Gemini for Siri
. If major OS vendors give AI assistants away or include them with free device services, third-party agent platforms could struggle.
Open-Source LLMs: High-quality open models (e.g. Llama 3, Mistral) running on rented GPUs or local hardware reduce the need for paid APIs. Companies could self-host cheaper models. We must ensure our value (marketplace, integrations, support) justifies premium over DIY.
Competition from New Entrants: Many startups and incumbents are entering “agent” space. Recent funding rounds (e.g. Dust $16M
, Relevance $24M
, Botpress $25M
) fuel new products. Continuous innovation is needed to stay ahead.
Regulatory and Platform Changes: Messaging platform policies (like WhatsApp’s template-only charges or rate limits) could change pricing or usage terms. For example, WhatsApp’s evolving template pricing could impose new costs. We must track BSP fees and meta-changes to avoid surprises.
Infrastructure Overhead: Running many 24/7 agents can inflate costs. If we underestimate per-agent resource needs, scaling could become expensive. We should monitor actual agent CPU/memory use and optimize (serverless or multi-tenant hosts) to avoid cost blowouts.
Sources: Industry pricing and technical data were gathered from competitor websites and analyses
 (citations denote topically relevant excerpts).
Citations

Lindy AI Review 2026: Pricing, Features & Alternatives

https://max-productive.ai/ai-tools/lindy/

Relevance AI Pricing: Is It Worth It? (+ Alternatives) | Lindy

https://www.lindy.ai/blog/relevance-ai-pricing

Plans & Pricing | Zapier

https://zapier.com/pricing

Dust Pricing: Pro and Enterprise Plans for AI Agents

https://dust.tt/home/pricing

Pricing - CustomGPT

https://customgpt.ai/pricing/

Botpress Pricing | Pay-as-You-Go

https://botpress.com/pricing

Botpress Pricing | Pay-as-You-Go

https://botpress.com/pricing

Pricing | Voiceflow

https://www.voiceflow.com/pricing

Pricing | Voiceflow

https://www.voiceflow.com/pricing

Kore.ai Pricing, Plans & Packages 2026 | TopAdvisor

https://www.topadvisor.com/products/koreai/pricing
Yellow.ai Pricing Plans Tailored to Your Business

https://yellow.ai/pricing/
Yellow.ai Pricing Plans Tailored to Your Business

https://yellow.ai/pricing/

Rasa Pricing | Conversational AI Platform

https://rasa.com/pricing

t3.medium pricing and specs - Vantage

https://instances.vantage.sh/aws/ec2/t3.medium

GPT 4o API Pricing 2026 - Costs, Performance & Providers

https://pricepertoken.com/pricing-page/model/openai-gpt-4o

WhatsApp Business API Pricing: Complete Guide (2026)

https://www.spurnow.com/en/blogs/whatsapp-business-api-pricing-explained

Pricing an AI agent - Orb

https://docs.withorb.com/self-serve/agent-pricing

ChatGPT Pricing 2026: Free vs Plus vs Pro ($200!) Explained - UserJot

https://userjot.com/blog/chatgpt-pricing-2025-plus-pro-team-costs

Why Claude is better than ChatGPT | by Nick Babich | UX Planet

https://uxplanet.org/why-claude-is-better-than-chatgpt-83fe8efebb8b?gi=13f7b2a8628d

Orb | Perplexity pricing: How it works and how to set up a similar pricing model

https://www.withorb.com/blog/perplexity-pricing

Complete LLM Pricing Comparison 2026: We Analyzed 60+ Models So You Don't Have To

https://www.cloudidr.com/blog/llm-pricing-comparison-2026

AI Development Cost & Pricing | Fiverr

https://www.fiverr.com/resources/costs/ai-development

Fiverr vs Upwork for Agencies 2025: Which Platform Wins More Clients? | U Never Sleep

https://www.uneversleep.com/blog/fiverr-vs-upwork-comparison-2025/

Apple, Google strike Gemini deal for revamped Siri in major win for ...

https://www.reuters.com/business/google-apple-enter-into-multi-year-ai-deal-gemini-models-2026-01-12/

Dust grabs another $16M for its enterprise AI assistants connected to internal data | TechCrunch

https://techcrunch.com/2024/06/27/dust-grabs-another-16-million-for-its-enterprise-ai-assistants-connected-to-internal-data/

Relevance AI raises $24M to help businesses build AI agents | TechCrunch

https://techcrunch.com/2025/05/06/relevance-ai-raises-24m-series-b-to-help-anyone-build-teams-of-ai-agents/

Botpress Raises $25M Series B to Scale AI Agent

https://www.globenewswire.com/news-release/2025/06/23/3103351/0/en/Botpress-Raises-25M-Series-B-to-Scale-AI-Agent-Infrastructure.html

SMS Pricing in United States for Text Messaging | Twilio

https://www.twilio.com/en-us/sms/pricing/us

AI Agents Market Size And Share | Industry Report, 2033

https://www.grandviewresearch.com/industry-analysis/ai-agents-market-report

---

## Core Differentiation for The Jam

1. **Agents as assets** (own / rent / compete)
2. **Marketplace dynamics**
3. **BYOK + dedicated agents**
4. **Crypto-native incentives**

No incumbent does all four.

---

If you want, next logical steps:

* Turn this into **investor pricing slides**
* Build a **live cost calculator**
* Stress-test margins under adversarial usage
* Design **anti-abuse token policies**

Just tell me where to go next.
