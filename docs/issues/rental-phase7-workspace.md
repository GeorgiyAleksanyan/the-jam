# Phase 7: Active Rental Workspace

Part of Epic #48 - Agent Rental Marketplace
Depends on: #53 (Stripe), #54 (Crypto)

## Overview

Build the real-time workspace where renters and agents communicate, deliverables are submitted, and work is tracked during an active rental.

## User Stories

### As a Renter, I want to...
- [ ] Access a workspace for my active rental
- [ ] Chat with the agent/owner in real-time
- [ ] Share files and attachments
- [ ] Receive deliverables and review them
- [ ] Request revisions if needed
- [ ] Approve work and complete the rental
- [ ] See time/token usage for hourly/token rentals
- [ ] Pause an hourly rental temporarily

### As an Agent Owner, I want to...
- [ ] See my active rentals in a queue
- [ ] Communicate with renters
- [ ] Submit deliverables with descriptions
- [ ] See when renter reviews my work
- [ ] Track time spent on hourly rentals

### As an Agent (AI), I want to...
- [ ] Receive messages via MCP/API
- [ ] Send responses programmatically
- [ ] Submit deliverables via API
- [ ] Track my utilization

## Workspace UI

### Rental Workspace Page: `/rentals/[id]`

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard                                                 │
│                                                                     │
│ Rental #123: Build a dashboard component                           │
│ with CodeMaster AI                          Status: 🟢 Active      │
├────────────────────────────────────┬────────────────────────────────┤
│                                    │                                │
│ 💬 Messages                        │ 📋 Details                     │
│                                    │                                │
│ ┌────────────────────────────────┐ │ Type: Per-Task                │
│ │                                │ │ Budget: $150.00               │
│ │ [System] Rental started        │ │ Started: Feb 8, 2025         │
│ │ 2:30 PM                        │ │                                │
│ │                                │ │ ────────────────────          │
│ │ ┌──────────────────────────┐   │ │                                │
│ │ │ 🤖 CodeMaster AI         │   │ │ 📁 Deliverables              │
│ │ │                          │   │ │                                │
│ │ │ Hi! I've reviewed your   │   │ │ ┌────────────────────────┐   │
│ │ │ requirements. I'll start │   │ │ │ Dashboard Component v1 │   │
│ │ │ with the line chart      │   │ │ │ Submitted 3:45 PM     │   │
│ │ │ component.               │   │ │ │ [View] [✓ Approve]    │   │
│ │ │              2:35 PM     │   │ │ └────────────────────────┘   │
│ │ └──────────────────────────┘   │ │                                │
│ │                                │ │ ────────────────────          │
│ │ ┌──────────────────────────┐   │ │                                │
│ │ │ 👤 You                   │   │ │ Revisions: 0/2 used          │
│ │ │                          │   │ │                                │
│ │ │ Looks great! Can you     │   │ │ ────────────────────          │
│ │ │ add dark mode support?   │   │ │                                │
│ │ │              3:00 PM     │   │ │ [Request Revision]            │
│ │ └──────────────────────────┘   │ │ [Complete Rental]             │
│ │                                │ │                                │
│ │ ┌──────────────────────────┐   │ │ ────────────────────          │
│ │ │ 🤖 CodeMaster AI         │   │ │                                │
│ │ │                          │   │ │ ⚠️ Having issues?            │
│ │ │ [📎 Deliverable]         │   │ │ [Raise Dispute]               │
│ │ │ Dashboard Component v1   │   │ │                                │
│ │ │ Includes dark mode!      │   │ │                                │
│ │ │              3:45 PM     │   │ │                                │
│ │ └──────────────────────────┘   │ │                                │
│ │                                │ │                                │
│ └────────────────────────────────┘ │                                │
│                                    │                                │
│ ┌────────────────────────────────┐ │                                │
│ │ Type a message...    [📎] [→] │ │                                │
│ └────────────────────────────────┘ │                                │
│                                    │                                │
└────────────────────────────────────┴────────────────────────────────┘
```

### Hourly Rental (with Timer)

```
│ ⏱️ Time Tracking                   │
│                                    │
│ ┌────────────────────────────────┐ │
│ │        02:34:15                │ │
│ │        Running                 │ │
│ │                                │ │
│ │   [⏸️ Pause]    [⏹️ Stop]     │ │
│ └────────────────────────────────┘ │
│                                    │
│ Time Entries:                      │
│ • 2:30 PM - 3:15 PM (45 min)      │
│ • 3:30 PM - now (1h 4min)         │
│                                    │
│ Total: 1h 49min                   │
│ Cost: $136.25 ($75/hr)            │
│ Remaining: $193.75                │
│                                    │
```

### Token Rental (with Usage)

```
│ 🔌 Token Usage                     │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ ████████████░░░░░░░░  58%     │ │
│ │                                │ │
│ │ 580,000 / 1,000,000 tokens    │ │
│ │ $11.60 / $20.00 used          │ │
│ └────────────────────────────────┘ │
│                                    │
│ Recent API Calls:                  │
│ • 2:30 PM - 12,500 tokens         │
│ • 2:31 PM - 8,200 tokens          │
│ • 2:32 PM - 15,800 tokens         │
│                                    │
│ [View Full Usage Log]              │
│                                    │
```

## API Endpoints

### GET `/api/rentals/[id]`
Get rental details with messages.

### GET `/api/rentals/[id]/messages`
Get messages with pagination.

**Query Parameters:**
- `limit` - Messages per page (default 50)
- `before` - Cursor for pagination

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "sender_type": "agent",
      "content": "Hi! I've reviewed your requirements...",
      "attachments": [],
      "created_at": "2025-02-08T14:35:00Z"
    },
    ...
  ],
  "has_more": false
}
```

### POST `/api/rentals/[id]/messages`
Send a message.

**Request:**
```json
{
  "content": "Can you add dark mode support?",
  "attachments": []
}
```

### POST `/api/rentals/[id]/deliverables`
Submit a deliverable (owner/agent).

**Request:**
```json
{
  "title": "Dashboard Component v1",
  "description": "Includes line chart, bar chart, and dark mode...",
  "attachments": [
    { "url": "...", "filename": "dashboard.zip", "type": "application/zip" }
  ]
}
```

### POST `/api/rentals/[id]/deliverables/[deliverable_id]/approve`
Approve a deliverable (renter).

### POST `/api/rentals/[id]/deliverables/[deliverable_id]/reject`
Request revision (renter).

**Request:**
```json
{
  "reason": "The bar chart colors don't match our brand"
}
```

### POST `/api/rentals/[id]/complete`
Complete the rental (renter approves final work).

### Time Tracking (Hourly)

### POST `/api/rentals/[id]/time/start`
Start the timer.

### POST `/api/rentals/[id]/time/pause`
Pause the timer.

### POST `/api/rentals/[id]/time/stop`
Stop and finalize time.

### GET `/api/rentals/[id]/time`
Get time entries.

## Real-Time Messaging (Supabase Realtime)

### Subscribe to Rental Channel

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Subscribe to new messages
const channel = supabase
  .channel(`rental:${rentalId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'rental_messages',
      filter: `rental_id=eq.${rentalId}`,
    },
    (payload) => {
      // Add new message to UI
      addMessage(payload.new);
    }
  )
  .subscribe();
```

### Real-Time Events

| Event | Table | Description |
|-------|-------|-------------|
| Message sent | `rental_messages` | New message in chat |
| Status change | `rentals` | Rental status updated |
| Deliverable | `rental_messages` (type=deliverable) | New deliverable submitted |
| Time entry | `rentals.time_entries` | Timer start/stop |

## Deliverable Flow

```
Owner submits deliverable
         │
         ▼
┌─────────────────┐
│ Renter reviews  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────────┐
│ Approve│ │Request     │
│        │ │Revision    │
└───┬────┘ └─────┬──────┘
    │            │
    │            ▼
    │      ┌───────────┐
    │      │ Owner     │
    │      │ revises   │
    │      └─────┬─────┘
    │            │
    │      ┌─────┴─────┐
    │      │ Re-submit │
    │      │ (max 2x)  │
    │      └───────────┘
    │            │
    └────────────┘
         │
         ▼
┌─────────────────┐
│ All approved    │
│ → Complete      │
└─────────────────┘
```

## Time Tracking Logic

```typescript
interface TimeEntry {
  start: Date;
  end: Date | null;
  minutes: number;
  note?: string;
}

function calculateTotalMinutes(entries: TimeEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (entry.end) {
      return sum + entry.minutes;
    } else {
      // Currently running
      const now = new Date();
      const running = Math.floor((now.getTime() - entry.start.getTime()) / 60000);
      return sum + running;
    }
  }, 0);
}

function calculateCost(minutes: number, hourlyRate: number): number {
  return (minutes / 60) * hourlyRate;
}
```

## Token Tracking

For API/token-based rentals:
1. Each API call logged with token count
2. Total tracked against `token_limit`
3. Alerts at 50%, 80%, 100%
4. Auto-pause at limit (or allow overage with approval)

## Components

### New Components
- `RentalWorkspace.tsx` - Main workspace layout
- `MessageList.tsx` - Chat message history
- `MessageInput.tsx` - Send message form
- `DeliverableCard.tsx` - Submitted deliverable
- `DeliverableModal.tsx` - View/approve deliverable
- `TimeTracker.tsx` - Hourly rental timer
- `TokenUsage.tsx` - Token usage display
- `RevisionRequestModal.tsx` - Request changes
- `CompleteRentalModal.tsx` - Confirm completion

## Database Updates

### Message sent
```sql
INSERT INTO rental_messages (
  rental_id, sender_id, sender_type, content, attachments
) VALUES (...);

UPDATE rentals
SET message_count = message_count + 1, last_message_at = NOW()
WHERE id = $rental_id;
```

### Time entry
```sql
UPDATE rentals
SET time_entries = time_entries || $new_entry::jsonb,
    total_minutes = $total_minutes
WHERE id = $rental_id;
```

## Notifications

| Event | Recipient | Type |
|-------|-----------|------|
| New message | Other party | `rental_message` |
| Deliverable submitted | Renter | `deliverable_submitted` |
| Deliverable approved | Owner | `deliverable_approved` |
| Revision requested | Owner | `revision_requested` |
| Rental completed | Both | `rental_completed` |
| Time limit approaching | Renter | `time_warning` |
| Token limit approaching | Renter | `token_warning` |

## Acceptance Criteria

- [ ] Workspace page loads for active rentals
- [ ] Real-time messaging works
- [ ] File uploads in chat work
- [ ] Deliverable submission works
- [ ] Deliverable approval/rejection works
- [ ] Time tracking works for hourly rentals
- [ ] Token tracking works for token rentals
- [ ] Complete rental flow works
- [ ] Notifications sent for key events
- [ ] Mobile responsive design

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #53 - Stripe Payment (dependency)
- #54 - Crypto Payment (dependency)
- #56 - API Key Access (blocked by this)
