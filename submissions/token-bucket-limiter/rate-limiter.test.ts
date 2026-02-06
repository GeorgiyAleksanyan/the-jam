/**
 * Rate Limiter Tests (Standalone)
 * Bounty #4 - The Jam Challenge
 * 
 * Run: npx ts-node rate-limiter.test.ts
 * Or:  tsc && node dist/rate-limiter.test.js
 */

// Inline the class to avoid import resolution issues
class RateLimiter {
    private readonly maxTokens: number;
    private readonly refillRate: number;
    private tokens: number;
    private lastRefill: number;

    constructor(maxTokens: number, refillRate: number) {
        if (maxTokens <= 0) throw new Error('maxTokens must be greater than 0');
        if (refillRate < 0) throw new Error('refillRate cannot be negative');

        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    private refill(): void {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSeconds * this.refillRate);
        this.lastRefill = now;
    }

    allow(): boolean {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }

    getTokens(): number {
        this.refill();
        return this.tokens;
    }
}

// Test utilities
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Test runner
async function runTests(): Promise<void> {
    console.log('🧪 Running Token Bucket Rate Limiter Tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1
    try {
        const limiter = new RateLimiter(10, 1);
        for (let i = 0; i < 10; i++) {
            assert(limiter.allow() === true, `Request ${i + 1} should be allowed`);
        }
        console.log('✅ Test 1: Allows first 10 requests');
        passed++;
    } catch (e) { console.log('❌ Test 1 FAILED:', (e as Error).message); failed++; }

    // Test 2
    try {
        const limiter = new RateLimiter(10, 1);
        for (let i = 0; i < 10; i++) limiter.allow();
        assert(limiter.allow() === false, '11th should be denied');
        console.log('✅ Test 2: Denies 11th request');
        passed++;
    } catch (e) { console.log('❌ Test 2 FAILED:', (e as Error).message); failed++; }

    // Test 3
    try {
        const limiter = new RateLimiter(10, 100);
        for (let i = 0; i < 10; i++) limiter.allow();
        await sleep(50);
        assert(limiter.allow() === true, 'Should have refilled');
        console.log('✅ Test 3: Allows after token refill');
        passed++;
    } catch (e) { console.log('❌ Test 3 FAILED:', (e as Error).message); failed++; }

    // Test 4
    try {
        const limiter = new RateLimiter(5, 1);
        assert(limiter.getTokens() === 5, 'Should start full');
        console.log('✅ Test 4: Starts with full bucket');
        passed++;
    } catch (e) { console.log('❌ Test 4 FAILED:', (e as Error).message); failed++; }

    // Test 5
    try {
        const limiter = new RateLimiter(5, 100);
        await sleep(100);
        assert(limiter.getTokens() <= 5, 'Tokens capped at max');
        console.log('✅ Test 5: Tokens capped at maxTokens');
        passed++;
    } catch (e) { console.log('❌ Test 5 FAILED:', (e as Error).message); failed++; }

    // Test 6
    try {
        const limiter = new RateLimiter(3, 0);
        limiter.allow(); limiter.allow(); limiter.allow();
        assert(limiter.allow() === false, 'Should be denied');
        console.log('✅ Test 6: Zero refill rate works');
        passed++;
    } catch (e) { console.log('❌ Test 6 FAILED:', (e as Error).message); failed++; }

    // Test 7
    try {
        let caught = 0;
        try { new RateLimiter(0, 1); } catch { caught++; }
        try { new RateLimiter(-1, 1); } catch { caught++; }
        try { new RateLimiter(10, -1); } catch { caught++; }
        assert(caught === 3, 'Should throw for invalid params');
        console.log('✅ Test 7: Rejects invalid parameters');
        passed++;
    } catch (e) { console.log('❌ Test 7 FAILED:', (e as Error).message); failed++; }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

runTests();
