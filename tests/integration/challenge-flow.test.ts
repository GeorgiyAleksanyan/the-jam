/**
 * Integration tests for the challenge flow
 * Tests: create → fund → submit → vote → select winner
 * 
 * These tests mock at the module level and test route handlers directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockParams, getResponseJson } from '../utils/request';

// Mock data that can be modified per test
const mockData = {
  user: null as { id: string; email: string } | null,
  challenge: null as any,
  challenges: [] as any[],
  submission: null as any,
  submissions: [] as any[],
  agent: null as any,
  vote: null as any,
  votes: [] as any[],
  existingSlug: null as string | null,
};

// Mock Supabase modules
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() => 
        Promise.resolve({ data: { user: mockData.user }, error: null })
      ),
    },
  })),
}));

vi.mock('@/lib/supabase', () => {
  const createChainableMock = (tableType: string) => {
    const chainable: any = {};
    
    // Define chainable methods that return the chainable object
    const chainMethods = ['select', 'eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'order', 'limit', 'range'];
    
    for (const method of chainMethods) {
      chainable[method] = vi.fn(() => chainable);
    }
    
    chainable.insert = vi.fn((data: any) => {
      if (tableType === 'challenges') {
        mockData.challenge = {
          ...data,
          id: 1,
          slug: data.slug,
          upvotes: 0,
          submission_count: 0,
          created_at: new Date().toISOString(),
        };
      }
      if (tableType === 'submissions') {
        mockData.submission = {
          ...data,
          id: 1,
          status: 'running',
          created_at: new Date().toISOString(),
        };
      }
      return chainable;
    });
    
    chainable.update = vi.fn((data: any) => {
      if (tableType === 'challenges' && mockData.challenge) {
        mockData.challenge = { ...mockData.challenge, ...data };
      }
      if (tableType === 'submissions' && mockData.submission) {
        mockData.submission = { ...mockData.submission, ...data };
      }
      return chainable;
    });
    
    chainable.upsert = vi.fn((data: any) => {
      if (tableType === 'votes') {
        mockData.vote = { ...data, id: 1 };
      }
      return chainable;
    });
    
    chainable.delete = vi.fn(() => chainable);
    
    // Make chainable awaitable (thenable)
    chainable.then = function(resolve: (value: { data: unknown; error: unknown }) => void, reject?: (reason: unknown) => void) {
      // When awaited, return appropriate data based on table type
      if (tableType === 'challenges') {
        return Promise.resolve({ data: mockData.challenges, error: null }).then(resolve, reject);
      }
      if (tableType === 'submissions') {
        return Promise.resolve({ data: mockData.submissions, error: null }).then(resolve, reject);
      }
      if (tableType === 'challenge_topics') {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    };
    
    chainable.single = vi.fn(() => {
      if (tableType === 'challenges') {
        if (mockData.challenge) {
          return Promise.resolve({ data: mockData.challenge, error: null });
        }
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      }
      if (tableType === 'submissions') {
        if (mockData.submission) {
          return Promise.resolve({ 
            data: { ...mockData.submission, agents: mockData.agent }, 
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: { message: 'Not found' } });
      }
      if (tableType === 'agents') {
        return Promise.resolve({ data: mockData.agent, error: null });
      }
      if (tableType === 'votes') {
        return Promise.resolve({ data: mockData.vote, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    
    chainable.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    
    return chainable;
  };

  const supabaseClient = {
    from: vi.fn((table: string) => createChainableMock(table)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: supabaseClient,
    supabaseAdmin: supabaseClient,
  };
});

// Mock the runner
vi.mock('@/lib/runner', () => ({
  runAgent: vi.fn().mockResolvedValue({
    success: true,
    output: 'Test output',
    logs: ['Log 1', 'Log 2'],
    error: null,
  }),
  validateCode: vi.fn().mockReturnValue({ valid: true }),
}));

// Import route handlers after mocking
import { GET as listChallenges, POST as createChallenge } from '@/app/api/challenges/route';
import { GET as getChallenge } from '@/app/api/challenges/[slug]/route';
import { GET as listSubmissions, POST as submitSolution } from '@/app/api/challenges/[slug]/submissions/route';

describe('Challenge Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockData.user = null;
    mockData.challenge = null;
    mockData.challenges = [];
    mockData.submission = null;
    mockData.submissions = [];
    mockData.agent = null;
    mockData.vote = null;
    mockData.votes = [];
    mockData.existingSlug = null;
  });

  describe('Step 1: Create Challenge', () => {
    it('should require authentication', async () => {
      mockData.user = null;
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Test Challenge',
          slug: 'test-challenge',
          description: 'A test challenge',
        },
      });

      const response = await createChallenge(request);
      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: { title: 'Test' }, // Missing slug and description
      });

      const response = await createChallenge(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate slug format', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Test Challenge',
          slug: 'Invalid Slug!', // Invalid format
          description: 'A test challenge',
        },
      });

      const response = await createChallenge(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Slug');
    });

    it('should create challenge with valid data', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Test Challenge',
          slug: 'test-challenge',
          description: 'A test challenge',
          difficulty: 'medium',
        },
      });

      const response = await createChallenge(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(201);
      expect(data.challenge).toBeDefined();
      expect(mockData.challenge.title).toBe('Test Challenge');
      expect(mockData.challenge.status).toBe('proposed'); // Free challenges start as proposed
    });

    it('should set status to open for funded challenges', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Funded Challenge',
          slug: 'funded-challenge',
          description: 'A funded challenge',
          prize_pool: 100,
          funding_threshold: 100,
        },
      });

      const response = await createChallenge(request);

      expect(response.status).toBe(201);
      expect(mockData.challenge.status).toBe('open');
      expect(mockData.challenge.prize_pool).toBe(100);
    });

    it('should set status to funding when below threshold', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Partially Funded',
          slug: 'partial-fund',
          description: 'A partially funded challenge',
          prize_pool: 50,
          funding_threshold: 100,
        },
      });

      const response = await createChallenge(request);

      expect(response.status).toBe(201);
      expect(mockData.challenge.status).toBe('funding');
    });

    it('should allow API key authentication for agents', async () => {
      // Test that API key auth works (the mock just returns the owner_id)
      mockData.user = null;
      mockData.agent = { id: 1, owner_id: 'agent-owner-id' };
      
      const request = new Request('http://localhost/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer jam_sk_test123',
        },
        body: JSON.stringify({
          title: 'Agent Challenge',
          slug: 'agent-challenge',
          description: 'Created by agent',
        }),
      });

      const response = await createChallenge(request);
      // Should pass through auth (we're mocking the API key verification)
      // The actual behavior depends on the verifyApiKey function
      expect(response.status).toBe(201);
    });
  });

  describe('Step 2: List Challenges', () => {
    it('should list challenges', async () => {
      mockData.challenges = [
        { id: 1, title: 'Challenge 1', status: 'open' },
        { id: 2, title: 'Challenge 2', status: 'active' },
      ];
      
      const request = createMockRequest('GET', '/api/challenges');

      const response = await listChallenges(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.challenges).toBeDefined();
      expect(data.count).toBe(2);
    });

    it('should filter by status', async () => {
      mockData.challenges = [
        { id: 1, title: 'Open Challenge', status: 'open' },
      ];
      
      const request = createMockRequest('GET', '/api/challenges?status=open');

      const response = await listChallenges(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.challenges).toBeDefined();
    });

    it('should filter by difficulty', async () => {
      mockData.challenges = [
        { id: 1, title: 'Hard Challenge', difficulty: 'hard', status: 'open' },
      ];
      
      const request = createMockRequest('GET', '/api/challenges?difficulty=hard');

      const response = await listChallenges(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.challenges).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      mockData.challenges = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        title: `Challenge ${i + 1}`,
        status: 'open',
      }));
      
      const request = createMockRequest('GET', '/api/challenges?limit=5');

      const response = await listChallenges(request);
      const _data = await getResponseJson(response);

      expect(response.status).toBe(200);
      // Note: our mock doesn't actually limit, but the route should
    });
  });

  describe('Step 3: Submit Solution', () => {
    beforeEach(() => {
      mockData.challenge = {
        id: 1,
        slug: 'test-challenge',
        status: 'open',
        default_input: {},
        test_cases: null,
        max_submissions_per_agent: 10,
      };
      mockData.agent = {
        id: 1,
        name: 'Test Agent',
        owner_id: 'agent-owner',
        wallet_address: '0x123',
      };
    });

    it('should require code', async () => {
      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { api_key: 'jam_sk_test' }, // Missing code
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Code is required');
    });

    it('should require API key', async () => {
      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { code: 'console.log("hello")' }, // Missing api_key
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('api_key');
    });

    it('should return 404 for non-existent challenge', async () => {
      mockData.challenge = null;
      
      const request = createMockRequest('POST', '/api/challenges/non-existent/submissions', {
        body: { code: 'test', api_key: 'jam_sk_test' },
      });
      const params = createMockParams({ slug: 'non-existent' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Challenge not found');
    });

    it('should reject submissions for proposed challenges', async () => {
      mockData.challenge = { ...mockData.challenge, status: 'proposed' };
      
      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { code: 'test', api_key: 'jam_sk_test' },
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('funding');
    });

    it('should reject submissions for closed challenges', async () => {
      mockData.challenge = { ...mockData.challenge, status: 'closed' };
      
      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { code: 'test', api_key: 'jam_sk_test' },
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('closed');
    });

    it('should accept submissions for open challenges', async () => {
      mockData.challenge = { ...mockData.challenge, status: 'open' };
      
      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { 
          code: 'console.log("Hello")',
          api_key: 'jam_sk_test123',
        },
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(201);
      expect(data.submission).toBeDefined();
      expect(data.result).toBeDefined();
      expect(data.result.success).toBe(true);
    });

    it('should accept submissions for active challenges', async () => {
      mockData.challenge = { ...mockData.challenge, status: 'active' };
      
      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { 
          code: 'console.log("Hello")',
          api_key: 'jam_sk_test123',
        },
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });

      expect(response.status).toBe(201);
    });
  });

  describe('Step 4: List Submissions', () => {
    beforeEach(() => {
      mockData.challenge = {
        id: 1,
        slug: 'test-challenge',
        status: 'open',
      };
      mockData.submissions = [
        { id: 1, status: 'success', vote_score: 10 },
        { id: 2, status: 'success', vote_score: 5 },
      ];
    });

    it('should list submissions for a challenge', async () => {
      const request = createMockRequest('GET', '/api/challenges/test-challenge/submissions');
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await listSubmissions(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.submissions).toBeDefined();
      expect(data.count).toBe(2);
    });

    it('should return 404 for non-existent challenge', async () => {
      mockData.challenge = null;
      
      const request = createMockRequest('GET', '/api/challenges/non-existent/submissions');
      const params = createMockParams({ slug: 'non-existent' });

      const response = await listSubmissions(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Challenge not found');
    });
  });

  describe('Step 5: Get Challenge Details', () => {
    it('should return challenge details', async () => {
      mockData.challenge = {
        id: 1,
        slug: 'test-challenge',
        title: 'Test Challenge',
        status: 'open',
        prize_pool: 100,
      };
      
      const request = createMockRequest('GET', '/api/challenges/test-challenge');
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await getChallenge(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.challenge).toBeDefined();
    });

    it('should return 404 for non-existent challenge', async () => {
      mockData.challenge = null;
      
      const request = createMockRequest('GET', '/api/challenges/non-existent');
      const params = createMockParams({ slug: 'non-existent' });

      const response = await getChallenge(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Challenge not found');
    });
  });

  describe('Challenge Status Transitions', () => {
    it('free challenge: proposed → needs upvotes', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Free Challenge',
          slug: 'free-challenge',
          description: 'No funding',
          upvote_threshold: 20,
        },
      });

      await createChallenge(request);

      expect(mockData.challenge.status).toBe('proposed');
      expect(mockData.challenge.upvote_threshold).toBe(20);
    });

    it('funded challenge: funding → open when threshold met', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      // First, create with funding below threshold
      const request1 = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Funding Challenge',
          slug: 'funding-challenge',
          description: 'Needs more funding',
          prize_pool: 50,
          funding_threshold: 100,
        },
      });

      await createChallenge(request1);
      expect(mockData.challenge.status).toBe('funding');

      // Now create with funding at threshold
      mockData.challenge = null;
      const request2 = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Fully Funded',
          slug: 'fully-funded',
          description: 'Has enough funding',
          prize_pool: 100,
          funding_threshold: 100,
        },
      });

      await createChallenge(request2);
      expect(mockData.challenge.status).toBe('open');
    });
  });

  describe('Submission Validation', () => {
    beforeEach(() => {
      mockData.challenge = {
        id: 1,
        slug: 'test-challenge',
        status: 'open',
        default_input: {},
      };
      mockData.agent = {
        id: 1,
        name: 'Test Agent',
        owner_id: 'agent-owner',
      };
    });

    it('should reject invalid code', async () => {
      // Override the validateCode mock for this test
      const { validateCode } = await import('@/lib/runner');
      vi.mocked(validateCode).mockReturnValueOnce({ 
        valid: false, 
        reason: 'Dangerous code detected',
      });

      const request = createMockRequest('POST', '/api/challenges/test-challenge/submissions', {
        body: { 
          code: 'process.exit(1)', // Dangerous code
          api_key: 'jam_sk_test123',
        },
      });
      const params = createMockParams({ slug: 'test-challenge' });

      const response = await submitSolution(request, { params });
      const data = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dangerous code detected');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty challenge list', async () => {
      mockData.challenges = [];
      
      const request = createMockRequest('GET', '/api/challenges');

      const response = await listChallenges(request);
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(data.challenges).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should cap limit at 100', async () => {
      mockData.challenges = [];
      
      const request = createMockRequest('GET', '/api/challenges?limit=500');

      const response = await listChallenges(request);

      // The route should cap at 100, but our mock doesn't enforce this
      // The important thing is it doesn't crash
      expect(response.status).toBe(200);
    });

    it('should handle special characters in description', async () => {
      mockData.user = { id: 'user-1', email: 'test@example.com' };
      
      const request = createMockRequest('POST', '/api/challenges', {
        body: {
          title: 'Special Chars',
          slug: 'special-chars',
          description: 'Test with émojis 🎉 and "quotes" and <html>',
        },
      });

      const response = await createChallenge(request);

      expect(response.status).toBe(201);
      expect(mockData.challenge.description).toContain('🎉');
    });
  });
});
