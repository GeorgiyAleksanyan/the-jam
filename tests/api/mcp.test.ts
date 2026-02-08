/**
 * Tests for /api/mcp routes
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
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

describe('GET /api/mcp/rentals/marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('lists available agents', async () => {
    const mockProfiles = [
      {
        agent_id: 1,
        hourly_rate: 50,
        is_available: true,
        skills: ['python'],
        agent: { slug: 'agent-1', name: 'Agent 1' },
      },
    ]

    setMockResponses([{ data: mockProfiles, error: null }])

    const { GET } = await import('@/app/api/mcp/rentals/marketplace/route')
    const request = createMockRequest('GET', '/api/mcp/rentals/marketplace')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
    expect(json.agents[0].slug).toBe('agent-1')
  })

  it('filters by skill', async () => {
    const mockProfiles = [
      {
        agent: { slug: 'python-agent' },
        skills: ['python', 'django'],
      },
      {
        agent: { slug: 'js-agent' },
        skills: ['javascript'],
      },
    ]

    setMockResponses([{ data: mockProfiles, error: null }])

    const { GET } = await import('@/app/api/mcp/rentals/marketplace/route')
    const request = createMockRequest('GET', '/api/mcp/rentals/marketplace', {
      searchParams: { skill: 'Python' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
    expect(json.agents[0].slug).toBe('python-agent')
  })
})

describe('POST /api/mcp/rentals/marketplace (Request Rental)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('creates rental request with valid API key', async () => {
    const mockRequesterAgent = { id: 1, name: 'Requester', owner_id: 'owner-1' }
    const mockTargetAgent = { id: 2, owner_id: 'owner-2' }
    const mockProfile = { hourly_rate: 100, is_available: true }
    const mockRental = { id: 100, status: 'pending' }

    setMockResponses([
      { data: mockRequesterAgent, error: null }, // Validate API key
      { data: mockTargetAgent, error: null }, // Get target agent
      { data: mockProfile, error: null }, // Get profile
      { data: mockRental, error: null }, // Create rental
      { data: null, error: null }, // Notification
    ])

    const { POST } = await import('@/app/api/mcp/rentals/marketplace/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/marketplace', {
      headers: { 'x-api-key': 'valid-key' },
      body: {
        target_agent_slug: 'target-agent',
        pricing_model: 'hourly',
        task_description: 'Task',
      },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental_id).toBe(100)
    expect(json.status).toBe('pending')
  })

  it('rejects without API key', async () => {
    const { POST } = await import('@/app/api/mcp/rentals/marketplace/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/marketplace', {
      body: {},
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('API key required')
  })

  it('rejects invalid API key', async () => {
    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { POST } = await import('@/app/api/mcp/rentals/marketplace/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/marketplace', {
      headers: { 'x-api-key': 'invalid' },
      body: {},
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('Invalid API key')
  })
})

describe('GET /api/mcp/rentals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns rental details for authorized agent', async () => {
    const mockAgent = { id: 1, owner_id: 'owner-1' }
    const mockRental = {
      id: 100,
      renter_id: 'owner-1', // Agent owner is the renter
      status: 'active',
      agent: { id: 2, name: 'Provider', owner_id: 'owner-2' },
    }

    setMockResponses([
      { data: mockAgent, error: null }, // Validate API key
      { data: mockRental, error: null }, // Get rental
    ])

    const { GET } = await import('@/app/api/mcp/rentals/[id]/route')
    const request = createMockRequest('GET', '/api/mcp/rentals/100', {
      headers: { 'x-api-key': 'valid-key' },
    })
    const params = createMockParams({ id: '100' })
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental.id).toBe(100)
    expect(json.role).toBe('renter')
  })

  it('returns 403 for unauthorized agent', async () => {
    const mockAgent = { id: 3, owner_id: 'random-owner' }
    const mockRental = {
      id: 100,
      renter_id: 'owner-1',
      agent: { id: 2, owner_id: 'owner-2' },
    }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockRental, error: null },
    ])

    const { GET } = await import('@/app/api/mcp/rentals/[id]/route')
    const request = createMockRequest('GET', '/api/mcp/rentals/100', {
      headers: { 'x-api-key': 'valid-key' },
    })
    const params = createMockParams({ id: '100' })
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(403)
  })
})

describe('POST /api/mcp/rentals/[id] (Actions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('sends message', async () => {
    const mockAgent = { id: 1, owner_id: 'owner-1', name: 'Agent 1' }
    const mockRental = {
      id: 100,
      renter_id: 'owner-1',
      agent: { id: 2, owner_id: 'owner-2' },
    }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockRental, error: null },
      { data: { id: 1 }, error: null }, // Insert message
    ])

    const { POST } = await import('@/app/api/mcp/rentals/[id]/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/100', {
      headers: { 'x-api-key': 'valid-key' },
      body: { action: 'send_message', message: 'Hello' },
    })
    const params = createMockParams({ id: '100' })
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.action).toBe('message_sent')
  })

  it('approves rental (owner only)', async () => {
    const mockAgent = { id: 2, owner_id: 'owner-2' } // Provider agent
    const mockRental = {
      id: 100,
      status: 'pending',
      renter_id: 'owner-1',
      agent: { id: 2, owner_id: 'owner-2' },
    }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockRental, error: null },
      { data: null, error: null }, // Update status
    ])

    const { POST } = await import('@/app/api/mcp/rentals/[id]/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/100', {
      headers: { 'x-api-key': 'valid-key' },
      body: { action: 'approve' },
    })
    const params = createMockParams({ id: '100' })
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.new_status).toBe('approved')
  })

  it('completes rental (renter only)', async () => {
    const mockAgent = { id: 1, owner_id: 'owner-1' } // Renter
    const mockRental = {
      id: 100,
      renter_id: 'owner-1',
      status: 'active',
      agreed_price: 100,
      agent: { id: 2, owner_id: 'owner-2' },
    }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockRental, error: null },
      { data: null, error: null }, // Update status
    ])

    const { POST } = await import('@/app/api/mcp/rentals/[id]/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/100', {
      headers: { 'x-api-key': 'valid-key' },
      body: { action: 'complete' },
    })
    const params = createMockParams({ id: '100' })
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.action).toBe('completed')
  })

  it('rejects invalid action', async () => {
    const mockAgent = { id: 1, owner_id: 'owner-1' }
    const mockRental = {
      id: 100,
      renter_id: 'owner-1',
      agent: { id: 2, owner_id: 'owner-2' },
    }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockRental, error: null },
    ])

    const { POST } = await import('@/app/api/mcp/rentals/[id]/route')
    const request = createMockRequest('POST', '/api/mcp/rentals/100', {
      headers: { 'x-api-key': 'valid-key' },
      body: { action: 'invalid' },
    })
    const params = createMockParams({ id: '100' })
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid action')
  })
})


