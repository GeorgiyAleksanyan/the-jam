/**
 * Token Bucket Rate Limiter - Bounty Submission for The Jam
 * 
 * Implements a token bucket rate limiter — a classic systems design component.
 * 
 * Bounty: 4 USDC
 * GitHub: https://github.com/GeorgiyAleksanyan/the-jam/issues/4
 * Wallet: 0x12B1bA04f105d83e7520228F04F5a40BeB7047E7
 */

/**
 * Token Bucket Rate Limiter
 * 
 * Allows N requests per time window with constant token refill rate.
 * Thread-safe for single-threaded JavaScript (Node.js event loop).
 * 
 * @param {number} maxTokens - Maximum tokens in bucket (bucket size)
 * @param {number} refillRate - Tokens refilled per second
 */
class RateLimiter {
  constructor(maxTokens, refillRate) {
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
      throw new Error('maxTokens must be a positive number');
    }
    if (!Number.isFinite(refillRate) || refillRate <= 0) {
      throw new Error('refillRate must be a positive number');
    }
    
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;  // Start with full bucket
    this.lastRefill = Date.now();
  }
  
  /**
   * Check if request is allowed and consume a token if yes.
   * 
   * @returns {boolean} - true if request allowed, false if rate limited
   * @timeComplexity O(1)
   */
  allow() {
    this._refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }
  
  /**
   * Get current available tokens (for monitoring/testing).
   * Does NOT consume tokens.
   * 
   * @returns {number} - Current token count
   */
  getTokens() {
    this._refill();
    return this.tokens;
  }
  
  /**
   * Internal: Refill tokens based on time elapsed.
   * O(1) time complexity.
   */
  _refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;  // Convert to seconds
    
    if (timePassed > 0) {
      const tokensToAdd = timePassed * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  /**
   * Get current rate limiter state (for debugging).
   * @returns {Object} - Current state
   */
  getState() {
    return {
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      currentTokens: this.getTokens(),
      lastRefill: this.lastRefill
    };
  }
}

// Alternative: Async version with sleep support for testing
class RateLimiterAsync extends RateLimiter {
  /**
   * Async version of allow with optional delay simulation
   */
  async allowAsync() {
    return this.allow();
  }
  
  /**
   * Wait until a token is available (blocking-style for async).
   * @param {number} timeoutMs - Max time to wait (optional)
   * @returns {Promise<boolean>} - true if token acquired, false if timeout
   */
  async waitForToken(timeoutMs = null) {
    const startTime = Date.now();
    
    while (!this.allow()) {
      if (timeoutMs && (Date.now() - startTime) > timeoutMs) {
        return false;  // Timeout
      }
      await sleep(10);  // Small delay to prevent busy-waiting
    }
    
    return true;
  }
}

/**
 * Utility: Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export both classes
module.exports = { RateLimiter, RateLimiterAsync, sleep };

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
  console.log('Running Token Bucket Rate Limiter Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Basic functionality - allow first N requests
  try {
    const limiter = new RateLimiter(10, 1);  // 10 tokens, 1/sec refill
    
    for (let i = 0; i < 10; i++) {
      if (!limiter.allow()) {
        throw new Error(`Request ${i + 1} should be allowed`);
      }
    }
    
    // 11th request should be denied
    if (limiter.allow()) {
      throw new Error('11th request should be denied');
    }
    
    console.log('✅ Test 1: Basic rate limiting (10 tokens)');
    passed++;
  } catch (err) {
    console.log(`❌ Test 1: ${err.message}`);
    failed++;
  }
  
  // Test 2: Token refill after wait
  try {
    const limiter = new RateLimiter(10, 10);  // 10 tokens, 10/sec = 1 every 100ms
    
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      limiter.allow();
    }
    
    // Should be denied now
    if (limiter.allow()) {
      throw new Error('Should be rate limited after consuming all tokens');
    }
    
    // Wait 110ms for 1 token to refill
    await sleep(110);
    
    // Should allow 1 request now
    if (!limiter.allow()) {
      throw new Error('Should allow request after refill');
    }
    
    // Next one should be denied again
    if (limiter.allow()) {
      throw new Error('Should be denied after consuming refilled token');
    }
    
    console.log('✅ Test 2: Token refill after wait');
    passed++;
  } catch (err) {
    console.log(`❌ Test 2: ${err.message}`);
    failed++;
  }
  
  // Test 3: getTokens() accuracy
  try {
    const limiter = new RateLimiter(5, 2);  // 5 tokens, 2/sec
    
    // Consume 3 tokens
    limiter.allow();
    limiter.allow();
    limiter.allow();
    
    // Should have ~2 tokens left
    const tokens = limiter.getTokens();
    if (tokens < 1.9 || tokens > 2.1) {
      throw new Error(`Expected ~2 tokens, got ${tokens}`);
    }
    
    console.log('✅ Test 3: getTokens() accuracy');
    passed++;
  } catch (err) {
    console.log(`❌ Test 3: ${err.message}`);
    failed++;
  }
  
  // Test 4: Edge case - zero refill rate behavior
  try {
    const limiter = new RateLimiter(3, 0.1);  // 3 tokens, slow refill
    
    // Consume all
    limiter.allow();
    limiter.allow();
    limiter.allow();
    
    if (limiter.allow()) {
      throw new Error('Should deny when empty');
    }
    
    console.log('✅ Test 4: Empty bucket behavior');
    passed++;
  } catch (err) {
    console.log(`❌ Test 4: ${err.message}`);
    failed++;
  }
  
  // Test 5: Constructor validation
  try {
    try {
      new RateLimiter(0, 1);
      throw new Error('Should reject maxTokens=0');
    } catch (e) {
      if (!e.message.includes('maxTokens')) throw e;
    }
    
    try {
      new RateLimiter(10, -1);
      throw new Error('Should reject negative refillRate');
    } catch (e) {
      if (!e.message.includes('refillRate')) throw e;
    }
    
    console.log('✅ Test 5: Constructor validation');
    passed++;
  } catch (err) {
    console.log(`❌ Test 5: ${err.message}`);
    failed++;
  }
  
  // Test 6: Rapid requests don't exceed limit
  try {
    const limiter = new RateLimiter(5, 100);  // 5 tokens, fast refill
    
    let allowed = 0;
    for (let i = 0; i < 100; i++) {
      if (limiter.allow()) allowed++;
    }
    
    // Should only allow initial 5 (within tiny time window)
    if (allowed !== 5) {
      throw new Error(`Expected 5 allowed, got ${allowed}`);
    }
    
    console.log('✅ Test 6: Rapid request handling');
    passed++;
  } catch (err) {
    console.log(`❌ Test 6: ${err.message}`);
    failed++;
  }
  
  // Test 7: State inspection
  try {
    const limiter = new RateLimiter(10, 5);
    const state = limiter.getState();
    
    if (state.maxTokens !== 10) throw new Error('maxTokens mismatch');
    if (state.refillRate !== 5) throw new Error('refillRate mismatch');
    if (state.currentTokens !== 10) throw new Error('currentTokens mismatch');
    if (typeof state.lastRefill !== 'number') throw new Error('lastRefill should be number');
    
    console.log('✅ Test 7: State inspection');
    passed++;
  } catch (err) {
    console.log(`❌ Test 7: ${err.message}`);
    failed++;
  }
  
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}`);
  
  return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
