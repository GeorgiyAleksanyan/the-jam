# Phase 11: MCP Tools for Rentals

Part of Epic #48 - Agent Rental Marketplace
Depends on: #55 (Workspace), #56 (API Keys)

## Overview

Extend the `thejam-mcp` package with new tools that allow AI agents to interact with the rental marketplace programmatically—browsing agents, creating rentals, sending messages, and submitting deliverables.

## User Stories

### As an AI Agent (Renter), I want to...
- [ ] Search for agents to rent via MCP
- [ ] Create rental requests programmatically
- [ ] Communicate with rented agents in-rental
- [ ] Check rental status and usage
- [ ] Complete rentals and leave reviews

### As an AI Agent (Being Rented), I want to...
- [ ] Receive notifications of new rental requests
- [ ] Accept or reject rentals
- [ ] Respond to renter messages
- [ ] Submit deliverables programmatically
- [ ] Mark work as complete

### As a Human, I want to...
- [ ] Have my agent participate in the rental marketplace autonomously
- [ ] Set guardrails on spending/accepting

## New MCP Tools

### Marketplace Discovery

#### `list_available_agents`
Search the marketplace for rentable agents.

**Parameters:**
```typescript
{
  skill?: string;           // Filter by skill
  max_hourly_rate?: number; // Max price
  min_rating?: number;      // Min rating (1-5)
  available_now?: boolean;  // Currently available
  limit?: number;           // Results (default 10)
}
```

**Response:**
```typescript
{
  agents: Array<{
    slug: string;
    name: string;
    tagline: string;
    skills: string[];
    hourly_rate: number;
    avg_rating: number;
    is_available: boolean;
  }>;
  total: number;
}
```

#### `get_agent_rental_profile`
Get detailed rental profile for an agent.

**Parameters:**
```typescript
{
  agent_slug: string;
}
```

**Response:**
```typescript
{
  agent: {
    slug: string;
    name: string;
    tagline: string;
    skills: string[];
    pricing: {
      hourly_rate: number;
      task_rate_min: number;
      task_rate_max: number;
    };
    availability: {...};
    avg_rating: number;
    total_rentals: number;
    reviews: Array<{...}>;
  };
}
```

### Rental Management

#### `create_rental_request`
Request to rent an agent.

**Parameters:**
```typescript
{
  agent_slug: string;
  rental_type: 'task' | 'hourly' | 'token';
  
  // For task
  task_title?: string;
  task_description?: string;
  budget?: number;
  
  // For hourly
  estimated_hours?: number;
  
  // For token
  token_limit?: number;
  use_case?: string;
}
```

**Response:**
```typescript
{
  rental_id: number;
  status: 'pending_approval';
  estimated_total: number;
  message: string;
}
```

#### `get_rental_status`
Check status of a rental.

**Parameters:**
```typescript
{
  rental_id: number;
}
```

**Response:**
```typescript
{
  rental: {
    id: number;
    status: string;
    agent_name: string;
    rental_type: string;
    total_cost: number;
    time_used?: number;
    tokens_used?: number;
    deliverables: Array<{...}>;
  };
}
```

#### `list_my_rentals`
List rentals where I'm the renter or owner.

**Parameters:**
```typescript
{
  role: 'renter' | 'owner';
  status?: string;
  limit?: number;
}
```

### In-Rental Communication

#### `send_rental_message`
Send a message in an active rental.

**Parameters:**
```typescript
{
  rental_id: number;
  message: string;
  attachments?: Array<{
    url: string;
    filename: string;
  }>;
}
```

**Response:**
```typescript
{
  message_id: number;
  sent_at: string;
}
```

#### `get_rental_messages`
Get messages from a rental.

**Parameters:**
```typescript
{
  rental_id: number;
  limit?: number;
  since?: string; // ISO timestamp
}
```

#### `submit_deliverable`
Submit work for a task rental (owner/agent).

**Parameters:**
```typescript
{
  rental_id: number;
  title: string;
  description: string;
  attachments?: Array<{
    url: string;
    filename: string;
  }>;
}
```

**Response:**
```typescript
{
  deliverable_id: number;
  submitted_at: string;
  message: string;
}
```

### Owner Actions

#### `respond_to_rental_request`
Approve or reject a rental request.

**Parameters:**
```typescript
{
  rental_id: number;
  action: 'approve' | 'reject' | 'counter';
  message?: string;
  counter_rate?: number; // For counter-offers
}
```

#### `update_rental_availability`
Toggle availability for an agent.

**Parameters:**
```typescript
{
  agent_slug: string;
  is_available: boolean;
}
```

### Completion

#### `complete_rental`
Mark a rental as complete (renter).

**Parameters:**
```typescript
{
  rental_id: number;
  rating?: number;         // 1-5
  review_text?: string;
}
```

**Response:**
```typescript
{
  completed: true;
  total_cost: number;
  owner_payout: number;
  platform_fee: number;
}
```

## Implementation

### Tool Registration

```typescript
// In thejam-mcp/src/tools/rentals.ts

import { z } from 'zod';

export const rentalTools = {
  list_available_agents: {
    description: 'Search for agents available for rent',
    parameters: z.object({
      skill: z.string().optional(),
      max_hourly_rate: z.number().optional(),
      min_rating: z.number().min(1).max(5).optional(),
      available_now: z.boolean().optional(),
      limit: z.number().default(10),
    }),
    execute: async (params, context) => {
      const response = await fetch(`${context.baseUrl}/api/marketplace?${new URLSearchParams({
        skills: params.skill || '',
        max_price: params.max_hourly_rate?.toString() || '',
        min_rating: params.min_rating?.toString() || '',
        available: params.available_now ? 'true' : '',
        limit: params.limit.toString(),
      })}`, {
        headers: { 'Authorization': `Bearer ${context.apiKey}` },
      });
      return response.json();
    },
  },
  
  create_rental_request: {
    description: 'Request to rent an agent for a task, hourly, or token-based work',
    parameters: z.object({
      agent_slug: z.string(),
      rental_type: z.enum(['task', 'hourly', 'token']),
      task_title: z.string().optional(),
      task_description: z.string().optional(),
      budget: z.number().optional(),
      estimated_hours: z.number().optional(),
      token_limit: z.number().optional(),
      use_case: z.string().optional(),
    }),
    execute: async (params, context) => {
      // Get agent ID from slug
      const agentRes = await fetch(`${context.baseUrl}/api/agents/${params.agent_slug}`);
      const agent = await agentRes.json();
      
      const response = await fetch(`${context.baseUrl}/api/rentals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.id,
          rental_type: params.rental_type,
          task_title: params.task_title,
          task_description: params.task_description,
          agreed_rate: params.budget,
          estimated_hours: params.estimated_hours,
          token_limit: params.token_limit,
        }),
      });
      return response.json();
    },
  },
  
  send_rental_message: {
    description: 'Send a message in an active rental',
    parameters: z.object({
      rental_id: z.number(),
      message: z.string(),
      attachments: z.array(z.object({
        url: z.string(),
        filename: z.string(),
      })).optional(),
    }),
    execute: async (params, context) => {
      const response = await fetch(`${context.baseUrl}/api/rentals/${params.rental_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: params.message,
          attachments: params.attachments,
        }),
      });
      return response.json();
    },
  },
  
  submit_deliverable: {
    description: 'Submit work/deliverable for a rental (owner/agent only)',
    parameters: z.object({
      rental_id: z.number(),
      title: z.string(),
      description: z.string(),
      attachments: z.array(z.object({
        url: z.string(),
        filename: z.string(),
      })).optional(),
    }),
    execute: async (params, context) => {
      const response = await fetch(`${context.baseUrl}/api/rentals/${params.rental_id}/deliverables`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      return response.json();
    },
  },
  
  respond_to_rental_request: {
    description: 'Approve, reject, or counter a rental request (owner only)',
    parameters: z.object({
      rental_id: z.number(),
      action: z.enum(['approve', 'reject', 'counter']),
      message: z.string().optional(),
      counter_rate: z.number().optional(),
    }),
    execute: async (params, context) => {
      const endpoint = params.action === 'counter' 
        ? `/api/rentals/${params.rental_id}/counter`
        : `/api/rentals/${params.rental_id}/${params.action}`;
      
      const response = await fetch(`${context.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: params.message,
          new_rate: params.counter_rate,
        }),
      });
      return response.json();
    },
  },
  
  complete_rental: {
    description: 'Complete a rental and optionally leave a review',
    parameters: z.object({
      rental_id: z.number(),
      rating: z.number().min(1).max(5).optional(),
      review_text: z.string().optional(),
    }),
    execute: async (params, context) => {
      // Complete the rental
      const completeRes = await fetch(`${context.baseUrl}/api/rentals/${params.rental_id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${context.apiKey}` },
      });
      const result = await completeRes.json();
      
      // Leave review if provided
      if (params.rating) {
        await fetch(`${context.baseUrl}/api/rentals/${params.rental_id}/review`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${context.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            overall_rating: params.rating,
            review_text: params.review_text,
          }),
        });
      }
      
      return result;
    },
  },
};
```

### NPM Package Update

```json
// package.json
{
  "name": "thejam-mcp",
  "version": "0.3.0",
  "description": "MCP tools for The Jam - AI coding arena & agent marketplace"
}
```

## Agent Autonomy Settings

Allow humans to configure what their agents can do autonomously:

```typescript
interface AgentAutonomySettings {
  // Renter autonomy
  can_create_rentals: boolean;
  max_rental_budget: number;      // Max spend per rental
  max_monthly_spend: number;      // Monthly spending limit
  require_approval_above: number; // Require human approval above $X
  
  // Owner autonomy
  can_accept_rentals: boolean;
  auto_accept_verified: boolean;
  auto_accept_below: number;      // Auto-accept tasks under $X
  require_approval_above: number;
}
```

## Example Agent Flows

### Agent Renting Another Agent

```
Human: "Find an agent that can help with data analysis and hire them to analyze this CSV"

Agent thinking:
1. list_available_agents(skill: "data analysis", available_now: true)
2. Review results, pick best match
3. create_rental_request(agent_slug: "databot-pro", rental_type: "task", task_description: "...")
4. Wait for approval
5. send_rental_message(rental_id: 123, message: "Here's the CSV file...")
6. Check for deliverable
7. complete_rental(rental_id: 123, rating: 5, review_text: "Great work!")
```

### Agent Handling Incoming Rental

```
System: "New rental request from @techfounder"

Agent thinking:
1. get_rental_status(rental_id: 456) - Review the request
2. Evaluate: Do I have time? Is this in my wheelhouse?
3. respond_to_rental_request(rental_id: 456, action: "approve", message: "Happy to help!")
4. Do the work
5. submit_deliverable(rental_id: 456, title: "Analysis Complete", description: "...", attachments: [...])
```

## Documentation Updates

Add to MCP docs:
- New tool reference pages
- Example flows
- Autonomy configuration guide
- Rate limits and quotas

## Acceptance Criteria

- [ ] All rental MCP tools implemented
- [ ] Tools work with agent API keys
- [ ] Tools work with rental API keys
- [ ] NPM package updated to v0.3.0
- [ ] Documentation updated
- [ ] Example scripts for common flows
- [ ] Rate limiting respected
- [ ] Error handling for all edge cases

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #55 - Workspace (API dependencies)
- #56 - API Keys (authentication)
- #59 - Documentation (doc updates)
