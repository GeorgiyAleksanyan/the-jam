/**
 * Tests for /api/challenges routes
 *
 * These are integration-style tests that verify the API route handlers
 * work correctly with mocked database responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson, createMockParams } from '../utils/request'

// ============================================================
// MOCKS - reusing the pattern from agents.test.ts
// ============================================================

// Mock crypto module with both named and default exports
vi.mock('crypto', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('crypto')

  const mockRandomBytes = (_size: number) => ({
    toString: (_encoding: string) => 'abcdef123456',
  })

  const mockCreateHash = (_algorithm: string) => ({
    update: function (_data: string) {
      return this
    },
    digest: (_encoding: string) => 'mocked-hash',
  })

  return {
    ...actual,
    default: {
      ...actual,
      randomBytes: mockRandomBytes,
      createHash: mockCreateHash,
    },
    randomBytes: mockRandomBytes,
    createHash: mockCreateHash,
  }
})

// Mock Web Crypto API's subtle.digest
const mockSubtle = {
  digest: vi
    .fn()
    .mockResolvedValue(
      new Uint8Array([0x6d, 0x6f, 0x63, 0x6b, 0x65, 0x64, 0x2d, 0x68, 0x61, 0x73, 0x68])
    ),
}

vi.stubGlobal('crypto', {
  subtle: mockSubtle,
  getRandomValues: (arr: Uint8Array) => arr,
})

// Track call order for sequential responses
let callIndex = 0
let mockResponses: Array<{ data: any; error: any }> = []

function setMockResponses(responses: Array<{ data: any; error: any | null }>) {
  mockResponses = responses
  callIndex = 0
}

function getNextMockResponse() {
  const response = mockResponses[callIndex] || { data: null, error: null }
  callIndex++
  return response
}

// Chainable mock
function createChainable(finalResult: () => Promise<any>) {
  const chainable: any = {}
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'order',
    'limit',
    'range',
  ]

  methods.forEach((method) => {
    chainable[method] = vi.fn(() => chainable)
  })

  chainable.single = vi.fn(() => finalResult())
  chainable.maybeSingle = vi.fn(() => finalResult())
  chainable.then = (resolve: any) => finalResult().then(resolve)

  return chainable
}

const mockSupabaseClient = {
  from: vi.fn(() => createChainable(() => Promise.resolve(getNextMockResponse()))),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
  createBrowserClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
    get: vi.fn(),
  })),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseClient,
}))

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/runner', () => ({
  runAgent: vi.fn(() =>
    Promise.resolve({
      success: true,
      output: { result: 'test output' },
      logs: ['log line 1'],
    })
  ),
  validateCode: vi.fn(() => ({ valid: true })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================
// TESTS
// ============================================================

describe('GET /api/challenges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns list of challenges', async () => {
    const mockChallenges = [
      {
        id: 1,
        slug: 'challenge-1',
        title: 'Challenge 1',
        status: 'open',
        prize_pool: 100,
      },
      {
        id: 2,
        slug: 'challenge-2',
        title: 'Challenge 2',
        status: 'funding',
        prize_pool: 50,
      },
    ]

    setMockResponses([{ data: mockChallenges, error: null }])

    const { GET } = await import('@/app/api/challenges/route')
    const request = createMockRequest('GET', '/api/challenges')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.challenges).toHaveLength(2)
    expect(json.count).toBe(2)
  })

  it('filters by status', async () => {
    const mockChallenges = [{ id: 1, slug: 'open-challenge', status: 'open' }]

    setMockResponses([{ data: mockChallenges, error: null }])

    const { GET } = await import('@/app/api/challenges/route')
    const request = createMockRequest('GET', '/api/challenges', {
      searchParams: { status: 'open' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.challenges).toHaveLength(1)
  })

  it('filters by difficulty', async () => {
    const mockChallenges = [{ id: 1, slug: 'hard-challenge', difficulty: 'hard' }]

    setMockResponses([{ data: mockChallenges, error: null }])

    const { GET } = await import('@/app/api/challenges/route')
    const request = createMockRequest('GET', '/api/challenges', {
      searchParams: { difficulty: 'hard' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.challenges).toHaveLength(1)
  })

  it('returns 500 on database error', async () => {
    setMockResponses([{ data: null, error: { message: 'DB error' } }])

    const { GET } = await import('@/app/api/challenges/route')
    const request = createMockRequest('GET', '/api/challenges')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(500)
    expect(json.error).toBeDefined()
  })

  it('returns empty list when no challenges', async () => {
    setMockResponses([{ data: [], error: null }])

    const { GET } = await import('@/app/api/challenges/route')
    const request = createMockRequest('GET', '/api/challenges')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.challenges).toEqual([])
    expect(json.count).toBe(0)
  })
})

describe('POST /api/challenges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('creates challenge with valid data', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    setMockResponses([
      { data: null, error: { code: 'PGRST116' } }, // No existing slug
      { data: { id: 1, slug: 'new-challenge' }, error: null }, // Insert
    ])

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      headers: { Authorization: 'Bearer user-token' },
      body: {
        title: 'New Challenge',
        slug: 'new-challenge',
        description: 'A test challenge',
        difficulty: 'easy',
        prize_pool: 100,
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(201)
    expect(json.challenge).toBeDefined()
  })

  it('rejects challenge without title', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      headers: { Authorization: 'Bearer user-token' },
      body: {
        slug: 'missing-title',
        description: 'No title provided',
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('required')
  })

  it('rejects invalid slug format', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      headers: { Authorization: 'Bearer user-token' },
      body: {
        title: 'Bad Slug Challenge',
        slug: 'Invalid_Slug!',
        description: 'Has invalid characters',
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('lowercase')
  })

  it('rejects duplicate slug', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    setMockResponses([
      { data: { id: 99 }, error: null }, // Existing challenge found
    ])

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      headers: { Authorization: 'Bearer user-token' },
      body: {
        title: 'Duplicate Slug',
        slug: 'existing-slug',
        description: 'Slug already taken',
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(409)
    expect(json.error).toContain('already taken')
  })

  it('rejects without authentication', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      body: {
        title: 'No Auth Challenge',
        slug: 'no-auth',
        description: 'No token provided',
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('accepts agent API key for auth', async () => {
    // Agent API key auth
    setMockResponses([
      { data: { id: 1, owner_id: 'agent-owner' }, error: null }, // Agent lookup
      { data: null, error: { code: 'PGRST116' } }, // No existing slug
      { data: { id: 2, slug: 'agent-challenge' }, error: null }, // Insert
    ])

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      headers: { Authorization: 'Bearer jam_sk_testkey123' },
      body: {
        title: 'Agent Challenge',
        slug: 'agent-challenge',
        description: 'Created by agent',
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(201)
    expect(json.challenge).toBeDefined()
  })
})

describe('GET /api/challenges/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns challenge by slug', async () => {
    const mockChallenge = {
      id: 1,
      slug: 'test-challenge',
      title: 'Test Challenge',
      description: 'A test challenge',
      status: 'open',
      prize_pool: 100,
      view_count: 5,
    }

    setMockResponses([
      { data: mockChallenge, error: null }, // Challenge lookup
      { data: [], error: null }, // Topics lookup
      { data: [], error: null }, // Submissions lookup
      { data: null, error: null }, // View count update
    ])

    const { GET } = await import('@/app/api/challenges/[slug]/route')
    const request = createMockRequest('GET', '/api/challenges/test-challenge')
    const params = createMockParams({ slug: 'test-challenge' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.challenge.slug).toBe('test-challenge')
    expect(json.challenge.title).toBe('Test Challenge')
  })

  it('returns 404 for non-existent challenge', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/challenges/[slug]/route')
    const request = createMockRequest('GET', '/api/challenges/non-existent')
    const params = createMockParams({ slug: 'non-existent' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Challenge not found')
  })

  it('includes submissions sorted by score', async () => {
    const mockChallenge = { id: 1, slug: 'with-submissions', view_count: 0 }
    const mockSubmissions = [
      { id: 1, final_score: 100, is_winner: false, status: 'success' },
      { id: 2, final_score: 200, is_winner: true, status: 'success' },
    ]

    setMockResponses([
      { data: mockChallenge, error: null },
      { data: [], error: null },
      { data: mockSubmissions, error: null },
      { data: null, error: null },
    ])

    const { GET } = await import('@/app/api/challenges/[slug]/route')
    const request = createMockRequest('GET', '/api/challenges/with-submissions')
    const params = createMockParams({ slug: 'with-submissions' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.submissions).toHaveLength(2)
  })
})

describe('GET /api/challenges/[slug]/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns submissions for a challenge', async () => {
    const mockChallenge = { id: 1 }
    const mockSubmissions = [
      { id: 1, status: 'success', final_score: 100 },
      { id: 2, status: 'failed', final_score: 0 },
    ]

    setMockResponses([
      { data: mockChallenge, error: null },
      { data: mockSubmissions, error: null },
    ])

    const { GET } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('GET', '/api/challenges/test/submissions')
    const params = createMockParams({ slug: 'test' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.submissions).toHaveLength(2)
    expect(json.count).toBe(2)
  })

  it('returns 404 for non-existent challenge', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('GET', '/api/challenges/non-existent/submissions')
    const params = createMockParams({ slug: 'non-existent' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Challenge not found')
  })
})

describe('POST /api/challenges/[slug]/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('creates submission with valid code and API key', async () => {
    setMockResponses([
      { data: { id: 1, status: 'open', default_input: {} }, error: null }, // Challenge
      { data: { id: 100 }, error: null }, // Agent lookup by API key
      { data: { id: 1, challenge_id: 1, agent_id: 100 }, error: null }, // Submission insert
      { data: { id: 1, status: 'success' }, error: null }, // Submission update
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('POST', '/api/challenges/test/submissions', {
      body: {
        code: 'function solve(input) { return input; }',
        api_key: 'jam_sk_testkey123',
      },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(201)
    expect(json.submission).toBeDefined()
    expect(json.result).toBeDefined()
  })

  it('rejects submission without code', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('POST', '/api/challenges/test/submissions', {
      body: { api_key: 'jam_sk_testkey123' },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Code is required')
  })

  it('rejects submission without API key', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('POST', '/api/challenges/test/submissions', {
      body: { code: 'function solve() {}' },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toContain('api_key is required')
  })

  it('rejects submission for closed challenge', async () => {
    setMockResponses([
      { data: { id: 1, status: 'closed' }, error: null }, // Challenge is closed
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('POST', '/api/challenges/test/submissions', {
      body: {
        code: 'function solve() {}',
        api_key: 'jam_sk_testkey123',
      },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('closed')
  })

  it('rejects submission for proposed challenge', async () => {
    setMockResponses([{ data: { id: 1, status: 'proposed' }, error: null }])

    const { POST } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('POST', '/api/challenges/test/submissions', {
      body: {
        code: 'function solve() {}',
        api_key: 'jam_sk_testkey123',
      },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('funding')
  })

  it('rejects with invalid API key', async () => {
    setMockResponses([
      { data: { id: 1, status: 'open' }, error: null }, // Challenge
      { data: null, error: { code: 'PGRST116' } }, // Agent not found
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/submissions/route')
    const request = createMockRequest('POST', '/api/challenges/test/submissions', {
      body: {
        code: 'function solve() {}',
        api_key: 'jam_sk_invalid',
      },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toContain('Invalid API key')
  })
})

describe('GET /api/challenges/[slug]/votes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns votes for a challenge', async () => {
    const mockVotes = [
      { id: 1, submission_id: 1, voter_id: 'user-1', weight: 5 },
      { id: 2, submission_id: 1, voter_id: 'user-2', weight: 3 },
    ]

    setMockResponses([
      { data: { id: 1 }, error: null }, // Challenge lookup
      { data: [{ id: 1 }], error: null }, // Submissions lookup
      { data: mockVotes, error: null }, // Votes lookup
    ])

    const { GET } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('GET', '/api/challenges/test/votes')
    const params = createMockParams({ slug: 'test' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.votes).toHaveLength(2)
    expect(json.totals).toBeDefined()
  })

  it('returns 404 for non-existent challenge', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('GET', '/api/challenges/non-existent/votes')
    const params = createMockParams({ slug: 'non-existent' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Challenge not found')
  })
})

describe('POST /api/challenges/[slug]/votes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('casts vote with valid submission', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'voter-123' } },
      error: null,
    })

    setMockResponses([
      { data: { id: 1, status: 'voting' }, error: null }, // Challenge
      { data: { id: 100, agent_id: 1, agents: { owner_id: 'other-user' } }, error: null }, // Submission
      { data: { id: 1, weight: 5 }, error: null }, // Vote upsert
      { data: [{ weight: 5 }], error: null }, // Vote sum
      { data: null, error: null }, // Submission update
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('POST', '/api/challenges/test/votes', {
      headers: { Authorization: 'Bearer user-token' },
      body: { submission_id: 100, weight: 5 },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.vote).toBeDefined()
    expect(json.total_votes).toBe(5)
  })

  it('rejects vote without authentication', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('POST', '/api/challenges/test/votes', {
      body: { submission_id: 100 },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects vote without submission_id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'voter-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('POST', '/api/challenges/test/votes', {
      headers: { Authorization: 'Bearer user-token' },
      body: { weight: 5 },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('submission_id required')
  })

  it('rejects invalid weight', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'voter-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('POST', '/api/challenges/test/votes', {
      headers: { Authorization: 'Bearer user-token' },
      body: { submission_id: 100, weight: 15 },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Weight must be 1-10')
  })

  it('prevents voting on own submission', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'voter-123' } },
      error: null,
    })

    setMockResponses([
      { data: { id: 1 }, error: null }, // Challenge
      { data: { id: 100, agent_id: 1, agents: { owner_id: 'voter-123' } }, error: null }, // Submission owned by voter
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/votes/route')
    const request = createMockRequest('POST', '/api/challenges/test/votes', {
      headers: { Authorization: 'Bearer user-token' },
      body: { submission_id: 100 },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Cannot vote on your own submission')
  })
})

describe('GET /api/challenges/[slug]/fund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns funding history', async () => {
    const mockContributions = [
      { id: 1, amount: 50, chain: 'ethereum', tx_hash: '0x123' },
      { id: 2, amount: 30, chain: 'base', tx_hash: '0x456' },
    ]

    setMockResponses([
      { data: { id: 1, title: 'Test', prize_pool: 80 }, error: null },
      { data: mockContributions, error: null },
    ])

    const { GET } = await import('@/app/api/challenges/[slug]/fund/route')
    const request = createMockRequest('GET', '/api/challenges/test/fund')
    const params = createMockParams({ slug: 'test' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.contributions).toHaveLength(2)
    expect(json.total_contributors).toBe(2)
  })

  it('returns 404 for non-existent challenge', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/challenges/[slug]/fund/route')
    const request = createMockRequest('GET', '/api/challenges/non-existent/fund')
    const params = createMockParams({ slug: 'non-existent' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Challenge not found')
  })
})

describe('POST /api/challenges/[slug]/fund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('adds contribution with valid tx_hash', async () => {
    setMockResponses([
      { data: { id: 1, title: 'Test', status: 'funding' }, error: null }, // Challenge
      { data: null, error: { code: 'PGRST116' } }, // No existing contribution
      { data: { id: 1, amount: 50 }, error: null }, // Insert contribution
      { data: { prize_pool: 50 }, error: null }, // Updated prize pool
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/fund/route')
    const request = createMockRequest('POST', '/api/challenges/test/fund', {
      body: {
        amount: 50,
        tx_hash: '0x1234567890abcdef1234567890abcdef12345678',
        chain: 'ethereum',
      },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.contribution.amount).toBe(50)
  })

  it('rejects invalid amount', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/fund/route')
    const request = createMockRequest('POST', '/api/challenges/test/fund', {
      body: { amount: 0, tx_hash: '0x123' },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Amount must be positive')
  })

  it('rejects invalid tx_hash format', async () => {
    setMockResponses([{ data: { id: 1, title: 'Test' }, error: null }])

    const { POST } = await import('@/app/api/challenges/[slug]/fund/route')
    const request = createMockRequest('POST', '/api/challenges/test/fund', {
      body: { amount: 50, tx_hash: 'invalid-hash' },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Valid transaction hash required')
  })

  it('rejects duplicate tx_hash', async () => {
    setMockResponses([
      { data: { id: 1, title: 'Test' }, error: null }, // Challenge
      { data: { id: 99 }, error: null }, // Existing contribution found
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/fund/route')
    const request = createMockRequest('POST', '/api/challenges/test/fund', {
      body: {
        amount: 50,
        tx_hash: '0x1234567890abcdef1234567890abcdef12345678',
      },
    })
    const params = createMockParams({ slug: 'test' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('already recorded')
  })
})
