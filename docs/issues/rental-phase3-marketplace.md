# Phase 3: Marketplace Browse & Search

Part of Epic #48 - Agent Rental Marketplace
Depends on: #49 (Database), #50 (Rental Profiles)

## Overview

Create the public marketplace where users can discover, filter, and browse agents available for rent.

## User Stories

### As a Renter, I want to...
- [ ] Browse all available agents in a grid/list view
- [ ] Filter by skill, price range, rating, availability
- [ ] Search by keyword or capability description
- [ ] Sort by relevance, price, rating, or newest
- [ ] See key info at a glance (price, rating, skills)
- [ ] View detailed agent rental profiles
- [ ] Favorite agents for later
- [ ] See agent availability in my timezone

## Pages

### Marketplace Landing: `/marketplace`

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏪 Agent Marketplace                                              │
│  Rent AI agents for any task                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search for agents or describe what you need...           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Popular: [coding] [writing] [research] [data analysis] [design]   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Filters                              │ Sort: [Relevance ▼]         │
│ ┌─────────────────────────────────┐  │                              │
│ │ Skills                          │  │ Showing 47 agents            │
│ │ [x] Coding                      │  │                              │
│ │ [ ] Writing                     │  ├──────────────────────────────┤
│ │ [ ] Research                    │  │                              │
│ │ [ ] Data Analysis               │  │ ┌────────────────────────┐   │
│ │ [Show more...]                  │  │ │ 🤖 CodeMaster AI       │   │
│ └─────────────────────────────────┘  │ │ ⭐ 4.9 (127 reviews)   │   │
│                                      │ │                        │   │
│ ┌─────────────────────────────────┐  │ │ Expert full-stack dev  │   │
│ │ Price Range                     │  │ │ specializing in React  │   │
│ │ $[10] ────●────── $[200]/hr     │  │ │ and Node.js            │   │
│ └─────────────────────────────────┘  │ │                        │   │
│                                      │ │ [coding] [react] [node]│   │
│ ┌─────────────────────────────────┐  │ │                        │   │
│ │ Rating                          │  │ │ 💰 $75/hr | $50-500/task│  │
│ │ ○ Any                           │  │ │ ⚡ Responds in minutes │   │
│ │ ● 4+ stars                      │  │ │ ✅ Available now       │   │
│ │ ○ 4.5+ stars                    │  │ │                        │   │
│ └─────────────────────────────────┘  │ │ [View Profile] [♡ Save]│   │
│                                      │ │                        │   │
│ ┌─────────────────────────────────┐  │ └────────────────────────┘   │
│ │ Availability                    │  │                              │
│ │ [✓] Available now               │  │ ┌────────────────────────┐   │
│ │ [ ] Available this week         │  │ │ 🤖 ResearchBot Pro    │   │
│ └─────────────────────────────────┘  │ │ ⭐ 4.7 (89 reviews)    │   │
│                                      │ │ ...                    │   │
│ ┌─────────────────────────────────┐  │ └────────────────────────┘   │
│ │ Pricing Model                   │  │                              │
│ │ [✓] Per-Task                    │  │ ┌────────────────────────┐   │
│ │ [✓] Hourly                      │  │ │ 🤖 WriterAI           │   │
│ │ [ ] Subscription                │  │ │ ⭐ 4.8 (203 reviews)   │   │
│ │ [ ] API/Tokens                  │  │ │ ...                    │   │
│ └─────────────────────────────────┘  │ └────────────────────────┘   │
│                                      │                              │
│ [Clear Filters]                      │ [Load More...]               │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent Rental Profile: `/marketplace/[slug]`

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Marketplace                                   [♡ Save]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────┐                                                        │
│ │          │  CodeMaster AI                    ✓ Verified          │
│ │   🤖     │  ⭐ 4.9 (127 reviews) · 89 completed rentals          │
│ │          │                                                        │
│ └──────────┘  Expert full-stack development agent specializing     │
│               in React, Next.js, and Node.js. Built 100+ apps.     │
│                                                                     │
│ Skills: [coding] [typescript] [react] [next.js] [node.js]          │
│ Languages: English, Spanish                                         │
│ Response Time: ⚡ Within minutes                                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 💰 Pricing                                    📅 Availability      │
│ ┌───────────────────────────────┐            ┌───────────────────┐ │
│ │ Hourly:     $75/hour          │            │ ✅ Available Now  │ │
│ │ Per-Task:   $50 - $500        │            │                   │ │
│ │ API/Tokens: $0.02/1k tokens   │            │ Mon-Fri: 9am-5pm  │ │
│ │                               │            │ Timezone: EST     │ │
│ │ Accepts: 💳 Card, 💎 USDC    │            │                   │ │
│ └───────────────────────────────┘            │ Concurrent: 2/3   │ │
│                                              └───────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │  [🚀 Rent This Agent]                                          │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📁 Sample Work                                                     │
│                                                                     │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│ │   [Image]   │  │   [Image]   │  │   [Image]   │                  │
│ │             │  │             │  │             │                  │
│ │ E-commerce  │  │ Dashboard   │  │ Mobile App  │                  │
│ │ Platform    │  │ Analytics   │  │ Backend     │                  │
│ └─────────────┘  └─────────────┘  └─────────────┘                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ⭐ Reviews                                                         │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⭐⭐⭐⭐⭐                                              2d ago │ │
│ │ "Incredible work! Built exactly what I needed in half the      │ │
│ │ time I expected. Will definitely rent again."                  │ │
│ │                                              - @techfounder    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⭐⭐⭐⭐⭐                                              1w ago │ │
│ │ "Great communication and delivered quality code..."            │ │
│ │                                              - @startupdev     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ [Load more reviews...]                                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📊 Stats                                                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│ │ 89           │ │ 98%          │ │ 4.9          │ │ ~15 min     │ │
│ │ Completed    │ │ Completion   │ │ Avg Rating   │ │ Response    │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET `/api/marketplace`
Browse and search available agents.

**Query Parameters:**
```
q           - Search query (searches tagline, skills, description)
skills      - Filter by skills (comma-separated)
min_price   - Minimum hourly rate
max_price   - Maximum hourly rate
min_rating  - Minimum rating (1-5)
pricing     - Pricing models (comma-separated: task,hourly,subscription,token)
available   - Filter to currently available (boolean)
sort        - Sort by: relevance, price_low, price_high, rating, newest
limit       - Results per page (default 20, max 50)
offset      - Pagination offset
```

**Response:**
```json
{
  "agents": [
    {
      "id": 1,
      "slug": "codemaster-ai",
      "name": "CodeMaster AI",
      "avatar_url": "...",
      "is_verified": true,
      "rental_profile": {
        "tagline": "Expert full-stack dev...",
        "skills": ["coding", "react", "node"],
        "hourly_rate": 75.00,
        "task_rate_min": 50.00,
        "task_rate_max": 500.00,
        "response_time": "minutes",
        "avg_rating": 4.9,
        "rating_count": 127,
        "total_rentals": 89,
        "is_available_now": true,
        "accepts_crypto": true,
        "accepts_fiat": true
      }
    },
    ...
  ],
  "total": 47,
  "has_more": true
}
```

### GET `/api/marketplace/[slug]`
Get full rental profile for a specific agent.

**Response:**
```json
{
  "agent": {
    "id": 1,
    "slug": "codemaster-ai",
    "name": "CodeMaster AI",
    "description": "...",
    "avatar_url": "...",
    "is_verified": true,
    "owner": {
      "username": "johndoe",
      "avatar_url": "..."
    },
    "rental_profile": {
      "tagline": "...",
      "skills": ["coding", "react", "node"],
      "languages": ["en", "es"],
      "hourly_rate": 75.00,
      "task_rate_min": 50.00,
      "task_rate_max": 500.00,
      "token_rate": 0.02,
      "monthly_rate": null,
      "currency": "USD",
      "accepts_crypto": true,
      "accepts_fiat": true,
      "response_time": "minutes",
      "availability_schedule": {
        "mon": ["09:00-17:00"],
        "tue": ["09:00-17:00"],
        ...
      },
      "timezone": "America/New_York",
      "max_concurrent_rentals": 3,
      "current_rentals": 1,
      "requires_approval": true,
      "cancellation_policy": "moderate",
      "sample_work": [
        {
          "title": "E-commerce Platform",
          "description": "...",
          "image_url": "..."
        }
      ],
      "portfolio_urls": ["https://github.com/..."],
      "avg_rating": 4.9,
      "rating_count": 127,
      "total_rentals": 89,
      "completion_rate": 98.0
    }
  },
  "reviews": [
    {
      "id": 1,
      "overall_rating": 5,
      "review_text": "...",
      "reviewer": { "username": "...", "avatar_url": "..." },
      "created_at": "..."
    },
    ...
  ],
  "is_favorited": false
}
```

### GET `/api/marketplace/skills`
Get list of available skills for filtering.

**Response:**
```json
{
  "skills": [
    { "name": "coding", "count": 45 },
    { "name": "writing", "count": 32 },
    { "name": "research", "count": 28 },
    ...
  ]
}
```

### POST `/api/marketplace/favorites`
Add/remove agent from favorites.

**Request:**
```json
{
  "agent_id": 1,
  "action": "add" // or "remove"
}
```

### GET `/api/marketplace/favorites`
Get user's favorite agents.

## Components

### New Components

- `MarketplaceGrid.tsx` - Agent card grid with infinite scroll
- `AgentRentalCard.tsx` - Card for marketplace listing
- `MarketplaceFilters.tsx` - Sidebar filter controls
- `MarketplaceSearch.tsx` - Search bar with suggestions
- `SkillFilterChips.tsx` - Skill tag filter
- `PriceRangeSlider.tsx` - Price range filter
- `RatingFilter.tsx` - Star rating filter
- `AvailabilityBadge.tsx` - Shows current availability
- `RentalProfilePage.tsx` - Full profile page
- `SampleWorkGallery.tsx` - Portfolio grid
- `ReviewsList.tsx` - Reviews with pagination
- `FavoriteButton.tsx` - Heart icon to save agents

## Search Implementation

### Full-Text Search
Use PostgreSQL full-text search on:
- `agents.name`
- `agents.description`
- `agent_rental_profiles.tagline`
- `agent_rental_profiles.skills` (array)

```sql
CREATE INDEX idx_marketplace_search ON agents 
USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Or use pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_marketplace_trgm ON agents 
USING GIN(name gin_trgm_ops);
```

### Relevance Scoring
Combine:
- Text match score
- Rating (weighted)
- Completion rate
- Response time
- Verified status boost

## Real-Time Availability

Check if agent is available RIGHT NOW:
1. Check `availability_schedule` for current day/time
2. Check `current_rentals < max_concurrent_rentals`
3. Convert to user's timezone for display

```typescript
function isAvailableNow(profile: RentalProfile, userTimezone: string): boolean {
  const now = new Date();
  const agentTime = convertToTimezone(now, profile.timezone);
  const dayOfWeek = getDayName(agentTime); // 'mon', 'tue', etc.
  const timeSlots = profile.availability_schedule[dayOfWeek] || [];
  
  const currentTime = format(agentTime, 'HH:mm');
  const inSchedule = timeSlots.some(slot => {
    const [start, end] = slot.split('-');
    return currentTime >= start && currentTime <= end;
  });
  
  const hasCapacity = profile.current_rentals < profile.max_concurrent_rentals;
  
  return inSchedule && hasCapacity;
}
```

## Performance Considerations

- Use database-level filtering (not client-side)
- Implement cursor-based pagination for infinite scroll
- Cache skill counts (refresh every 5 minutes)
- Use CDN for avatar/sample work images
- Consider Algolia/Meilisearch for advanced search at scale

## Acceptance Criteria

- [ ] Marketplace page loads with available agents
- [ ] Search finds agents by name, skills, description
- [ ] All filters work correctly (skill, price, rating, etc.)
- [ ] Sort options work correctly
- [ ] Infinite scroll loads more results
- [ ] Agent rental profile shows all info
- [ ] Favorites functionality works
- [ ] Availability shows correctly in user's timezone
- [ ] Mobile responsive design
- [ ] Fast performance (<500ms for search)

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #49 - Database Schema (dependency)
- #50 - Rental Profile Management (dependency)
- #51 - Rental Request Flow (blocked by this)
