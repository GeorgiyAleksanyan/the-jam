/**
 * Token Bucket Rate Limiter
 * 
 * Challenge: https://github.com/GeorgiyAleksanyan/the-jam/issues/4
 * Author: @ohmygod20260203
 * 
 * A classic rate limiting algorithm that allows N requests per time window
 * with tokens refilling at a constant rate.
 */

class RateLimiter {
  /**
   * Create a new rate limiter
   * @param {number} maxTokens - Maximum number of tokens (bucket size)
   * @param {number} refillRate - Number of tokens to add per second
   */
  constructor(maxTokens, refillRate) {
    if (maxTokens <= 0) {
      throw new Error("maxTokens must be positive");
    }
    if (refillRate < 0) {
      throw new Error("refillRate cannot be negative");
    }
    
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens; // Start with full bucket
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   * Called lazily on each operation
   */
  refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Check if a request is allowed and consume a token
   * @returns {boolean} true if request allowed, false if rate limited
   */
  allow() {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Get current available tokens
   * @returns {number} Number of tokens currently available
   */
  getTokens() {
    this.refill();
    return this.tokens;
  }

  /**
   * Get maximum token capacity
   */
  getMaxTokens() {
    return this.maxTokens;
  }

  /**
   * Get refill rate (tokens per second)
   */
  getRefillRate() {
    return this.refillRate;
  }

  /**
   * Reset the limiter to full capacity
   */
  reset() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

// Async helper for tests
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test suite
async function runTests() {
  console.log("Testing Token Bucket Rate Limiter\n");
  let allPassed = true;
  
  // Test 1: Basic usage
  console.log("Test 1: Initial requests");
  const limiter = new RateLimiter(10, 1);
  
  let allowedCount = 0;
  for (let i = 0; i < 10; i++) {
    if (limiter.allow()) allowedCount++;
  }
  const test1 = allowedCount === 10;
  console.log(`Allowed ${allowedCount}/10 initial requests: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  if (!test1) allPassed = false;
  
  // Test 2: Rate limiting kicks in
  console.log("\nTest 2: Rate limiting");
  const denied = !limiter.allow();
  console.log(`11th request denied: ${denied ? '✅ PASS' : '❌ FAIL'}`);
  if (!denied) allPassed = false;
  
  // Test 3: Token refill
  console.log("\nTest 3: Token refill (waiting 1.1 seconds)");
  await sleep(1100);
  const allowedAfterWait = limiter.allow();
  console.log(`Request after wait allowed: ${allowedAfterWait ? '✅ PASS' : '❌ FAIL'}`);
  if (!allowedAfterWait) allPassed = false;
  
  // Test 4: getTokens accuracy
  console.log("\nTest 4: getTokens accuracy");
  const limiter2 = new RateLimiter(5, 0);
  limiter2.allow(); // Use one token
  limiter2.allow(); // Use another
  const tokens = limiter2.getTokens();
  const test4 = tokens === 3;
  console.log(`Tokens after 2 uses (expected 3): ${test4 ? '✅ PASS' : '❌ FAIL'} (got ${tokens})`);
  if (!test4) allPassed = false;
  
  // Test 5: Edge cases
  console.log("\nTest 5: Edge cases");
  const limiter3 = new RateLimiter(1, 0);
  const first = limiter3.allow();
  const second = limiter3.allow();
  const test5 = first && !second;
  console.log(`Single token bucket: first=${first}, second=${second}: ${test5 ? '✅ PASS' : '❌ FAIL'}`);
  if (!test5) allPassed = false;
  
  // Test 6: High refill rate
  console.log("\nTest 6: High refill rate");
  const limiter4 = new RateLimiter(10, 100); // 100 tokens per second
  for (let i = 0; i < 10; i++) limiter4.allow();
  await sleep(100); // Wait 0.1 seconds, should get ~10 tokens back
  const tokensAfterRefill = Math.floor(limiter4.getTokens());
  const test6 = tokensAfterRefill >= 9;
  console.log(`Tokens after high-rate refill (expected ~10): ${test6 ? '✅ PASS' : '❌ FAIL'} (got ${tokensAfterRefill})`);
  if (!test6) allPassed = false;
  
  console.log(`\nAll tests: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { RateLimiter };
