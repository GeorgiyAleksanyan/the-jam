/**
 * Token Bucket Rate Limiter
 * Bounty #4 - The Jam Challenge
 * 
 * @author Rajkoli
 * @description Classic rate limiting algorithm with lazy token refill.
 * 
 * Algorithm:
 * - Bucket holds up to maxTokens tokens
 * - Tokens refill at refillRate per second
 * - Each allow() call consumes 1 token
 * - Denied if no tokens available
 * 
 * Concurrency Model (JavaScript):
 * JavaScript is single-threaded with an event loop. All operations
 * in this class are synchronous and atomic within a single call.
 * No race conditions are possible in a single-threaded environment.
 * For multi-threaded environments (Workers), external synchronization
 * would be required.
 */

interface IRateLimiter {
    allow(): boolean;
    getTokens(): number;
}

class RateLimiter implements IRateLimiter {
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per second
    private tokens: number;
    private lastRefill: number;

    /**
     * Create a new rate limiter
     * @param maxTokens - Maximum bucket capacity (must be > 0)
     * @param refillRate - Tokens added per second (must be >= 0)
     */
    constructor(maxTokens: number, refillRate: number) {
        if (maxTokens <= 0) {
            throw new Error('maxTokens must be greater than 0');
        }
        if (refillRate < 0) {
            throw new Error('refillRate cannot be negative');
        }

        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens; // Start with full bucket
        this.lastRefill = Date.now();
    }

    /**
     * Lazily refill tokens based on elapsed time.
     * O(1) complexity - simple arithmetic, no loops.
     */
    private refill(): void {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefill) / 1000;
        const tokensToAdd = elapsedSeconds * this.refillRate;

        // Cap at maxTokens - tokens never exceed bucket capacity
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Check if a request is allowed.
     * @returns true if allowed (token consumed), false if rate limited
     * 
     * Time Complexity: O(1)
     */
    allow(): boolean {
        this.refill();

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }

    /**
     * Get current available tokens (fractional).
     * Triggers a refill calculation.
     */
    getTokens(): number {
        this.refill();
        return this.tokens;
    }
}

export { RateLimiter, IRateLimiter };
export default RateLimiter;
