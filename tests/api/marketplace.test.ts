/**
 * Tests for /api/marketplace routes
 *
 * These are integration-style tests that verify the API route handlers
 * work correctly with mocked database responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson, createMockParams } from '../utils/request'

// ===========================================================
// MOCKS
// ===========================================================

// Mock crypto module
vi.mock('crypto', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('crypto')
  return {
    ...actual,
    default: actual,
    randomBytes: (size: number) => ({
      toString: () => 'abcdef123456',
    }),
  }
})

// Track call order for sequential responses
let callIndex = 0
let mockResponses: Array<{ data: any; error: any; count?: number }> = []

function setMockResponses(responses: Array<{ data: any; error: any | null; count?: number }>) {
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
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
    'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
    'contains', 'order', 'limit', 'range', 'overlaps', 'or', 'rpc'
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
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })), // For coalesce
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// ===========================================================
// TESTS
// ===========================================================

describe('GET /api/marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns list of available agents', async () => {
    const mockProfiles = [
      {
        agents: {
          id: 1,
          slug: 'agent-1',
          name: 'Agent 1',
          description: 'Desc 1',
          avatar_url: 'url1',
        },
        tagline: 'Tagline 1',
        skills: ['coding'],
        pricing_model: 'hourly',
        hourly_rate: 50,
        current_rentals: 0,
        max_concurrent_rentals: 5,
        avg_rating: 4.5,
      },
    ]

    setMockResponses([
      { data: mockProfiles, error: null }, // Query result
      { data: null, error: null, count: 1 }, // Count query
    ])

    const { GET } = await import('@/app/api/marketplace/route')
    const request = createMockRequest('GET', '/api/marketplace')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
    expect(json.agents[0].name).toBe('Agent 1')
    expect(json.total).toBe(1)
  })

  it('filters by skills', async () => {
    const mockProfiles = [
      {
        agents: { id: 1, slug: 'agent-1', name: 'Python Agent' },
        skills: ['python'],
        current_rentals: 0,
      },
    ]

    setMockResponses([
      { data: mockProfiles, error: null },
      { data: null, error: null, count: 1 },
    ])

    const { GET } = await import('@/app/api/marketplace/route')
    const request = createMockRequest('GET', '/api/marketplace', {
      searchParams: { skills: 'python' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
  })

  it('filters by pricing model', async () => {
    const mockProfiles = [
      {
        agents: { id: 1, slug: 'hourly-agent', name: 'Hourly Agent' },
        pricing_model: 'hourly',
        current_rentals: 0,
      },
    ]

    setMockResponses([
      { data: mockProfiles, error: null },
      { data: null, error: null, count: 1 },
    ])

    const { GET } = await import('@/app/api/marketplace/route')
    const request = createMockRequest('GET', '/api/marketplace', {
      searchParams: { pricing_model: 'hourly' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
  })

  it('filters by availability', async () => {
    const mockProfiles = [
      {
        agents: { id: 1, slug: 'avail-agent', name: 'Available Agent' },
        current_rentals: 0,
        max_concurrent_rentals: 5,
        is_available: true,
      },
    ]

    setMockResponses([
      { data: mockProfiles, error: null },
      { data: null, error: null, count: 1 },
    ])

    const { GET } = await import('@/app/api/marketplace/route')
    const request = createMockRequest('GET', '/api/marketplace', {
      searchParams: { available_now: 'true' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
  })

  it('filters by search text', async () => {
    const mockProfiles = [
      {
        agents: { id: 1, name: 'Search Match' },
        skills: [],
        current_rentals: 0,
      },
      {
        agents: { id: 2, name: 'Other Agent' },
        skills: [],
        current_rentals: 0,
      },
    ]

    setMockResponses([
      { data: mockProfiles, error: null },
      { data: null, error: null, count: 2 },
    ])

    const { GET } = await import('@/app/api/marketplace/route')
    const request = createMockRequest('GET', '/api/marketplace', {
      searchParams: { search: 'Match' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
    expect(json.agents[0].name).toBe('Search Match')
  })



  it('handles database errors gracefully', async () => {
    setMockResponses([{ data: null, error: { message: 'DB Error' } }])

    const { GET } = await import('@/app/api/marketplace/route')
    const request = createMockRequest('GET', '/api/marketplace')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to fetch marketplace')
  })
})

describe('GET /api/marketplace/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns detailed agent profile', async () => {
    const mockAgent = {
      id: 1,
      slug: 'test-agent',
      name: 'Test Agent',
      owner_id: 'owner-1',
    }

    const mockProfile = {
      agent_id: 1,
      tagline: 'Best Agent',
      skills: ['react'],
      pricing_model: 'hourly',
      hourly_rate: 100,
      is_available: true,
      current_rentals: 0,
      max_concurrent_rentals: 5,
    }

    setMockResponses([
      { data: mockAgent, error: null }, // Agent lookup
      { data: mockProfile, error: null }, // Profile lookup
      { data: [], error: null }, // Rentals lookup
    ])

    const { GET } = await import('@/app/api/marketplace/[slug]/route')
    const request = createMockRequest('GET', '/api/marketplace/test-agent')
    const params = createMockParams({ slug: 'test-agent' })
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agent.slug).toBe('test-agent')
    expect(json.agent.rental.hourly_rate).toBe(100)
  })

  it('returns 404 for non-existent agent', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/marketplace/[slug]/route')
    const request = createMockRequest('GET', '/api/marketplace/non-existent')
    const params = createMockParams({ slug: 'non-existent' })
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Agent not found')
  })

  it('returns 404 if agent has no rental profile', async () => {
    setMockResponses([
      { data: { id: 1 }, error: null }, // Agent found
      { data: null, error: { code: 'PGRST116' } }, // Profile not found
    ])

    const { GET } = await import('@/app/api/marketplace/[slug]/route')
    const request = createMockRequest('GET', '/api/marketplace/test-agent')
    const params = createMockParams({ slug: 'test-agent' })
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toContain('not available')
  })
})
