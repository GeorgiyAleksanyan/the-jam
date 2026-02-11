import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a spy we can manipulate
const mockLimit = vi.fn();

// Mock dependencies BEFORE import
vi.mock('@upstash/ratelimit', () => {
  return {
    Ratelimit: class {
      static slidingWindow() {
        return {};
      }
      constructor() {}
      limit = mockLimit;
    },
  };
});

vi.mock('@upstash/redis', () => {
  return {
    Redis: class {
      constructor() {}
    },
  };
});

// Import after mocking - these are used via dynamic imports
import type {} from '@/lib/rate-limit';


describe('Rate Limit Library', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.useFakeTimers();
    mockLimit.mockReset();
    mockLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
  });

  describe('In-Memory Rate Limiting', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it('should allow requests within limit', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const identifier = 'test-user-1';
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(identifier, 'auth');
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests exceeding limit', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const identifier = 'test-user-2';
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(identifier, 'auth');
      }
      const result = await checkRateLimit(identifier, 'auth');
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset limit after window expires', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const identifier = 'test-user-3';
      await checkRateLimit(identifier, 'auth');
      vi.advanceTimersByTime(61000);
      const result = await checkRateLimit(identifier, 'auth');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should handle different window units', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      // Using 'auth' which is 1m
      const result = await checkRateLimit('user-window-test', 'auth');
      const now = Date.now();
      expect(result.reset).toBeGreaterThan(now);
      expect(result.reset).toBeLessThanOrEqual(now + 60000);
    });
  });

  describe('Upstash Rate Limiting', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://fake-url.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    });

    it('should use Upstash when configured', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const identifier = 'upstash-user';
      await checkRateLimit(identifier, 'auth');
      expect(mockLimit).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith('auth:upstash-user');
    });

    it('should fallback to memory if Upstash fails', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      mockLimit.mockRejectedValue(new Error('Redis error'));
      const identifier = 'fallback-user';
      
      const result = await checkRateLimit(identifier, 'auth');
      
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('Headers & Identifiers', () => {
    it('should extract identifier from user ID', async () => {
      const { getIdentifier } = await import('@/lib/rate-limit');
      const req = new Request('http://localhost');
      expect(getIdentifier(req, 'u1')).toBe('user:u1');
    });

    it('should extract identifier from IP header', async () => {
      const { getIdentifier } = await import('@/lib/rate-limit');
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' }
      });
      expect(getIdentifier(req)).toBe('ip:1.2.3.4');
    });

    it('should generate rate limit headers', async () => {
      const { getRateLimitHeaders } = await import('@/lib/rate-limit');
      const headers = getRateLimitHeaders({
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1234567890
      });
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('99');
      expect(headers['X-RateLimit-Reset']).toBe('1234567890');
    });

    it('should include Retry-After on failure', async () => {
      const { getRateLimitHeaders } = await import('@/lib/rate-limit');
      const now = Date.now();
      const headers = getRateLimitHeaders({
        success: false,
        limit: 100,
        remaining: 0,
        reset: now + 5000
      });
      expect(headers['Retry-After']).toBe('5');
    });
  });
});

