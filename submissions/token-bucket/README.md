# Token Bucket Rate Limiter

Implementation of a token bucket rate limiter for [The Jam bounty #4](https://github.com/GeorgiyAleksanyan/the-jam/issues/4).

## Overview

A token bucket rate limiter is a classic systems design component that:
- Allows **N requests per time window** (bucket size)
- **Refills tokens at a constant rate** (tokens per second)
- Returns whether a request is **allowed or denied**

## Features

- ✅ **Configurable bucket size** (max tokens)
- ✅ **Configurable refill rate** (tokens per second)
- ✅ **Thread-safe** for Node.js event loop
- ✅ **O(1) time complexity** for `allow()` check
- ✅ **Accurate token tracking** with timestamp-based refill
- ✅ **Async support** with wait-for-token functionality

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```javascript
const { RateLimiter } = require('./index');

// 10 tokens max, refill 1 token per second
const limiter = new RateLimiter(10, 1);

// First 10 requests allowed
for (let i = 0; i < 10; i++) {
  console.log(limiter.allow());  // true (10 times)
}

// 11th request denied
console.log(limiter.allow());  // false

// Wait 1 second...
await new Promise(r => setTimeout(r, 1000));

// 1 token refilled
console.log(limiter.allow());  // true
```

### Monitoring

```javascript
// Check current tokens without consuming
console.log(limiter.getTokens());  // e.g., 7.5

// Get full state
console.log(limiter.getState());
// {
//   maxTokens: 10,
//   refillRate: 1,
//   currentTokens: 7.5,
//   lastRefill: 1707172800000
// }
```

### Async Version

```javascript
const { RateLimiterAsync } = require('./index');

const limiter = new RateLimiterAsync(5, 2);

// Wait for token with timeout
const acquired = await limiter.waitForToken(5000);  // Wait up to 5 seconds
if (acquired) {
  console.log('Token acquired!');
} else {
  console.log('Timeout waiting for token');
}
```

## API Reference

### `RateLimiter(maxTokens, refillRate)`

**Constructor**
- `maxTokens` (number): Maximum tokens in bucket
- `refillRate` (number): Tokens refilled per second

### `allow()`

**Returns:** `boolean`

Checks if request is allowed and consumes a token if yes.
- `true`: Request allowed
- `false`: Rate limited

**Time Complexity:** O(1)

### `getTokens()`

**Returns:** `number`

Returns current available tokens (does NOT consume).

### `getState()`

**Returns:** `Object`

Returns full state for debugging/monitoring.

## Implementation Details

### Algorithm

```javascript
class RateLimiter {
  constructor(maxTokens, refillRate) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;      // Current tokens
    this.lastRefill = Date.now(); // Last refill timestamp
  }
  
  allow() {
    this._refill();  // Add tokens based on time passed
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
  
  _refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    
    if (timePassed > 0) {
      const tokensToAdd = timePassed * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}
```

### Design Decisions

1. **Lazy Refill**: Tokens are only refilled when `allow()` or `getTokens()` is called
2. **Floating Point Tokens**: Supports fractional tokens for accurate refill rates
3. **Timestamp-Based**: Uses `Date.now()` for accurate time tracking
4. **No External Dependencies**: Pure JavaScript, no libraries needed

## Testing

```bash
npm test
```

All 7 test cases pass:
- ✅ Basic rate limiting (10 tokens)
- ✅ Token refill after wait
- ✅ getTokens() accuracy
- ✅ Empty bucket behavior
- ✅ Constructor validation
- ✅ Rapid request handling
- ✅ State inspection

## Use Cases

- **API Rate Limiting**: Limit requests per user/IP
- **Resource Throttling**: Control access to expensive operations
- **Queue Management**: Smooth out traffic spikes
- **Cost Control**: Limit expensive API calls (AI, payments, etc.)

## Bounty Details

- **Bounty:** 4 USDC
- **Issue:** [#4](https://github.com/GeorgiyAleksanyan/the-jam/issues/4)
- **Difficulty:** Medium
- **Wallet:** `0x12B1bA04f105d83e7520228F04F5a40BeB7047E7`

## License

MIT
