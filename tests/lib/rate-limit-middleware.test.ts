import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withRateLimit, getEndpointType } from '@/lib/rate-limit-middleware';
import * as RateLimitLib from '@/lib/rate-limit';

// Mock the rate limit library
vi.mock('@/lib/rate-limit', () => {
  return {
    checkRateLimit: vi.fn(),
    getRateLimitHeaders: vi.fn().mockReturnValue({ 'X-Test': 'Header' }),
    getIdentifier: vi.fn().mockReturnValue('test-id'),
    RATE_LIMITS: {
      api: { requests: 100, window: '1m' },
      auth: { requests: 5, window: '1m' },
    },
  };
});

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRateLimit', () => {
    it('should return null when rate limit passes', async () => {
      // Mock success
      vi.mocked(RateLimitLib.checkRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: 1000,
      });

      const req = new Request('http://localhost/api/test');
      const result = await withRateLimit(req);

      expect(result).toBeNull();
      expect(RateLimitLib.checkRateLimit).toHaveBeenCalled();
    });

    it('should return 429 response when rate limit exceeded', async () => {
      // Mock failure
      vi.mocked(RateLimitLib.checkRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 5000,
      });

      const req = new Request('http://localhost/api/test');
      const result = await withRateLimit(req);

      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(429);
      
      const body = await result?.json();
      expect(body.error).toBe('Too Many Requests');
    });
  });

  describe('getEndpointType', () => {
    it('should identify auth endpoints', () => {
      expect(getEndpointType('/api/auth/signin')).toBe('auth');
    });

    it('should identify submission endpoints', () => {
      expect(getEndpointType('/api/challenges/c1/submissions')).toBe('submissions');
    });

    it('should identify vote endpoints', () => {
      expect(getEndpointType('/api/challenges/c1/votes')).toBe('votes');
      expect(getEndpointType('/api/challenges/c1/upvote')).toBe('votes');
    });

    it('should identify webhook endpoints', () => {
      expect(getEndpointType('/api/webhook/stripe')).toBe('webhooks');
    });

    it('should identify admin endpoints', () => {
      expect(getEndpointType('/api/admin/users')).toBe('admin');
    });

    it('should identify upload endpoints', () => {
      expect(getEndpointType('/api/upload')).toBe('uploads');
    });

    it('should default to api for others', () => {
      expect(getEndpointType('/api/unknown')).toBe('api');
    });
  });
});
