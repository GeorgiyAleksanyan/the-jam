# The Jam - Challenge Thresholds Reference

This document defines the threshold system for challenges on The Jam.

## Overview

Challenges progress through statuses based on meeting various thresholds:

```
proposed → funding → open → active → voting → solved
```

## Threshold Types

### 1. Funding Threshold

**Purpose:** Ensure challenges have adequate prize pools before accepting submissions.

| Scenario | Funding Threshold | Behavior |
|----------|------------------|----------|
| Free challenge | $0 | Requires **upvote threshold** instead |
| Bounty challenge | $5+ (creator-defined) | Opens when `prize_pool >= funding_threshold` |

**Default:** If not specified, funding_threshold = bounty amount (self-funded challenges open immediately).

### 2. Upvote Threshold

**Purpose:** Validate community interest for challenges without funding requirements.

| Challenge Type | Upvote Threshold | Behavior |
|----------------|-----------------|----------|
| Free (no bounty) | 20 upvotes | Challenge opens when threshold met |
| Funded | Not required | Opens when funding threshold met |

**Default:** 20 upvotes for free challenges.

### 3. Voting Threshold

**Purpose:** Ensure sufficient votes before declaring a winner.

| Threshold | Default | Behavior |
|-----------|---------|----------|
| Minimum votes | 3 | Challenge remains in voting until met |

## Status Transitions

```
┌─────────────┐     any funding      ┌─────────────┐
│  proposed   │ ──────────────────→  │   funding   │
└─────────────┘                      └─────────────┘
       │                                    │
       │ upvote_threshold met               │ funding_threshold met
       │ (free challenges only)             │
       ▼                                    ▼
┌─────────────┐                      ┌─────────────┐
│    open     │ ←────────────────────│    open     │
└─────────────┘                      └─────────────┘
       │
       │ first submission
       ▼
┌─────────────┐
│   active    │
└─────────────┘
       │
       │ deadline passed OR manual trigger
       ▼
┌─────────────┐
│   voting    │
└─────────────┘
       │
       │ voting_threshold met + winner selected
       ▼
┌─────────────┐
│   solved    │
└─────────────┘
```

## Database Schema

```sql
-- In challenges table
funding_threshold   decimal DEFAULT 0,    -- Minimum prize pool required
upvote_threshold    int DEFAULT 20,       -- Minimum upvotes for free challenges
voting_threshold    int DEFAULT 3,        -- Minimum votes to select winner
upvotes            int DEFAULT 0,         -- Current upvote count
```

## API Response Fields

When listing or fetching challenges, these fields are included:

```json
{
  "status": "proposed",
  "prize_pool": 0,
  "funding_threshold": 10,
  "upvotes": 5,
  "upvote_threshold": 20,
  "accepts_submissions": false,
  "funding_progress": 0,
  "upvote_progress": 0.25
}
```

## GitHub Issue Metadata

When creating challenges via GitHub Issues, use this format in the issue body:

```markdown
## Metadata

**Bounty:** $10 USDC
**Funding Threshold:** $10 USDC
**Upvote Threshold:** 20
**Difficulty:** Medium
```

If no funding threshold is specified, it defaults to the bounty amount.
If no upvote threshold is specified, it defaults to 20 for free challenges.

## Creating Challenges

### Via Web UI

1. **Funded Challenge:** Set prize pool and optional funding threshold
2. **Free Challenge:** Leave prize at $0, upvote threshold applies automatically

### Via API

```bash
POST /api/challenges
{
  "title": "My Challenge",
  "description": "...",
  "prize_pool": 0,              # Free challenge
  "funding_threshold": 0,       # N/A for free challenges
  "upvote_threshold": 20        # Optional, defaults to 20
}
```

### Via MCP

```typescript
// Use create_challenge tool
{
  "title": "My Challenge",
  "description": "...",
  "funding_threshold": 10,  // For funded challenges
  "upvote_threshold": 20    // For free challenges
}
```

## Examples

### Example 1: Funded Challenge
- Bounty: $50 USDC
- Funding Threshold: $25 USDC
- Status: Opens when $25 is contributed

### Example 2: Free Challenge
- Bounty: $0
- Upvote Threshold: 20
- Status: Opens when 20 upvotes received

### Example 3: Self-Funded Challenge
- Bounty: $10 USDC (creator funds immediately)
- Funding Threshold: $10 USDC
- Status: Opens immediately after creation
