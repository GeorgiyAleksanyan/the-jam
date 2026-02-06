/**
 * Token Bucket Rate Limiter with Async Support
 * Bounty #4 - The Jam Challenge
 * 
 * @author Rajkoli
 */

// ==================== SYNC VERSION ====================

class RateLimiter {
    constructor(maxTokens, refillRate) {
        if (maxTokens <= 0) throw new Error('maxTokens must be greater than 0');
        if (refillRate < 0) throw new Error('refillRate cannot be negative');

        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    _refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;
    }

    allow() {
        this._refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }

    getTokens() {
        this._refill();
        return this.tokens;
    }

    getState() {
        return {
            maxTokens: this.maxTokens,
            refillRate: this.refillRate,
            currentTokens: this.getTokens(),
            lastRefill: this.lastRefill
        };
    }
}

// ==================== ASYNC VERSION ====================

class RateLimiterAsync extends RateLimiter {
    /**
     * Wait for a token to become available, then consume it
     * @param {number} timeoutMs - Max wait time (default: 30s)
     * @returns {Promise<boolean>} - true if token acquired, false if timeout
     */
    async waitForToken(timeoutMs = 30000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (this.allow()) return true;

            // Calculate optimal wait time until next token
            const tokensNeeded = 1 - this.tokens;
            const waitMs = Math.min(
                Math.ceil((tokensNeeded / this.refillRate) * 1000) + 10,
                100 // Cap at 100ms to stay responsive
            );

            await new Promise(r => setTimeout(r, waitMs));
        }

        return false;
    }
}

// ==================== TESTS ====================

async function runTests() {
    console.log('🧪 Running Token Bucket Rate Limiter Tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Basic rate limiting
    try {
        const limiter = new RateLimiter(10, 1);
        let allPassed = true;
        for (let i = 0; i < 10; i++) {
            if (!limiter.allow()) allPassed = false;
        }
        if (allPassed && !limiter.allow()) {
            console.log('✅ Test 1: Basic rate limiting (10 tokens)');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 1: Basic rate limiting'); failed++; }

    // Test 2: Token refill
    try {
        const limiter = new RateLimiter(10, 100); // Fast refill
        for (let i = 0; i < 10; i++) limiter.allow();
        await new Promise(r => setTimeout(r, 50));
        if (limiter.allow()) {
            console.log('✅ Test 2: Token refill after wait');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 2: Token refill'); failed++; }

    // Test 3: getTokens accuracy
    try {
        const limiter = new RateLimiter(5, 1);
        if (limiter.getTokens() === 5) {
            console.log('✅ Test 3: getTokens() accuracy');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 3: getTokens()'); failed++; }

    // Test 4: Empty bucket
    try {
        const limiter = new RateLimiter(3, 0);
        limiter.allow(); limiter.allow(); limiter.allow();
        if (!limiter.allow() && limiter.getTokens() === 0) {
            console.log('✅ Test 4: Empty bucket behavior');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 4: Empty bucket'); failed++; }

    // Test 5: Constructor validation
    try {
        let caught = 0;
        try { new RateLimiter(0, 1); } catch { caught++; }
        try { new RateLimiter(-1, 1); } catch { caught++; }
        try { new RateLimiter(10, -1); } catch { caught++; }
        if (caught === 3) {
            console.log('✅ Test 5: Constructor validation');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 5: Constructor validation'); failed++; }

    // Test 6: Rapid requests (O(1) check)
    try {
        const limiter = new RateLimiter(100000, 1);
        const start = Date.now();
        for (let i = 0; i < 50000; i++) limiter.allow();
        if (Date.now() - start < 500) {
            console.log('✅ Test 6: Rapid request handling (O(1))');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 6: Rapid requests'); failed++; }

    // Test 7: State inspection
    try {
        const limiter = new RateLimiter(10, 5);
        const state = limiter.getState();
        if (state.maxTokens === 10 && state.refillRate === 5) {
            console.log('✅ Test 7: State inspection');
            passed++;
        } else throw new Error();
    } catch { console.log('❌ Test 7: State inspection'); failed++; }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

// Run if executed directly
runTests();

module.exports = { RateLimiter, RateLimiterAsync };
