/**
 * Tests for Deterministic Challenges & CI-based Auto-Payout
 * Issue 19: Automated Winner Selection: CI-based auto-payout for deterministic challenges
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson, createMockParams } from '../utils/request'

// Mock crypto
vi.mock('crypto', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('crypto')
  const mockRandomBytes = (_size: number) => ({
    toString: (_encoding: string) => 'abcdef123456',
  })
  const mockCreateHash = (_algorithm: string) => ({
    update: function (_data: string) { return this },
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

// Mock Web Crypto API
const mockSubtle = {
  digest: vi.fn().mockResolvedValue(new Uint8Array([0x6d, 0x6f, 0x63, 0x6b])),
}
vi.stubGlobal('crypto', {
  subtle: mockSubtle,
  getRandomValues: (arr: Uint8Array) => arr,
  timingSafeEqual: () => true,
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

function createChainable(finalResult: () => Promise<any>) {
  const chainable: any = {}
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'is', 'in', 'contains', 'order', 'limit', 'range',
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
    getUser: vi.fn(() => Promise.resolve({ data: { user: null as { id: string } | null }, error: null })),
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

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseClient,
}))

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/rate-limit-middleware', () => ({
  withRateLimit: vi.fn().mockResolvedValue(null),
}))

describe('Deterministic Challenges Creation & Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
    process.env.ADMIN_API_KEY = 'test-admin-key'
  })

  it('creates deterministic challenge with is_deterministic flag', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'creator-user-1' } },
      error: null,
    })

    setMockResponses([
      { data: null, error: { code: 'PGRST116' } }, // No existing slug
      { 
        data: { 
          id: 10, 
          slug: 'deterministic-sorting-challenge', 
          title: 'Deterministic Sorting',
          is_deterministic: true,
          status: 'open' 
        }, 
        error: null 
      }, // Insert
    ])

    const { POST } = await import('@/app/api/challenges/route')
    const request = createMockRequest('POST', '/api/challenges', {
      headers: { Authorization: 'Bearer user-token' },
      body: {
        title: 'Deterministic Sorting',
        slug: 'deterministic-sorting-challenge',
        description: 'Objective challenge with deterministic test suite',
        difficulty: 'medium',
        prize_pool: 250,
        is_deterministic: true,
      },
    })

    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(201)
    expect(json.challenge).toBeDefined()
    expect(json.challenge.is_deterministic).toBe(true)
  })
})

describe('POST /api/challenges/[slug]/ci-payout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
    process.env.ADMIN_API_KEY = 'test-admin-key'
  })

  it('rejects unauthorized requests without valid admin token', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/det-challenge/ci-payout', {
      headers: { Authorization: 'Bearer invalid-token' },
      body: { pr_number: 42, ci_status: 'success' },
    })
    const params = createMockParams({ slug: 'det-challenge' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects requests missing pr_number', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/det-challenge/ci-payout', {
      headers: { Authorization: 'Bearer test-admin-key' },
      body: { ci_status: 'success' },
    })
    const params = createMockParams({ slug: 'det-challenge' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('pr_number is required')
  })

  it('rejects invalid ci_status values', async () => {
    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/det-challenge/ci-payout', {
      headers: { Authorization: 'Bearer test-admin-key' },
      body: { pr_number: 42, ci_status: 'pending' },
    })
    const params = createMockParams({ slug: 'det-challenge' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('ci_status must be either "success" or "failure"')
  })

  it('returns 404 for non-existent challenge', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/unknown-challenge/ci-payout', {
      headers: { Authorization: 'Bearer test-admin-key' },
      body: { pr_number: 42, ci_status: 'success' },
    })
    const params = createMockParams({ slug: 'unknown-challenge' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Challenge not found')
  })

  it('rejects non-deterministic subjective challenges', async () => {
    setMockResponses([
      {
        data: {
          id: 1,
          slug: 'subjective-ui-challenge',
          is_deterministic: false,
          github_labels: ['enhancement', 'ui'],
        },
        error: null,
      },
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/subjective-ui-challenge/ci-payout', {
      headers: { Authorization: 'Bearer test-admin-key' },
      body: { pr_number: 42, ci_status: 'success' },
    })
    const params = createMockParams({ slug: 'subjective-ui-challenge' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('only available for deterministic challenges')
  })

  it('handles CI failure without selecting winner or paying', async () => {
    const mockChallenge = {
      id: 5,
      slug: 'deterministic-algo',
      title: 'Deterministic Algo',
      status: 'open',
      prize_pool: 500,
      is_deterministic: true,
    }

    const mockSubmission = {
      id: 20,
      agent_id: 3,
      status: 'pending',
      github_pr_number: 42,
    }

    setMockResponses([
      { data: mockChallenge, error: null }, // Challenge lookup
      { data: mockSubmission, error: null }, // Submission lookup
      { data: null, error: null }, // Submission logs update
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/deterministic-algo/ci-payout', {
      headers: { Authorization: 'Bearer test-admin-key' },
      body: {
        pr_number: 42,
        ci_status: 'failure',
        notes: '2 out of 10 test cases failed',
      },
    })
    const params = createMockParams({ slug: 'deterministic-algo' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(false)
    expect(json.status).toBe('ci_failed')
    expect(json.message).toContain('CI tests failed')
  })

  it('successfully auto-selects winner and queues payout on passing CI for deterministic challenge', async () => {
    const mockChallenge = {
      id: 5,
      slug: 'deterministic-algo',
      title: 'Deterministic Algo',
      status: 'open',
      prize_pool: 500,
      winner_agent_id: null,
      is_deterministic: true,
      github_labels: ['deterministic', 'bounty'],
    }

    const mockSubmission = {
      id: 20,
      agent_id: 3,
      status: 'pending',
      github_pr_number: 42,
      github_pr_state: 'merged',
      agents: {
        id: 3,
        name: 'AutoSolverBot',
        slug: 'autosolver-bot',
        wallet_address: '0xF46C9F6d70C50BF81ef3588AB523a90a594a2F89',
        wallet_chain: 'base',
        owner_id: 'user-owner-123',
      },
    }

    setMockResponses([
      { data: mockChallenge, error: null }, // Challenge lookup
      { data: mockSubmission, error: null }, // Submission lookup
      { data: null, error: null }, // Submission update (ci_status)
      { data: null, error: null }, // Pending payout upsert
      { data: null, error: null }, // Challenge update (closed, winner)
      { data: null, error: null }, // Submission update (is_winner)
      { data: { total_wins: 2, total_earnings: 1000 }, error: null }, // Agent stats lookup
      { data: null, error: null }, // Agent stats update
      { data: null, error: null }, // Notification insert
    ])

    const { POST } = await import('@/app/api/challenges/[slug]/ci-payout/route')
    const request = createMockRequest('POST', '/api/challenges/deterministic-algo/ci-payout', {
      headers: { Authorization: 'Bearer test-admin-key' },
      body: {
        pr_number: 42,
        ci_status: 'success',
        test_results: { passed: 25, failed: 0 },
      },
    })
    const params = createMockParams({ slug: 'deterministic-algo' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.action).toBe('winner_selected_and_paid')
    expect(json.winner.name).toBe('AutoSolverBot')
    expect(json.winner.wallet_address).toBe('0xF46C9F6d70C50BF81ef3588AB523a90a594a2F89')
    expect(json.prize_pool).toBe(500)
    expect(json.winner_amount).toBe(475) // 500 * 0.95
  })
})
