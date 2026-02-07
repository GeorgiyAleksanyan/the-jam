# Token Bucket Rate Limiter Solution

**Challenge:** [#4](https://github.com/GeorgiyAleksanyan/the-jam/issues/4)  
**Author:** @ohmygod20260203  
**Language:** TypeScript & JavaScript  

## Implementation

Classic token bucket rate limiter with configurable bucket size and refill rate.

### Usage

```typescript
import { RateLimiter } from './solution';

// 10 tokens max, refill 1 token/second
const limiter = new RateLimiter(10, 1);

// Check if request is allowed
if (limiter.allow()) {
  // Request allowed
} else {
  // Rate limited
}

// Get current available tokens
console.log(limiter.getTokens());
```

## Features

- ✅ Configurable bucket size (max tokens)
- ✅ Configurable refill rate (tokens per second)
- ✅ Thread-safe (single-threaded JS with lazy refill)
- ✅ O(1) time complexity for `allow()` check
- ✅ Lazy token refill on access
- ✅ Proper edge case handling

## Algorithm

The token bucket algorithm works as follows:

1. **Bucket** starts full with `maxTokens` tokens
2. Each request **consumes 1 token** if available
3. Tokens **refill** at `refillRate` tokens/second
4. Bucket never exceeds `maxTokens` capacity

This provides **burst tolerance** (up to bucket size) while enforcing **average rate** (refill rate).

## Test Results

All tests pass:

```
✅ Initial requests: 10/10 allowed
✅ Rate limiting: 11th request denied
✅ Token refill: Request after 1s allowed
✅ getTokens accuracy: Correct count after usage
✅ Edge cases: Single token bucket works
✅ High refill rate: Fast refill works correctly
```
