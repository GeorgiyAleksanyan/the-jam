/**
 * Tests for /api/rentals routes
 *
 * These are integration-style tests that verify the API route handlers
 * work correctly with mocked database responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, getResponseJson, createMockParams } from '../utils/request'

// ============================================================
// MOCKS
// ============================================================

// Mock crypto module with both named and default exports
vi.mock('crypto', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('crypto')

  const mockRandomBytes = (size: number) => ({
    toString: (encoding: string) => 'abcdef123456',
  })

  const mockCreateHash = (algorithm: string) => ({
    update: function (data: string) {
      return this
    },
    digest: (encoding: string) => 'mocked-hash',
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
  digest: vi.fn().mockResolvedValue(
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
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
    'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
    'contains', 'order', 'limit', 'range',
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

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: function Stripe() {
      return {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/test',
            }),
          },
        },
      }
    }
  }
})

// ============================================================
// TESTS
// ============================================================

describe('GET /api/rentals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns rentals for authenticated user as renter', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const mockRentals = [
      { id: 1, status: 'active', agent: { name: 'Agent 1' } },
      { id: 2, status: 'completed', agent: { name: 'Agent 2' } },
    ]

    setMockResponses([{ data: mockRentals, error: null }])

    const { GET } = await import('@/app/api/rentals/route')
    const request = createMockRequest('GET', '/api/rentals')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rentals).toHaveLength(2)
  })

  it('returns rentals for authenticated user as owner', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-123' } },
      error: null,
    })

    const mockAgents = [{ id: 1 }, { id: 2 }]
    const mockRentals = [
      { id: 1, status: 'pending', agent: { name: 'My Agent' } },
    ]

    setMockResponses([
      { data: mockAgents, error: null }, // Agent lookup
      { data: mockRentals, error: null }, // Rentals lookup
    ])

    const { GET } = await import('@/app/api/rentals/route')
    const request = createMockRequest('GET', '/api/rentals', {
      searchParams: { role: 'owner' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rentals).toHaveLength(1)
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const { GET } = await import('@/app/api/rentals/route')
    const request = createMockRequest('GET', '/api/rentals')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns empty array when owner has no agents', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-no-agents' } },
      error: null,
    })

    setMockResponses([{ data: [], error: null }]) // No agents

    const { GET } = await import('@/app/api/rentals/route')
    const request = createMockRequest('GET', '/api/rentals', {
      searchParams: { role: 'owner' },
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rentals).toEqual([])
  })
})

describe('POST /api/rentals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('creates rental request with valid data', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockAgent = { id: 1, name: 'Test Agent', slug: 'test-agent', owner_id: 'owner-456' }
    const mockProfile = {
      is_available: true,
      current_rentals: 0,
      max_concurrent_rentals: 5,
      requires_approval: true,
      hourly_rate: 50,
    }
    const mockRental = { id: 1, agent_id: 1, renter_id: 'renter-123', status: 'pending' }

    setMockResponses([
      { data: mockAgent, error: null }, // Agent lookup
      { data: mockProfile, error: null }, // Profile lookup
      { data: mockRental, error: null }, // Rental insert
      { data: null, error: null }, // Notification insert
    ])

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: {
        agent_id: 1,
        pricing_model: 'hourly',
        estimated_hours: 5,
        task_description: 'Test task',
      },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental).toBeDefined()
    expect(json.requires_approval).toBe(true)
  })

  it('rejects without agent_id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: { pricing_model: 'hourly' },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('agent_id')
  })

  it('rejects without pricing_model', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: { agent_id: 1 },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('pricing_model')
  })

  it('prevents renting own agent', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-123' } },
      error: null,
    })

    const mockAgent = { id: 1, name: 'My Agent', owner_id: 'owner-123' }

    setMockResponses([{ data: mockAgent, error: null }])

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: { agent_id: 1, pricing_model: 'task' },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('own agent')
  })

  it('rejects if agent not available for rental', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockAgent = { id: 1, name: 'No Rental Agent', owner_id: 'owner-456' }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: null, error: { code: 'PGRST116' } }, // No rental profile
    ])

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: { agent_id: 1, pricing_model: 'task' },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('not available')
  })

  it('rejects if agent is unavailable', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockAgent = { id: 1, name: 'Unavailable Agent', owner_id: 'owner-456' }
    const mockProfile = { is_available: false }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockProfile, error: null },
    ])

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: { agent_id: 1, pricing_model: 'task' },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('not currently available')
  })

  it('rejects if max concurrent rentals reached', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockAgent = { id: 1, name: 'Busy Agent', owner_id: 'owner-456' }
    const mockProfile = {
      is_available: true,
      current_rentals: 3,
      max_concurrent_rentals: 3,
    }

    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockProfile, error: null },
    ])

    const { POST } = await import('@/app/api/rentals/route')
    const request = createMockRequest('POST', '/api/rentals', {
      body: { agent_id: 1, pricing_model: 'task' },
    })
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('maximum concurrent rentals')
  })
})

describe('GET /api/rentals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns rental details for renter', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'active',
      agent: { id: 1, name: 'Agent', owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null },
      { data: [], error: null }, // Messages
    ])

    const { GET } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('GET', '/api/rentals/1')
    const params = createMockParams({ id: '1' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental.status).toBe('active')
    expect(json.role).toBe('renter')
  })

  it('returns rental details for owner', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-456' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'pending',
      agent: { id: 1, name: 'My Agent', owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null },
      { data: [], error: null },
    ])

    const { GET } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('GET', '/api/rentals/1')
    const params = createMockParams({ id: '1' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.role).toBe('owner')
  })

  it('returns 403 for unauthorized user', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'random-user' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { GET } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('GET', '/api/rentals/1')
    const params = createMockParams({ id: '1' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(403)
    expect(json.error).toBe('Not authorized')
  })

  it('returns 404 for non-existent rental', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('GET', '/api/rentals/999')
    const params = createMockParams({ id: '999' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Rental not found')
  })
})

describe('PATCH /api/rentals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('approves pending rental as owner', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-456' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      agent_id: 1,
      renter_id: 'renter-123',
      status: 'pending',
      agent: { id: 1, name: 'My Agent', owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null }, // Get rental
      { data: { current_rentals: 0 }, error: null }, // Get profile
      { data: null, error: null }, // Update profile
      { data: { id: 1, status: 'approved' }, error: null }, // Update rental
      { data: null, error: null }, // Notification
    ])

    const { PATCH } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('PATCH', '/api/rentals/1', {
      body: { action: 'approve' },
    })
    const params = createMockParams({ id: '1' })

    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental.status).toBe('approved')
  })

  it('rejects rental as owner', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-456' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      agent_id: 1,
      renter_id: 'renter-123',
      status: 'pending',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null },
      { data: { id: 1, status: 'rejected' }, error: null },
      { data: null, error: null },
    ])

    const { PATCH } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('PATCH', '/api/rentals/1', {
      body: { action: 'reject' },
    })
    const params = createMockParams({ id: '1' })

    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental.status).toBe('rejected')
  })

  it('prevents renter from approving', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'pending',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { PATCH } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('PATCH', '/api/rentals/1', {
      body: { action: 'approve' },
    })
    const params = createMockParams({ id: '1' })

    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(403)
    expect(json.error).toContain('Only agent owner')
  })

  it('prevents approving non-pending rental', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'owner-456' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'active',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { PATCH } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('PATCH', '/api/rentals/1', {
      body: { action: 'approve' },
    })
    const params = createMockParams({ id: '1' })

    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('pending rentals')
  })

  it('cancels rental with reason', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'approved',
      agent: { id: 1, name: 'Agent', owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null },
      { data: { id: 1, status: 'cancelled' }, error: null },
      { data: null, error: null },
    ])

    const { PATCH } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('PATCH', '/api/rentals/1', {
      body: { action: 'cancel', reason: 'Changed my mind' },
    })
    const params = createMockParams({ id: '1' })

    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.rental.status).toBe('cancelled')
  })

  it('rejects invalid action', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'active',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { PATCH } = await import('@/app/api/rentals/[id]/route')
    const request = createMockRequest('PATCH', '/api/rentals/1', {
      body: { action: 'invalid-action' },
    })
    const params = createMockParams({ id: '1' })

    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid action')
  })
})

describe('POST /api/rentals/[id]/dispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('creates dispute with valid reason', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'active',
      agent: { id: 1, name: 'Agent', owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null }, // Get rental
      { data: null, error: { code: 'PGRST116' } }, // No existing dispute
      { data: { id: 1, status: 'open' }, error: null }, // Create dispute
      { data: null, error: null }, // Update rental status
      { data: null, error: null }, // Notification
      { data: null, error: null }, // System message
    ])

    const { POST } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('POST', '/api/rentals/1/dispute', {
      body: {
        reason: 'work_not_delivered',
        description: 'Agent did not deliver the promised work',
      },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.dispute).toBeDefined()
    expect(json.dispute.status).toBe('open')
  })

  it('rejects dispute without reason', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const { POST } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('POST', '/api/rentals/1/dispute', {
      body: { description: 'No reason provided' },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Reason and description required')
  })

  it('rejects invalid dispute reason for renter', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'active',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { POST } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('POST', '/api/rentals/1/dispute', {
      body: {
        reason: 'abusive_renter', // Owner-only reason
        description: 'Test',
      },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid reason')
  })

  it('rejects dispute if one already exists', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'active',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null },
      { data: { id: 99 }, error: null }, // Existing dispute
    ])

    const { POST } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('POST', '/api/rentals/1/dispute', {
      body: {
        reason: 'work_not_delivered',
        description: 'Test',
      },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('already exists')
  })

  it('rejects dispute for pending rental', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'pending',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { POST } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('POST', '/api/rentals/1/dispute', {
      body: {
        reason: 'work_not_delivered',
        description: 'Test',
      },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Cannot dispute')
  })
})

describe('GET /api/rentals/[id]/dispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns dispute details', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockDispute = {
      id: 1,
      rental_id: 1,
      status: 'open',
      reason: 'work_not_delivered',
    }

    setMockResponses([{ data: mockDispute, error: null }])

    const { GET } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('GET', '/api/rentals/1/dispute')
    const params = createMockParams({ id: '1' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.dispute.status).toBe('open')
  })

  it('returns 404 when no dispute exists', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    setMockResponses([{ data: null, error: { code: 'PGRST116' } }])

    const { GET } = await import('@/app/api/rentals/[id]/dispute/route')
    const request = createMockRequest('GET', '/api/rentals/1/dispute')
    const params = createMockParams({ id: '1' })

    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('No dispute found')
  })
})

describe('POST /api/rentals/[id]/pay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('creates Stripe payment session', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      agent_id: 1,
      status: 'approved',
      agreed_price: 100,
      agent: { id: 1, name: 'Agent', owner_id: 'owner-456' },
    }

    setMockResponses([
      { data: mockRental, error: null }, // Get rental
      { data: null, error: null }, // Get rental profile (no Stripe connect)
    ])

    const { POST } = await import('@/app/api/rentals/[id]/pay/route')
    const request = createMockRequest('POST', '/api/rentals/1/pay', {
      body: { payment_type: 'card' },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.url).toContain('stripe.com')
    expect(json.session_id).toBeDefined()
  })

  it('rejects payment for non-renter', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'other-user' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'approved',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { POST } = await import('@/app/api/rentals/[id]/pay/route')
    const request = createMockRequest('POST', '/api/rentals/1/pay', {
      body: { payment_type: 'card' },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(403)
    expect(json.error).toContain('Only renter')
  })

  it('rejects payment for non-approved rental', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'renter-123' } },
      error: null,
    })

    const mockRental = {
      id: 1,
      renter_id: 'renter-123',
      status: 'pending',
      agent: { id: 1, owner_id: 'owner-456' },
    }

    setMockResponses([{ data: mockRental, error: null }])

    const { POST } = await import('@/app/api/rentals/[id]/pay/route')
    const request = createMockRequest('POST', '/api/rentals/1/pay', {
      body: { payment_type: 'card' },
    })
    const params = createMockParams({ id: '1' })

    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('must be approved')
  })
})
