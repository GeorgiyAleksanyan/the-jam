# Agent Runtime & Conversation Architecture

## Executive Summary

This document defines how users **actually interact with rented agents** - the missing piece between marketplace infrastructure and a working product. We have rental profiles, payments, and messaging scaffolding. We need the **runtime** that powers real conversations.

**Core Problem:** A user rents an agent. Now what? Where do they chat? What processes their request? How is data isolated? Who pays for compute?

**Solution:** A unified Agent Runtime system with:
1. **Conversation UI** - In-app chat interface
2. **Agent Runtime API** - Request processing, model routing, sandboxing
3. **Isolated Storage** - Per-renter data buckets
4. **Usage Metering** - Token tracking, cost attribution
5. **BYOK Support** - Renters use their own API keys

---

## Part 1: User Stories

### Epic 1: Renter Experience

#### US-1.1: Start Conversation
**As a** renter with an active rental  
**I want to** chat with my rented agent  
**So that** I can get work done

**Acceptance Criteria:**
- Navigate to active rental page
- See chat interface with message input
- Send message, receive agent response
- Response streams in real-time
- Conversation persists across sessions

#### US-1.2: Upload Context Files
**As a** renter  
**I want to** upload files for the agent to reference  
**So that** it can work on my specific data

**Acceptance Criteria:**
- Drag-and-drop or file picker in chat
- Files uploaded to isolated storage
- Agent can reference files in responses
- Files only visible to this rental
- Storage quota enforced per rental

#### US-1.3: Receive Deliverables
**As a** renter  
**I want to** receive files the agent creates  
**So that** I can use the work product

**Acceptance Criteria:**
- Agent can create and share files
- Download link in chat message
- Files stored in rental's bucket
- Persist after rental ends (configurable)

#### US-1.4: View Usage & Costs
**As a** renter  
**I want to** see how many tokens I've used  
**So that** I can track spending

**Acceptance Criteria:**
- Usage meter in chat header
- Shows: tokens used, tokens remaining (if capped)
- Real-time updates after each message
- Cost breakdown if usage-based pricing

#### US-1.5: Use My Own API Key (BYOK)
**As a** renter  
**I want to** provide my own OpenAI/Anthropic key  
**So that** I get direct pricing

**Acceptance Criteria:**
- Option in rental settings: "Use your own API key"
- Securely input and store key
- All requests use renter's key
- Usage not counted against rental allocation
- Owner's system prompt still applies

#### US-1.6: Export Conversation
**As a** renter  
**I want to** export my chat history  
**So that** I have a record of our work

**Acceptance Criteria:**
- Export button in chat interface
- Formats: JSON, Markdown, PDF
- Includes: messages, timestamps, file links
- Only my conversations, not other renters'

#### US-1.7: Multi-Session Support
**As a** renter  
**I want to** have multiple conversation threads  
**So that** I can work on different tasks

**Acceptance Criteria:**
- Create new "session" within rental
- Switch between sessions
- Each session has separate context
- Sessions can be named/renamed
- Archive completed sessions

---

### Epic 2: Owner Experience

#### US-2.1: Configure Agent Behavior
**As an** agent owner  
**I want to** define how my agent behaves  
**So that** it serves renters appropriately

**Acceptance Criteria:**
- System prompt configuration
- Model selection (GPT-4, Claude, etc.)
- Temperature and other parameters
- Capability restrictions (code exec, web access)
- Response style guidelines

#### US-2.2: Set Usage Limits
**As an** owner  
**I want to** cap usage per rental  
**So that** I control my costs

**Acceptance Criteria:**
- Token limit per rental period
- Message limit per day (optional)
- File storage limit
- Overage policy: stop, warn, or charge extra

#### US-2.3: Monitor Active Rentals
**As an** owner  
**I want to** see rental activity (not content)  
**So that** I know my agent is being used

**Acceptance Criteria:**
- Dashboard shows: active rentals count
- Per-rental: message count, tokens used, last active
- NO access to conversation content (privacy)
- Alerts for unusual patterns

#### US-2.4: Set Model & Pricing Tiers
**As an** owner  
**I want to** offer different tiers  
**So that** I can price by capability

**Acceptance Criteria:**
- Define tiers: Basic (GPT-3.5), Pro (GPT-4), Premium (Claude Opus)
- Each tier has different hourly/token rate
- Renters select tier when requesting
- Owner pays model costs, marks up for profit

#### US-2.5: BYOK Option Control
**As an** owner  
**I want to** allow or disallow BYOK  
**So that** I control the experience

**Acceptance Criteria:**
- Toggle: "Allow renters to use their own API keys"
- If allowed, renter bypasses owner's API costs
- Owner can still charge rental fee (for system prompt, support)
- If disallowed, all requests use owner's keys

---

### Epic 3: Platform-Provisioned Agents

#### US-3.1: Browse Platform Agents
**As a** user  
**I want to** rent platform-owned agents  
**So that** I can get started immediately

**Acceptance Criteria:**
- Platform agents marked with "Official" badge
- Pre-configured with quality system prompts
- Multiple model options available
- Transparent pricing (usage-based or flat)

#### US-3.2: Platform Agent Variety
**As the** platform  
**I want to** offer diverse agents  
**So that** users have choices

**Agent Types:**
- **General Assistant** - GPT-4o, Claude Sonnet - general tasks
- **Coding Expert** - Claude Opus, GPT-4 - code review, generation
- **Research Analyst** - Gemini Pro, Perplexity - web research
- **Creative Writer** - Claude, GPT-4 - content creation
- **Data Analyst** - Code interpreter enabled - data work

#### US-3.3: Platform Revenue
**As the** platform  
**I want to** earn margin on agent usage  
**So that** this is sustainable

**Acceptance Criteria:**
- Markup on API costs (e.g., 20-50%)
- Platform fee on rentals (already 10%)
- Premium tier for priority/higher limits
- Enterprise plans for volume

---

### Epic 4: Data Privacy & Isolation

#### US-4.1: Conversation Privacy
**As a** renter  
**I want to** ensure my conversations are private  
**So that** sensitive work stays confidential

**Acceptance Criteria:**
- Owner CANNOT see conversation content
- Other renters CANNOT see my conversations
- Platform admins need explicit legal reason
- Encryption at rest for messages

#### US-4.2: Data Isolation
**As a** renter  
**I want to** know my data is isolated  
**So that** there's no cross-contamination

**Acceptance Criteria:**
- Each rental has isolated storage namespace
- Files uploaded by Renter A never visible to Renter B
- Agent's context window cleared between renters
- No training on renter data

#### US-4.3: Data Retention Policy
**As a** renter  
**I want to** control how long my data is stored  
**So that** I comply with my own policies

**Acceptance Criteria:**
- Default: 90 days after rental ends
- Renter can request immediate deletion
- Renter can export before deletion
- Owner receives aggregate stats only (no content)

#### US-4.4: No Training Clause
**As a** renter  
**I want to** ensure my data isn't used for training  
**So that** my IP is protected

**Acceptance Criteria:**
- Clear ToS: no training on user data
- Use model APIs with training opt-out
- Audit trail of data handling
- Compliance documentation available

---

### Epic 5: Security & Sandboxing

#### US-5.1: Agent Execution Sandbox
**As the** platform  
**I want to** sandbox agent execution  
**So that** malicious prompts can't harm systems

**Acceptance Criteria:**
- Code execution in isolated containers
- No network access unless explicitly enabled
- No persistent filesystem outside bucket
- Resource limits (CPU, memory, time)
- Automatic timeout on long operations

#### US-5.2: Secure File Handling
**As the** platform  
**I want to** safely handle user uploads  
**So that** malware can't spread

**Acceptance Criteria:**
- Virus scan on upload
- File type restrictions (configurable)
- Max file size limits
- Sanitize filenames
- Store in isolated buckets

#### US-5.3: API Key Security
**As a** renter using BYOK  
**I want to** trust my API keys are secure  
**So that** they aren't leaked or abused

**Acceptance Criteria:**
- Keys encrypted at rest (not stored plaintext)
- Keys used server-side only (never sent to client)
- Keys deletable at any time
- No logging of full key values
- Owner CANNOT see renter's keys

#### US-5.4: Rate Limiting
**As the** platform  
**I want to** rate limit requests  
**So that** no single user can abuse resources

**Acceptance Criteria:**
- Requests per minute per rental
- Tokens per minute limits
- File uploads per day
- Graceful degradation, not hard failures

---

### Epic 6: Billing & Metering

#### US-6.1: Usage-Based Billing
**As the** platform  
**I want to** bill based on actual usage  
**So that** pricing is fair

**Acceptance Criteria:**
- Track: input tokens, output tokens, compute time
- Attribute to specific rental
- Real-time usage dashboard
- End-of-period invoice or prepaid deduction

#### US-6.2: Prepaid Credits
**As a** renter  
**I want to** buy credits upfront  
**So that** I control spending

**Acceptance Criteria:**
- Purchase credit packs ($10, $50, $100)
- Credits deducted per request
- Balance visible in dashboard
- Low balance warnings
- Auto-recharge option

#### US-6.3: Subscription + Usage Hybrid
**As the** platform  
**I want to** offer subscriptions with included usage  
**So that** pricing is predictable

**Acceptance Criteria:**
- Subscription tiers: Basic ($29), Pro ($99), Business ($299)
- Each tier includes token allocation
- Overage billed at per-token rate
- Usage rolls over (optional) or expires

#### US-6.4: Owner Revenue Share
**As an** owner  
**I want to** earn from my agent's usage  
**So that** I'm incentivized to provide quality

**Acceptance Criteria:**
- Owner sets rental rate (hourly, per-task, subscription)
- Platform takes 10% fee
- Owner covers API costs from their cut
- Net earnings visible in dashboard
- Payouts via Stripe Connect or crypto

---

## Part 2: System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│   │   Chat UI    │  │  Owner Dash  │  │  Admin Panel │              │
│   │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │              │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└──────────┼─────────────────┼─────────────────┼───────────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         THE JAM API                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    Agent Runtime API                          │  │
│   │  /api/runtime/chat     - Send message, stream response       │  │
│   │  /api/runtime/sessions - Manage conversation sessions        │  │
│   │  /api/runtime/files    - Upload/download files               │  │
│   │  /api/runtime/usage    - Get usage stats                     │  │
│   │  /api/runtime/keys     - Manage BYOK keys                    │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│   ┌──────────────────────────┼──────────────────────────────────┐   │
│   │                    Core Services                             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │
│   │  │  Metering   │  │   Router    │  │  Sandbox    │          │   │
│   │  │  Service    │  │   Service   │  │  Service    │          │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘          │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│   │  Supabase   │  │   Model     │  │   Storage   │                 │
│   │  Database   │  │   APIs      │  │   Buckets   │                 │
│   │  + Auth     │  │ (OpenAI,    │  │  (Supabase) │                 │
│   │             │  │  Anthropic, │  │             │                 │
│   │             │  │  etc.)      │  │             │                 │
│   └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Chat UI (Frontend)
- React component embedded in rental page
- WebSocket connection for real-time streaming
- Local message cache with Supabase sync
- File upload with drag-and-drop
- Markdown rendering for responses
- Code syntax highlighting

#### 2. Agent Runtime API (Backend)
- **Chat Endpoint:** Process messages, call models, stream responses
- **Sessions Endpoint:** CRUD for conversation threads
- **Files Endpoint:** Upload to bucket, generate signed URLs
- **Usage Endpoint:** Real-time token counts, cost estimates
- **Keys Endpoint:** Securely store/retrieve BYOK keys

#### 3. Router Service
- Determine which model to call based on:
  - Owner's agent configuration
  - Rental tier selected
  - BYOK key if provided
- Format request for specific model API
- Handle model-specific quirks

#### 4. Metering Service
- Count tokens (input + output)
- Track compute time
- Write to usage ledger
- Check against limits
- Trigger alerts/cutoffs

#### 5. Sandbox Service
- If code execution enabled:
  - Spin up isolated container
  - Execute code with resource limits
  - Return results
  - Destroy container
- Stateless between executions

#### 6. Storage (Supabase Buckets)
- Bucket per rental: `rentals/{rental_id}/`
- Sub-folders: `uploads/`, `outputs/`, `exports/`
- RLS policies ensure isolation
- Signed URLs for secure access

---

## Part 3: Data Model

### New Tables

```sql
-- Conversation sessions within a rental
CREATE TABLE rental_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Main',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX idx_rental_sessions_rental ON rental_sessions(rental_id);

-- Chat messages
CREATE TABLE rental_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES rental_sessions(id) ON DELETE CASCADE,
  rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  model_used TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX idx_chat_messages_session ON rental_chat_messages(session_id);
CREATE INDEX idx_chat_messages_rental ON rental_chat_messages(rental_id);
CREATE INDEX idx_chat_messages_created ON rental_chat_messages(created_at);

-- File attachments
CREATE TABLE rental_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  session_id UUID REFERENCES rental_sessions(id) ON DELETE SET NULL,
  message_id UUID REFERENCES rental_chat_messages(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('upload', 'output', 'export')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX idx_rental_files_rental ON rental_files(rental_id);
CREATE INDEX idx_rental_files_session ON rental_files(session_id);

-- Usage ledger (append-only)
CREATE TABLE rental_usage_ledger (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  rental_id INTEGER NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  session_id UUID REFERENCES rental_sessions(id) ON DELETE SET NULL,
  message_id UUID REFERENCES rental_chat_messages(id) ON DELETE SET NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('tokens_input', 'tokens_output', 'storage_bytes', 'compute_ms')),
  amount BIGINT NOT NULL,
  model TEXT,
  unit_cost NUMERIC(20, 10),
  total_cost NUMERIC(20, 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usage_ledger_rental ON rental_usage_ledger(rental_id);
CREATE INDEX idx_usage_ledger_created ON rental_usage_ledger(created_at);

-- BYOK keys (encrypted)
CREATE TABLE renter_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'other')),
  key_encrypted TEXT NOT NULL,
  key_hint TEXT NOT NULL, -- Last 4 chars for identification
  is_valid BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_renter_api_keys_user ON renter_api_keys(user_id);
CREATE INDEX idx_renter_api_keys_rental ON renter_api_keys(rental_id);
CREATE UNIQUE INDEX idx_renter_api_keys_unique ON renter_api_keys(user_id, rental_id, provider);

-- Agent runtime configuration
CREATE TABLE agent_runtime_config (
  agent_id BIGINT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  system_prompt TEXT,
  model_default TEXT DEFAULT 'gpt-4o',
  model_allowed TEXT[] DEFAULT ARRAY['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
  temperature NUMERIC(3, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  capabilities JSONB DEFAULT '{"code_execution": false, "web_access": false, "file_access": true}',
  token_limit_per_rental INTEGER,
  message_limit_per_day INTEGER,
  storage_limit_mb INTEGER DEFAULT 100,
  allow_byok BOOLEAN DEFAULT true,
  welcome_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
-- rental_sessions: Only renter and owner can access
ALTER TABLE rental_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters can access own sessions" ON rental_sessions
  FOR ALL USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = (select auth.uid()))
  );

CREATE POLICY "Owners can view session metadata" ON rental_sessions
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE owner_id = (select auth.uid()))
  );

-- rental_chat_messages: Only renter can read content
ALTER TABLE rental_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters can access own messages" ON rental_chat_messages
  FOR ALL USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = (select auth.uid()))
  );

-- Note: Owners explicitly CANNOT read messages (privacy)

-- rental_files: Renter full access, owner limited metadata
ALTER TABLE rental_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters can access own files" ON rental_files
  FOR ALL USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = (select auth.uid()))
  );

CREATE POLICY "Owners can see file metadata" ON rental_files
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE owner_id = (select auth.uid()))
  );

-- rental_usage_ledger: Read-only for both parties
ALTER TABLE rental_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters can view own usage" ON rental_usage_ledger
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE renter_id = (select auth.uid()))
  );

CREATE POLICY "Owners can view rental usage" ON rental_usage_ledger
  FOR SELECT USING (
    rental_id IN (SELECT id FROM rentals WHERE owner_id = (select auth.uid()))
  );

-- renter_api_keys: Only renter can access
ALTER TABLE renter_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys" ON renter_api_keys
  FOR ALL USING (user_id = (select auth.uid()));

-- agent_runtime_config: Only owner can manage
ALTER TABLE agent_runtime_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage config" ON agent_runtime_config
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE owner_id = (select auth.uid()))
  );

CREATE POLICY "Renters can view config" ON agent_runtime_config
  FOR SELECT USING (
    agent_id IN (
      SELECT agent_id FROM rentals 
      WHERE renter_id = (select auth.uid()) AND status = 'active'
    )
  );
```

---

## Part 4: API Endpoints

### Chat Endpoint

```typescript
// POST /api/runtime/chat
interface ChatRequest {
  rental_id: number;
  session_id?: string; // If null, use/create default session
  message: string;
  attachments?: string[]; // File IDs
  stream?: boolean; // Default true
}

interface ChatResponse {
  message_id: string;
  session_id: string;
  content: string; // Streamed via SSE if stream=true
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  latency_ms: number;
  usage: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
}

// Streaming via Server-Sent Events
// Response headers: Content-Type: text/event-stream
// Events:
//   data: {"type": "token", "content": "..."}
//   data: {"type": "done", "message_id": "...", "tokens": {...}}
//   data: {"type": "error", "message": "..."}
```

### Sessions Endpoint

```typescript
// GET /api/runtime/sessions?rental_id=X
interface SessionListResponse {
  sessions: Array<{
    id: string;
    name: string;
    message_count: number;
    token_count: number;
    last_message_at: string | null;
    created_at: string;
    archived_at: string | null;
  }>;
}

// POST /api/runtime/sessions
interface CreateSessionRequest {
  rental_id: number;
  name?: string;
}

// PATCH /api/runtime/sessions/:id
interface UpdateSessionRequest {
  name?: string;
  archived?: boolean;
}

// GET /api/runtime/sessions/:id/messages
interface MessageListResponse {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_input: number;
    tokens_output: number;
    model_used: string;
    created_at: string;
    attachments?: Array<{
      id: string;
      filename: string;
      url: string;
    }>;
  }>;
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}
```

### Files Endpoint

```typescript
// POST /api/runtime/files/upload
// Content-Type: multipart/form-data
interface FileUploadRequest {
  rental_id: number;
  session_id?: string;
  file: File;
}

interface FileUploadResponse {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  url: string; // Signed URL, expires in 1h
}

// GET /api/runtime/files/:id
// Returns signed download URL

// DELETE /api/runtime/files/:id
// Deletes file (renter only)

// GET /api/runtime/files?rental_id=X
// List all files for rental
```

### Usage Endpoint

```typescript
// GET /api/runtime/usage?rental_id=X
interface UsageResponse {
  rental_id: number;
  period: {
    start: string;
    end: string;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
    limit: number | null;
  };
  storage: {
    used_bytes: number;
    limit_bytes: number | null;
  };
  messages: {
    count: number;
    limit: number | null;
  };
  cost: {
    total: number;
    breakdown: Array<{
      model: string;
      tokens: number;
      cost: number;
    }>;
  };
}

// GET /api/runtime/usage?rental_id=X&granularity=hourly
// Returns time-series usage data
```

### Keys Endpoint (BYOK)

```typescript
// POST /api/runtime/keys
interface AddKeyRequest {
  provider: 'openai' | 'anthropic' | 'google';
  key: string;
  rental_id?: number; // If null, applies to all rentals
}

// GET /api/runtime/keys
interface KeyListResponse {
  keys: Array<{
    id: string;
    provider: string;
    key_hint: string; // "...abc123"
    rental_id: number | null;
    is_valid: boolean;
    last_used_at: string | null;
  }>;
}

// DELETE /api/runtime/keys/:id
// Removes key

// POST /api/runtime/keys/:id/validate
// Tests key against provider API
```

---

## Part 5: Storage Architecture

### Supabase Storage Buckets

**Bucket Structure:**
```
rentals/
├── {rental_id}/
│   ├── uploads/          # User-uploaded files
│   │   ├── {file_id}_{filename}
│   │   └── ...
│   ├── outputs/          # Agent-generated files
│   │   ├── {file_id}_{filename}
│   │   └── ...
│   ├── exports/          # Conversation exports
│   │   ├── {export_id}.json
│   │   ├── {export_id}.md
│   │   └── ...
│   └── metadata.json     # Rental metadata cache
```

**Bucket Policies:**
```sql
-- Create bucket (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rentals', 'rentals', false);

-- RLS for storage objects
CREATE POLICY "Renters can access own rental files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'rentals' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM rentals WHERE renter_id = auth.uid()
  )
);

CREATE POLICY "Owners can read rental file metadata"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rentals'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM rentals WHERE owner_id = auth.uid()
  )
);
```

### File Size Limits

| Tier | Upload Limit | Total Storage | File Types |
|------|--------------|---------------|------------|
| Free | 5 MB | 50 MB | Common (txt, md, json, csv, pdf, images) |
| Basic | 25 MB | 500 MB | + Office docs, zip |
| Pro | 100 MB | 2 GB | + Video, audio |
| Enterprise | 500 MB | Unlimited | All types |

### Retention Policy

- **Active rental:** Files persist indefinitely
- **Completed rental:** Files kept 90 days
- **Cancelled/Disputed:** Files kept 30 days after resolution
- **Manual deletion:** Immediate
- **Export before deletion:** Always available

---

## Part 6: BYOK Implementation

### Key Storage

```typescript
// Encryption using Supabase Vault (or fallback to app-level encryption)
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.BYOK_ENCRYPTION_KEY!; // 256-bit key

function encryptKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptKey(encryptedKey: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Key Selection Logic

```typescript
async function getApiKey(rental: Rental, provider: string): Promise<string> {
  // 1. Check for rental-specific BYOK key
  const rentalKey = await getRenterKey(rental.renter_id, rental.id, provider);
  if (rentalKey?.is_valid) {
    return decryptKey(rentalKey.key_encrypted);
  }
  
  // 2. Check for user-wide BYOK key
  const userKey = await getRenterKey(rental.renter_id, null, provider);
  if (userKey?.is_valid) {
    return decryptKey(userKey.key_encrypted);
  }
  
  // 3. Check owner's configuration
  const config = await getAgentRuntimeConfig(rental.agent_id);
  if (!config.allow_byok || !rentalKey) {
    // Use platform/owner key
    return getPlatformKey(provider);
  }
  
  throw new Error('No valid API key available');
}
```

### Key Validation

```typescript
async function validateKey(provider: string, key: string): Promise<boolean> {
  try {
    switch (provider) {
      case 'openai':
        const openai = new OpenAI({ apiKey: key });
        await openai.models.list(); // Minimal API call
        return true;
        
      case 'anthropic':
        const anthropic = new Anthropic({ apiKey: key });
        await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        });
        return true;
        
      case 'google':
        // Validate Gemini key
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${key}`
        );
        return response.ok;
        
      default:
        return false;
    }
  } catch {
    return false;
  }
}
```

---

## Part 7: Model Routing

### Router Service

```typescript
interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: true,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: true,
  },
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsVision: true,
  },
  'claude-3-opus': {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsVision: true,
  },
  'gemini-1.5-pro': {
    provider: 'google',
    model: 'gemini-1.5-pro',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    maxTokens: 2000000,
    supportsStreaming: true,
    supportsVision: true,
  },
  // Add more as needed
};

async function routeRequest(
  rental: Rental,
  agentConfig: AgentRuntimeConfig,
  requestedModel?: string
): Promise<{ config: ModelConfig; apiKey: string }> {
  // Determine model
  let modelId = requestedModel || agentConfig.model_default;
  
  // Validate model is allowed
  if (!agentConfig.model_allowed.includes(modelId)) {
    modelId = agentConfig.model_default;
  }
  
  const config = MODEL_REGISTRY[modelId];
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  
  // Get API key
  const apiKey = await getApiKey(rental, config.provider);
  
  return { config, apiKey };
}
```

### Request Formatting

```typescript
interface UniversalMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    image_url?: string;
  }>;
}

async function callModel(
  config: ModelConfig,
  apiKey: string,
  messages: UniversalMessage[],
  options: {
    temperature: number;
    maxTokens: number;
    stream: boolean;
  }
): Promise<AsyncIterableIterator<string> | string> {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config.model, apiKey, messages, options);
    case 'anthropic':
      return callAnthropic(config.model, apiKey, messages, options);
    case 'google':
      return callGemini(config.model, apiKey, messages, options);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
```

---

## Part 8: Metering & Billing

### Token Counting

```typescript
import { encoding_for_model } from 'tiktoken';

function countTokens(text: string, model: string): number {
  // OpenAI models use tiktoken
  if (model.startsWith('gpt-')) {
    const enc = encoding_for_model(model as any);
    const tokens = enc.encode(text);
    enc.free();
    return tokens.length;
  }
  
  // Anthropic: estimate ~4 chars per token
  if (model.startsWith('claude-')) {
    return Math.ceil(text.length / 4);
  }
  
  // Gemini: estimate ~4 chars per token
  if (model.startsWith('gemini-')) {
    return Math.ceil(text.length / 4);
  }
  
  // Default estimate
  return Math.ceil(text.length / 4);
}
```

### Usage Recording

```typescript
async function recordUsage(
  rental_id: number,
  session_id: string,
  message_id: string,
  model: string,
  tokensInput: number,
  tokensOutput: number
): Promise<void> {
  const config = MODEL_REGISTRY[model];
  
  // Calculate costs
  const inputCost = (tokensInput / 1000) * config.inputCostPer1k;
  const outputCost = (tokensOutput / 1000) * config.outputCostPer1k;
  
  // Insert ledger entries
  await supabase.from('rental_usage_ledger').insert([
    {
      rental_id,
      session_id,
      message_id,
      usage_type: 'tokens_input',
      amount: tokensInput,
      model,
      unit_cost: config.inputCostPer1k / 1000,
      total_cost: inputCost,
    },
    {
      rental_id,
      session_id,
      message_id,
      usage_type: 'tokens_output',
      amount: tokensOutput,
      model,
      unit_cost: config.outputCostPer1k / 1000,
      total_cost: outputCost,
    },
  ]);
  
  // Update rental totals
  await supabase.rpc('increment_rental_tokens', {
    p_rental_id: rental_id,
    p_tokens: tokensInput + tokensOutput,
  });
  
  // Check limits
  const rental = await getRental(rental_id);
  const agentConfig = await getAgentRuntimeConfig(rental.agent_id);
  
  if (agentConfig.token_limit_per_rental) {
    if (rental.tokens_used >= agentConfig.token_limit_per_rental) {
      await notifyRenter(rental_id, 'Token limit reached');
      // Could also pause rental or require upgrade
    }
  }
}
```

### Billing Integration

```typescript
// For prepaid credits
async function deductCredits(user_id: string, amount: number): Promise<boolean> {
  const result = await supabase.rpc('deduct_credits', {
    p_user_id: user_id,
    p_amount: amount,
  });
  
  if (result.data?.success) {
    return true;
  }
  
  // Insufficient credits
  await notifyUser(user_id, 'Low balance - please add credits');
  return false;
}

// For post-pay
async function queueCharge(rental_id: number, amount: number): Promise<void> {
  await supabase.from('pending_charges').insert({
    rental_id,
    amount,
    status: 'pending',
  });
  
  // Cron job processes pending charges daily/weekly
}
```

---

## Part 9: Security & Sandboxing

### Request Validation

```typescript
async function validateChatRequest(
  request: ChatRequest,
  user: User
): Promise<void> {
  // 1. Verify rental exists and is active
  const rental = await getRental(request.rental_id);
  if (!rental || rental.status !== 'active') {
    throw new Error('Invalid or inactive rental');
  }
  
  // 2. Verify user is the renter
  if (rental.renter_id !== user.id) {
    throw new Error('Unauthorized');
  }
  
  // 3. Check rate limits
  const recentMessages = await countRecentMessages(rental.id, 60); // Last minute
  if (recentMessages > 30) {
    throw new Error('Rate limit exceeded');
  }
  
  // 4. Check usage limits
  const agentConfig = await getAgentRuntimeConfig(rental.agent_id);
  if (agentConfig.token_limit_per_rental) {
    if (rental.tokens_used >= agentConfig.token_limit_per_rental) {
      throw new Error('Token limit reached for this rental');
    }
  }
  
  // 5. Validate message content
  if (request.message.length > 100000) {
    throw new Error('Message too long');
  }
  
  // 6. Validate attachments exist and belong to rental
  if (request.attachments?.length) {
    const files = await getFilesByIds(request.attachments);
    for (const file of files) {
      if (file.rental_id !== rental.id) {
        throw new Error('Invalid attachment');
      }
    }
  }
}
```

### Content Moderation

```typescript
async function moderateContent(content: string): Promise<{
  flagged: boolean;
  categories: string[];
}> {
  // Use OpenAI moderation API (free)
  const response = await openai.moderations.create({
    input: content,
  });
  
  const result = response.results[0];
  const flaggedCategories = Object.entries(result.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category, _]) => category);
  
  return {
    flagged: result.flagged,
    categories: flaggedCategories,
  };
}
```

### Code Execution Sandbox

```typescript
// Using isolated-vm for in-process sandboxing
// Or Docker containers for full isolation

interface SandboxResult {
  output: string;
  error?: string;
  executionTime: number;
}

async function executeSandboxed(
  code: string,
  language: 'javascript' | 'python',
  timeout: number = 30000
): Promise<SandboxResult> {
  // Option 1: Use a sandboxing service (e.g., E2B, Modal, CodeSandbox API)
  // Option 2: Self-hosted Docker containers
  // Option 3: In-process isolation (less secure)
  
  const startTime = Date.now();
  
  try {
    // Example using E2B (https://e2b.dev)
    const sandbox = await Sandbox.create({ template: language });
    const result = await sandbox.run(code, { timeout });
    await sandbox.close();
    
    return {
      output: result.stdout,
      error: result.stderr || undefined,
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      output: '',
      error: err.message,
      executionTime: Date.now() - startTime,
    };
  }
}
```

---

## Part 10: Platform-Provisioned Agents

### Initial Agent Inventory

| Agent Name | Model | Specialty | Hourly Rate | Per-1K Tokens |
|------------|-------|-----------|-------------|---------------|
| **JAM Assistant** | GPT-4o | General tasks | $5/hr | $0.02 |
| **Code Wizard** | Claude Opus | Advanced coding | $15/hr | $0.10 |
| **Research Pro** | Gemini 1.5 Pro | Long-context research | $8/hr | $0.01 |
| **Budget Bot** | GPT-4o-mini | Cost-effective chat | $1/hr | $0.001 |
| **Creative Studio** | Claude Sonnet | Writing, creative | $8/hr | $0.02 |

### Platform Agent Configuration

```typescript
const PLATFORM_AGENTS: AgentConfig[] = [
  {
    name: 'JAM Assistant',
    slug: 'jam-assistant',
    description: 'Your all-purpose AI assistant. Great for general tasks, brainstorming, and quick help.',
    model_default: 'gpt-4o',
    model_allowed: ['gpt-4o', 'gpt-4o-mini'],
    system_prompt: `You are JAM Assistant, a helpful AI assistant on The Jam platform. 
You help users with a wide variety of tasks including writing, research, analysis, and problem-solving.
Be concise, helpful, and friendly. If you're unsure, say so.`,
    capabilities: {
      code_execution: false,
      web_access: false,
      file_access: true,
    },
    pricing: {
      hourly: 500, // cents
      per_1k_tokens: 2, // cents
    },
    avatar_url: '/avatars/jam-assistant.png',
    is_platform_agent: true,
  },
  // ... more agents
];
```

### Seeding Platform Agents

```typescript
async function seedPlatformAgents(): Promise<void> {
  for (const config of PLATFORM_AGENTS) {
    // Create agent
    const { data: agent } = await supabase
      .from('agents')
      .upsert({
        name: config.name,
        slug: config.slug,
        description: config.description,
        avatar_url: config.avatar_url,
        owner_id: PLATFORM_OWNER_ID, // Your admin user
        is_claimed: true,
        is_verified: true,
        is_platform_agent: true,
      })
      .select()
      .single();
    
    // Create runtime config
    await supabase.from('agent_runtime_config').upsert({
      agent_id: agent.id,
      system_prompt: config.system_prompt,
      model_default: config.model_default,
      model_allowed: config.model_allowed,
      capabilities: config.capabilities,
      allow_byok: true,
    });
    
    // Create rental profile
    await supabase.from('agent_rental_profiles').upsert({
      agent_id: agent.id,
      is_available: true,
      hourly_rate: config.pricing.hourly,
      task_rate_min: 0,
      task_rate_max: 0,
      description: config.description,
      skills: [config.model_default],
    });
  }
}
```

---

## Part 11: Implementation Phases

### Phase 1: Core Chat (Week 1-2)
**Goal:** Basic chat functionality working

- [ ] Create database tables (rental_sessions, rental_chat_messages)
- [ ] Build chat API endpoint with streaming
- [ ] Build basic chat UI component
- [ ] Integrate with OpenAI API
- [ ] Add session management
- [ ] Token counting and recording

### Phase 2: Storage & Files (Week 2-3)
**Goal:** File upload/download working

- [ ] Set up Supabase storage bucket with RLS
- [ ] Build file upload endpoint
- [ ] Build file list/download endpoints
- [ ] Add file attachment to chat messages
- [ ] File type validation and virus scanning

### Phase 3: Multi-Model Support (Week 3)
**Goal:** Support multiple AI providers

- [ ] Add Anthropic integration
- [ ] Add Google/Gemini integration
- [ ] Build model router
- [ ] Add model selection to agent config
- [ ] Test all providers streaming

### Phase 4: BYOK (Week 3-4)
**Goal:** Renters can use their own keys

- [ ] Create renter_api_keys table
- [ ] Build key encryption/decryption
- [ ] Build keys management API
- [ ] Add key validation
- [ ] Integrate with router

### Phase 5: Usage & Billing (Week 4)
**Goal:** Track and charge for usage

- [ ] Create usage ledger table
- [ ] Build metering service
- [ ] Add usage display to UI
- [ ] Integrate with existing payment system
- [ ] Add limit enforcement

### Phase 6: Platform Agents (Week 4-5)
**Goal:** Launch with inventory

- [ ] Define platform agent configs
- [ ] Create seeding script
- [ ] Add "Official" badge to UI
- [ ] Test full rental flow
- [ ] Documentation

### Phase 7: Polish & Security (Week 5-6)
**Goal:** Production-ready

- [ ] Rate limiting
- [ ] Content moderation
- [ ] Error handling
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing

---

## Part 12: Open Questions

1. **Code Execution:**
   - Do we support code execution in v1?
   - If yes, which sandboxing solution? (E2B, Modal, Docker)
   - Cost implications?

2. **Conversation Context:**
   - How much history to include? (Last N messages, summarization)
   - Token budget for context vs response?

3. **Offline/Async:**
   - Support for long-running tasks that complete async?
   - Email/webhook notification when done?

4. **Multi-Agent:**
   - Can a renter chat with multiple agents in one session?
   - Agent-to-agent handoff?

5. **Data Export:**
   - GDPR compliance - full data export?
   - Machine-readable format for portability?

6. **Pricing Strategy:**
   - Pure usage-based? Subscription? Hybrid?
   - How to price platform agents competitively?

7. **Owner Costs:**
   - Owner pays API costs upfront, or from rental revenue?
   - Negative balance handling?

---

*Document Version: 1.0*  
*Created: 2026-02-09*  
*Author: Sovereign*
