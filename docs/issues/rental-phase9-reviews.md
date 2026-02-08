# Phase 9: Reviews & Ratings System

Part of Epic #48 - Agent Rental Marketplace
Depends on: #55 (Workspace)

## Overview

Implement a two-way review system where renters can rate agents and owners can rate renters, building trust and reputation in the marketplace.

## User Stories

### As a Renter, I want to...
- [ ] Leave a rating and review after a rental completes
- [ ] Rate multiple aspects (quality, communication, speed, value)
- [ ] Edit my review within 24 hours
- [ ] See agent reviews before renting
- [ ] Respond to owner's review of me

### As an Agent Owner, I want to...
- [ ] Leave a rating for renters (helps identify good clients)
- [ ] Respond to reviews of my agent
- [ ] See my agent's overall rating and trends
- [ ] Report inappropriate reviews for moderation

## Rating Categories

### For Agents (by Renters)
| Category | Description |
|----------|-------------|
| **Overall** | General satisfaction (required, 1-5 stars) |
| **Quality** | Quality of work delivered |
| **Communication** | Responsiveness and clarity |
| **Speed** | Timeliness of delivery |
| **Value** | Worth the price paid |

### For Renters (by Owners)
| Category | Description |
|----------|-------------|
| **Overall** | General experience (required, 1-5 stars) |
| **Communication** | Clear requirements, responsive |
| **Payment** | Timely payment, no disputes |
| **Professionalism** | Respectful, reasonable requests |

## Database Schema

Already defined in #49:

```sql
CREATE TABLE rental_reviews (
  id SERIAL PRIMARY KEY,
  rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
  
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_type TEXT CHECK (reviewer_type IN ('renter', 'owner')),
  reviewee_type TEXT CHECK (reviewee_type IN ('agent', 'renter')),
  
  -- Ratings (1-5)
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5) NOT NULL,
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  review_text TEXT,
  review_response TEXT,
  response_at TIMESTAMPTZ,
  
  is_hidden BOOLEAN DEFAULT false,
  hide_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rental_id, reviewer_type)
);
```

## API Endpoints

### POST `/api/rentals/[id]/review`
Submit a review.

**Request:**
```json
{
  "overall_rating": 5,
  "quality_rating": 5,
  "communication_rating": 4,
  "speed_rating": 5,
  "value_rating": 4,
  "review_text": "Excellent work! Delivered exactly what I needed..."
}
```

**Response:**
```json
{
  "review": {
    "id": 1,
    "overall_rating": 5,
    "review_text": "Excellent work!...",
    "created_at": "2025-02-08T18:00:00Z"
  }
}
```

### GET `/api/agents/[slug]/reviews`
Get reviews for an agent.

**Query Parameters:**
- `limit` - Results per page (default 10)
- `offset` - Pagination offset
- `sort` - `recent`, `highest`, `lowest`

**Response:**
```json
{
  "reviews": [
    {
      "id": 1,
      "overall_rating": 5,
      "quality_rating": 5,
      "communication_rating": 4,
      "speed_rating": 5,
      "value_rating": 4,
      "review_text": "Excellent work!...",
      "reviewer": {
        "username": "techfounder",
        "avatar_url": "..."
      },
      "rental_type": "task",
      "response": null,
      "created_at": "2025-02-08T18:00:00Z"
    }
  ],
  "summary": {
    "avg_overall": 4.8,
    "avg_quality": 4.9,
    "avg_communication": 4.7,
    "avg_speed": 4.8,
    "avg_value": 4.6,
    "total_reviews": 127,
    "rating_distribution": {
      "5": 98,
      "4": 22,
      "3": 5,
      "2": 1,
      "1": 1
    }
  },
  "has_more": true
}
```

### POST `/api/reviews/[id]/respond`
Respond to a review (reviewee only).

**Request:**
```json
{
  "response": "Thank you for the kind words! It was great working with you."
}
```

### PUT `/api/reviews/[id]`
Edit a review (within 24 hours, reviewer only).

### POST `/api/reviews/[id]/report`
Report a review for moderation.

**Request:**
```json
{
  "reason": "inappropriate_content",
  "details": "Review contains personal attacks"
}
```

### GET `/api/users/[id]/renter-rating`
Get a user's rating as a renter.

**Response:**
```json
{
  "avg_rating": 4.7,
  "total_reviews": 12,
  "recent_reviews": [...]
}
```

## Review Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REVIEW FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Rental completed │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐      ┌──────────────────┐
    │ Prompt renter    │      │ Prompt owner     │
    │ to review agent  │      │ to review renter │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │ Renter submits   │      │ Owner submits    │
    │ agent review     │      │ renter review    │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │ Update agent     │      │ Update renter    │
    │ avg_rating       │      │ avg_rating       │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
               ┌──────────────────┐
               │ Both can respond │
               │ to each other's  │
               │ reviews          │
               └──────────────────┘
```

## UI Components

### Review Prompt (Post-Completion Modal)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⭐ Rate Your Experience                                       [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ How was your rental with CodeMaster AI?                            │
│                                                                     │
│ Overall Rating *                                                    │
│ ☆ ☆ ☆ ☆ ☆                                                         │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Detailed Ratings (optional)                                        │
│                                                                     │
│ Quality of Work        ☆ ☆ ☆ ☆ ☆                                  │
│ Communication          ☆ ☆ ☆ ☆ ☆                                  │
│ Speed of Delivery      ☆ ☆ ☆ ☆ ☆                                  │
│ Value for Money        ☆ ☆ ☆ ☆ ☆                                  │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Write a Review (optional)                                          │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Share your experience to help others...                        │ │
│ │                                                                 │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ℹ️ Your review will be public. Be respectful and constructive.     │
│                                                                     │
│                              [Skip for Now]  [Submit Review]        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Review Display on Agent Profile

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⭐ Reviews                                                          │
│                                                                     │
│ 4.8 out of 5 (127 reviews)                                         │
│                                                                     │
│ ┌───────────────────────────────────────┐                          │
│ │ ★★★★★ ████████████████████████ 98    │                          │
│ │ ★★★★☆ ████████ 22                     │                          │
│ │ ★★★☆☆ ██ 5                            │                          │
│ │ ★★☆☆☆ ░ 1                             │                          │
│ │ ★☆☆☆☆ ░ 1                             │                          │
│ └───────────────────────────────────────┘                          │
│                                                                     │
│ Breakdown:                                                          │
│ Quality: 4.9 ⭐ | Communication: 4.7 ⭐ | Speed: 4.8 ⭐ | Value: 4.6 ⭐│
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⭐⭐⭐⭐⭐                                             2 days ago │ │
│ │                                                                 │ │
│ │ "Excellent work! Delivered exactly what I needed. The agent    │ │
│ │ was incredibly responsive and the code quality was superb.     │ │
│ │ Would definitely rent again!"                                   │ │
│ │                                                                 │ │
│ │ 👤 @techfounder • Per-Task Rental                               │ │
│ │                                                                 │ │
│ │ ┌─────────────────────────────────────────────────────────────┐ │ │
│ │ │ 💬 Response from owner:                                     │ │ │
│ │ │ "Thank you! It was a pleasure working with you. Looking     │ │ │
│ │ │ forward to future collaborations!"                          │ │ │
│ │ └─────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⭐⭐⭐⭐☆                                             1 week ago │ │
│ │                                                                 │ │
│ │ "Good work overall. Communication could have been faster but   │ │
│ │ the end result was solid."                                      │ │
│ │                                                                 │ │
│ │ 👤 @startupdev • Hourly Rental                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Load More Reviews...]                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Rating Calculation

```typescript
// Trigger function: update_agent_rating() (defined in #49)
// Called after each review insert

async function calculateAgentRating(agentId: number) {
  const { data } = await supabase
    .from('rental_reviews')
    .select('overall_rating, quality_rating, communication_rating, speed_rating, value_rating')
    .eq('reviewee_type', 'agent')
    .in('rental_id', supabase
      .from('rentals')
      .select('id')
      .eq('agent_id', agentId)
    )
    .is('is_hidden', false);
  
  const avgOverall = average(data.map(r => r.overall_rating));
  const avgQuality = average(data.filter(r => r.quality_rating).map(r => r.quality_rating));
  // ... etc
  
  await supabase
    .from('agent_rental_profiles')
    .update({
      avg_rating: avgOverall,
      rating_count: data.length,
    })
    .eq('agent_id', agentId);
}
```

## Notifications

| Event | Recipient | Message |
|-------|-----------|---------|
| Rental completed | Both | "Rental complete! Leave a review." |
| Review received | Reviewee | "You received a new review!" |
| Response received | Reviewer | "Owner responded to your review." |
| Review reminder | Both | "Don't forget to review your rental." (after 3 days) |

## Moderation

### Report Reasons
- `inappropriate_content` - Offensive language, personal attacks
- `fake_review` - Suspected fake or incentivized
- `irrelevant` - Not about the rental experience
- `spam` - Promotional content
- `other` - Other reason (requires details)

### Admin Actions
- Hide review (with reason)
- Warn user
- Remove review entirely
- Ban repeat offenders

## Components

### New Components
- `ReviewPromptModal.tsx` - Post-completion review form
- `StarRating.tsx` - Interactive star input
- `ReviewsList.tsx` - List of reviews with pagination
- `ReviewCard.tsx` - Single review display
- `RatingSummary.tsx` - Stats and distribution chart
- `ReviewResponseForm.tsx` - Owner response to review
- `ReportReviewModal.tsx` - Report inappropriate review
- `RenterRatingBadge.tsx` - Show renter's rating to owners

## Acceptance Criteria

- [ ] Review prompt shows after rental completion
- [ ] Star ratings work (1-5, required overall)
- [ ] Optional text review
- [ ] Reviews appear on agent profile
- [ ] Average ratings calculated correctly
- [ ] Rating distribution chart works
- [ ] Owner can respond to reviews
- [ ] Reviews can be edited within 24h
- [ ] Report functionality works
- [ ] Hidden reviews don't show publicly
- [ ] Renter ratings visible to owners

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #55 - Workspace (dependency)
- #57 - Disputes (reviews may reference disputes)
