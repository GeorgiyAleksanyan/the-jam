# Phase 8: API Key Access for Rentals

Part of Epic #48 - Agent Rental Marketplace
Depends on: #55 (Workspace)

## Overview

Allow renters to generate unique, scoped API keys for their active rentals, enabling programmatic access to the rented agent via The Jam's API and MCP tools.

## User Stories

### As a Renter, I want to...
- [ ] Generate an API key for my active rental
- [ ] Use this key to send prompts/tasks to the agent programmatically
- [ ] Set rate limits and token budgets per key
- [ ] Revoke keys if compromised
- [ ] See my usage (tokens/requests) against my limits
- [ ] Have keys expire automatically when the rental ends

### As an Agent Owner, I want to...
- [ ] Define which capabilities are available via API
- [ ] Set default rate limits for my agent
- [ ] See API usage statistics for my rentals
- [ ] Be protected from abuse via rate limiting

## API Key Architecture

### Key Format
```
jam_rental_sk_<32_random_hex_chars>
```

Example: `jam_rental_sk_a1b2c3d4e5f6789012345678901234567890abcd`

### Security
- Full key shown ONCE at creation (never stored)
- Only hash stored in database (SHA-256)
- Lookup via hash prefix for efficiency
- Keys tied to specific rental ID

### Scopes
| Scope | Description |
|-------|-------------|
| `execute` | Send prompts and receive responses |
| `read` | Read rental messages and status |
| `write` | Send messages to rental chat |
| `upload` | Upload files/attachments |

## Database Schema

Already defined in #49, key fields:

```sql
CREATE TABLE rental_api_keys (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
  
  api_key TEXT UNIQUE NOT NULL,        -- Shown once, then discarded
  key_hash TEXT NOT NULL,              -- SHA-256 for lookup
  
  name TEXT,                           -- User-friendly name
  scopes TEXT[],                       -- ['execute', 'read', ...]
  
  rate_limit_rpm INTEGER DEFAULT 60,   -- Requests per minute
  rate_limit_rpd INTEGER DEFAULT 1000, -- Requests per day
  
  token_limit INTEGER,                 -- Total tokens allowed
  tokens_used INTEGER DEFAULT 0,
  
  request_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST `/api/rentals/[id]/api-key`
Generate a new API key.

**Request:**
```json
{
  "name": "My Integration",
  "scopes": ["execute", "read"],
  "rate_limit_rpm": 60,
  "token_limit": 1000000
}
```

**Response:**
```json
{
  "id": 1,
  "api_key": "jam_rental_sk_a1b2c3d4...",
  "name": "My Integration",
  "scopes": ["execute", "read"],
  "rate_limit_rpm": 60,
  "token_limit": 1000000,
  "expires_at": "2025-02-15T00:00:00Z",
  "warning": "Save this key now. It won't be shown again."
}
```

### GET `/api/rentals/[id]/api-keys`
List active keys (metadata only, no full keys).

**Response:**
```json
{
  "keys": [
    {
      "id": 1,
      "name": "My Integration",
      "key_preview": "jam_rental_sk_...abcd",
      "scopes": ["execute", "read"],
      "tokens_used": 45200,
      "token_limit": 1000000,
      "request_count": 127,
      "last_used_at": "2025-02-08T15:30:00Z",
      "expires_at": "2025-02-15T00:00:00Z"
    }
  ]
}
```

### DELETE `/api/rentals/[id]/api-keys/[key_id]`
Revoke a key.

**Response:**
```json
{
  "success": true,
  "revoked_at": "2025-02-08T16:00:00Z"
}
```

### GET `/api/rentals/[id]/usage`
Get detailed usage statistics.

**Response:**
```json
{
  "total_tokens": 245000,
  "total_requests": 523,
  "usage_by_day": [
    { "date": "2025-02-07", "tokens": 120000, "requests": 256 },
    { "date": "2025-02-08", "tokens": 125000, "requests": 267 }
  ],
  "usage_by_key": [
    { "key_id": 1, "name": "My Integration", "tokens": 245000, "requests": 523 }
  ]
}
```

## Agent Execution API

### POST `/api/v1/agent/execute`
Execute a prompt against a rented agent.

**Headers:**
```
Authorization: Bearer jam_rental_sk_...
Content-Type: application/json
```

**Request:**
```json
{
  "prompt": "Analyze this code for security issues...",
  "context": {
    "files": ["https://..."]
  },
  "options": {
    "max_tokens": 4000,
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "id": "exec_123abc",
  "status": "completed",
  "response": "I've analyzed the code and found 3 potential issues...",
  "usage": {
    "prompt_tokens": 1250,
    "completion_tokens": 890,
    "total_tokens": 2140
  },
  "remaining": {
    "tokens": 997860,
    "requests_today": 477
  }
}
```

### Error Responses

```json
// 401 Unauthorized
{ "error": "invalid_key", "message": "API key is invalid or revoked" }

// 403 Forbidden
{ "error": "insufficient_scope", "message": "Key lacks 'execute' scope" }

// 429 Too Many Requests
{ 
  "error": "rate_limited", 
  "message": "Rate limit exceeded",
  "retry_after": 45
}

// 402 Payment Required
{ "error": "token_limit_exceeded", "message": "Token budget exhausted" }

// 410 Gone
{ "error": "rental_ended", "message": "This rental has ended" }
```

## Authentication Middleware

```typescript
async function authenticateRentalKey(req: Request): Promise<RentalAuth | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer jam_rental_sk_')) {
    return null;
  }
  
  const key = authHeader.replace('Bearer ', '');
  const keyHash = sha256(key);
  
  // Lookup by hash
  const { data: apiKey } = await supabase
    .from('rental_api_keys')
    .select('*, rentals(*)')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();
  
  if (!apiKey) return null;
  
  // Check expiration
  if (new Date(apiKey.expires_at) < new Date()) {
    return null;
  }
  
  // Check rental is still active
  if (!['active', 'escrow_funded'].includes(apiKey.rentals.status)) {
    return null;
  }
  
  return {
    keyId: apiKey.id,
    rentalId: apiKey.rental_id,
    agentId: apiKey.rentals.agent_id,
    scopes: apiKey.scopes,
    rateLimits: {
      rpm: apiKey.rate_limit_rpm,
      rpd: apiKey.rate_limit_rpd,
    },
    tokenLimit: apiKey.token_limit,
    tokensUsed: apiKey.tokens_used,
  };
}
```

## Rate Limiting

Use Redis/Upstash for rate limit tracking:

```typescript
async function checkRateLimit(keyId: number, limits: RateLimits): Promise<boolean> {
  const redis = getRedis();
  
  // Per-minute limit
  const minuteKey = `ratelimit:${keyId}:${Math.floor(Date.now() / 60000)}`;
  const minuteCount = await redis.incr(minuteKey);
  await redis.expire(minuteKey, 120);
  
  if (minuteCount > limits.rpm) {
    return false; // Rate limited
  }
  
  // Per-day limit
  const dayKey = `ratelimit:${keyId}:${new Date().toISOString().slice(0, 10)}`;
  const dayCount = await redis.incr(dayKey);
  await redis.expire(dayKey, 86400 * 2);
  
  if (dayCount > limits.rpd) {
    return false; // Rate limited
  }
  
  return true;
}
```

## Token Budget Enforcement

```typescript
async function checkTokenBudget(keyId: number, estimatedTokens: number): Promise<boolean> {
  const { data: key } = await supabase
    .from('rental_api_keys')
    .select('tokens_used, token_limit')
    .eq('id', keyId)
    .single();
  
  if (key.token_limit && key.tokens_used + estimatedTokens > key.token_limit) {
    return false; // Would exceed budget
  }
  
  return true;
}

async function recordTokenUsage(keyId: number, tokens: number): Promise<void> {
  await supabase.rpc('increment_key_usage', {
    p_key_id: keyId,
    p_tokens: tokens,
  });
}
```

## UI Components

### API Access Tab in Rental Workspace

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔑 API Access                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Access this agent programmatically with API keys.                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Active Keys                                                         │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🔐 My Integration                                               │ │
│ │                                                                 │ │
│ │ Key: jam_rental_sk_...a1b2                                      │ │
│ │ Scopes: execute, read                                           │ │
│ │ Created: Feb 8, 2025 • Last used: 2 hours ago                   │ │
│ │                                                                 │ │
│ │ Usage: 45,200 / 1,000,000 tokens (4.5%)                        │ │
│ │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │ │
│ │                                                                 │ │
│ │ Requests today: 127 / 1,000                                     │ │
│ │                                                                 │ │
│ │                                                     [Revoke]    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [+ Generate New Key]                                                │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ 📚 Quick Start                                                      │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ curl -X POST https://the-jam.webglo.org/api/v1/agent/execute \  │ │
│ │   -H "Authorization: Bearer YOUR_API_KEY" \                     │ │
│ │   -H "Content-Type: application/json" \                         │ │
│ │   -d '{"prompt": "Hello, agent!"}'                              │ │
│ │                                                      [Copy]     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [View Full Documentation →]                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Generate Key Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔑 Generate API Key                                           [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Name                                                                │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ My Integration                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Scopes                                                              │
│ [✓] execute - Send prompts and receive responses                    │
│ [✓] read - Read rental messages and status                          │
│ [ ] write - Send messages to rental chat                            │
│ [ ] upload - Upload files and attachments                           │
│                                                                     │
│ Rate Limits                                                         │
│ Requests per minute: [60]                                           │
│ Requests per day: [1000]                                            │
│                                                                     │
│ Token Budget (optional)                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 1000000                                                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ Leave empty for unlimited (up to rental limit)                      │
│                                                                     │
│                                       [Cancel]  [Generate Key]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Created (Show Once)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ API Key Created                                            [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ⚠️ Copy this key now. It won't be shown again!                     │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ jam_rental_sk_a1b2c3d4e5f6789012345678901234567890abcdef123456  │ │
│ │                                                         [Copy]  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Key Name: My Integration                                            │
│ Scopes: execute, read                                               │
│ Expires: Feb 15, 2025 (when rental ends)                           │
│                                                                     │
│                                              [I've Saved My Key]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### New Components
- `APIAccessTab.tsx` - API key management tab
- `APIKeyList.tsx` - List of active keys
- `APIKeyCard.tsx` - Single key display with usage
- `GenerateKeyModal.tsx` - Key creation form
- `KeyCreatedModal.tsx` - Show key once after creation
- `UsageChart.tsx` - Token/request usage visualization
- `CodeSnippet.tsx` - Copy-able code examples

## Acceptance Criteria

- [ ] Renters can generate API keys from workspace
- [ ] Keys shown only once at creation
- [ ] Keys work for authentication
- [ ] Scopes are enforced
- [ ] Rate limits work (returns 429)
- [ ] Token budget enforced (returns 402)
- [ ] Keys auto-expire when rental ends
- [ ] Revocation works immediately
- [ ] Usage stats displayed in UI
- [ ] Code snippets for common languages

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #55 - Workspace (dependency)
- #58 - MCP Tools (will use these keys)
