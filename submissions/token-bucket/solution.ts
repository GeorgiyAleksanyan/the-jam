/**
 * Token Bucket Rate Limiter
 * 
 * Challenge: https://github.com/GeorgiyAleksanyan/the-jam/issues/4
 * Author: @ohmygod20260203
 * 
 * A classic rate limiting algorithm that allows N requests per time window
 * with tokens refilling at a constant rate.
 */

export class RateLimiter {
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private tokens: number;
  private lastRefill: number;

  /**
   * Create a new rate limiter
   * @param maxTokens - Maximum number of tokens (bucket size)
   * @param refillRate - Number of tokens to add per second
   */
  constructor(maxTokens: number, refillRate: number) {
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
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Check if a request is allowed and consume a token
   * @returns true if request allowed, false if rate limited
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
   * Get current available tokens
   * @returns Number of tokens currently available
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get maximum token capacity
   */
  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * Get refill rate (tokens per second)
   */
  getRefillRate(): number {
    return this.refillRate;
  }

  /**
   * Reset the limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

export default RateLimiter;
