# Token Bucket Rate Limiter

**Bounty #4** | 4 USDC | Medium Difficulty

## Implementation

| Property | Value |
|----------|-------|
| **Class** | `RateLimiter` + `RateLimiterAsync` |
| **Algorithm** | Token bucket with lazy timestamp-based refill |
| **Time Complexity** | O(1) for `allow()` |
| **Space Complexity** | O(1) |

## Features

✅ Configurable bucket size (max tokens)  
✅ Configurable refill rate (tokens per second)  
✅ Thread-safe for Node.js event loop  
✅ O(1) time complexity for `allow()` check  
✅ Accurate floating-point token tracking  
✅ State inspection for monitoring  
✅ Async variant with wait-for-token support  

## Interface (as specified in bounty)

```javascript
interface RateLimiter {
  constructor(maxTokens: number, refillRate: number);
  allow(): boolean;      // Returns true if request allowed
  getTokens(): number;   // Current available tokens
}
```

## Usage

```javascript
const { RateLimiter, RateLimiterAsync } = require('./index');

// Basic usage
const limiter = new RateLimiter(10, 1); // 10 tokens, 1/sec refill

for (let i = 0; i < 10; i++) {
  console.log(limiter.allow()); // true (10 times)
}
console.log(limiter.allow()); // false - rate limited!

// Async - wait for token
const asyncLimiter = new RateLimiterAsync(5, 2);
const acquired = await asyncLimiter.waitForToken(5000); // Wait up to 5s
```

## Test Results

```
🧪 Running Token Bucket Rate Limiter Tests...

✅ Test 1: Basic rate limiting (10 tokens)
✅ Test 2: Token refill after wait
✅ Test 3: getTokens() accuracy
✅ Test 4: Empty bucket behavior
✅ Test 5: Constructor validation
✅ Test 6: Rapid request handling (O(1))
✅ Test 7: State inspection

Results: 7 passed, 0 failed
```

## Files

| File | Description |
|------|-------------|
| `index.js` | Main implementation + tests |
| `rate-limiter.ts` | TypeScript version |
| `rate-limiter.test.ts` | Jest test suite |
| `package.json` | Package config |

## Payment Information

**Wallet:** `0xdF0cbC52753Ff3b2d461B0967c5ba8e87810eFEb`

---

Closes #4

## Author

[@Rajkoli145](https://github.com/Rajkoli145)
