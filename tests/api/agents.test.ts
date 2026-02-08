/**
 * Tests for /api/agents routes
 * 
 * These are integration-style tests that verify the API route handlers
 * work correctly with mocked database responses.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { createMockRequest, getResponseJson, createMockParams } from '../utils/request'

// ============================================================
// MOCKS
// ============================================================

// Mock crypto module with both named and default exports
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('crypto')
  
  const mockRandomBytes = (size: number) => ({
    toString: (encoding: string) => 'abcdef123456'
  })
  
  const mockCreateHash = (algorithm: string) => ({
    update: function(data: string) { return this },
    digest: (encoding: string) => 'mocked-hash'
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

// Mock Web Crypto API's subtle.digest (used in [slug]/route.ts for hashing API keys)
// The result converts to '6d6f636b65642d68617368' as hex
const mockSubtle = {
  digest: vi.fn().mockResolvedValue(new Uint8Array([0x6d, 0x6f, 0x63, 0x6b, 0x65, 0x64, 0x2d, 0x68, 0x61, 0x73, 0x68])),
}

// Override crypto.subtle using vi.stubGlobal
vi.stubGlobal('crypto', {
  subtle: mockSubtle,
  getRandomValues: (arr: Uint8Array) => arr,
})

// Chainable mock that returns this for all chain methods
function createChainable(finalResult: () => Promise<any>) {
  const chainable: any = {}
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 
                   'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 
                   'contains', 'order', 'limit', 'range']
  
  methods.forEach(method => {
    chainable[method] = vi.fn(() => chainable)
  })
  
  // Terminal methods
  chainable.single = vi.fn(() => finalResult())
  chainable.maybeSingle = vi.fn(() => finalResult())
  
  // Make it thenable for direct await
  chainable.then = (resolve: any) => finalResult().then(resolve)
  
  return chainable
}

// Create mock data store
let mockDataStore: Record<string, any> = {}

// Helper to set up mock responses
function setMockResponse(key: string, data: any, error: any = null) {
  mockDataStore[key] = { data, error }
}

function getMockResponse(key: string) {
  return mockDataStore[key] || { data: null, error: null }
}

// Track call order for sequential responses
let callIndex = 0
let mockResponses: Array<{ data: any, error: any }> = []

function setMockResponses(responses: Array<{ data: any, error: any | null }>) {
  mockResponses = responses
  callIndex = 0
}

function getNextMockResponse() {
  const response = mockResponses[callIndex] || { data: null, error: null }
  callIndex++
  return response
}

// Create the mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => createChainable(() => Promise.resolve(getNextMockResponse()))),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
}

// Mock Supabase modules
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
  createBrowserClient: vi.fn(() => mockSupabaseClient),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
    get: vi.fn(),
  })),
}))

// Mock lib/supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseClient,
}))

// Mock lib/avatars
vi.mock('@/lib/avatars', () => ({
  generateAgentAvatar: vi.fn(() => 'https://api.dicebear.com/7.x/bottts/svg?seed=test')
}))

// Mock lib/logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}))

// ============================================================
// TESTS
// ============================================================

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns list of active agents', async () => {
    const mockAgents = [
      { id: 1, name: 'Agent 1', slug: 'agent-1', is_active: true, claimed: true },
      { id: 2, name: 'Agent 2', slug: 'agent-2', is_active: true, claimed: true },
    ]
    
    setMockResponses([{ data: mockAgents, error: null }])

    const { GET } = await import('@/app/api/agents/route')
    const request = createMockRequest('GET', '/api/agents')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(2)
    expect(json.agents[0].name).toBe('Agent 1')
  })

  it('filters by owner when owner param provided', async () => {
    const mockAgents = [
      { id: 1, name: 'My Agent', slug: 'my-agent', owner_id: 'user-123' },
    ]
    
    setMockResponses([{ data: mockAgents, error: null }])

    const { GET } = await import('@/app/api/agents/route')
    const request = createMockRequest('GET', '/api/agents', {
      searchParams: { owner: 'user-123' }
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
  })

  it('filters by slug when slug param provided', async () => {
    const mockAgents = [
      { id: 1, name: 'Specific Agent', slug: 'specific-agent' },
    ]
    
    setMockResponses([{ data: mockAgents, error: null }])

    const { GET } = await import('@/app/api/agents/route')
    const request = createMockRequest('GET', '/api/agents', {
      searchParams: { slug: 'specific-agent' }
    })
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toHaveLength(1)
  })

  it('returns 500 on database error', async () => {
    setMockResponses([{ data: null, error: { message: 'DB error' } }])

    const { GET } = await import('@/app/api/agents/route')
    const request = createMockRequest('GET', '/api/agents')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to fetch agents')
  })

  it('returns empty array when no agents found', async () => {
    setMockResponses([{ data: [], error: null }])

    const { GET } = await import('@/app/api/agents/route')
    const request = createMockRequest('GET', '/api/agents')
    const response = await GET(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agents).toEqual([])
  })
})

describe('POST /api/agents/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('registers a new agent with valid data', async () => {
    // First query checks for existing agent (none found)
    // Second query inserts new agent
    setMockResponses([
      { data: null, error: { code: 'PGRST116' } }, // No existing agent
      { data: { id: 1, slug: 'test-agent-abcdef' }, error: null }, // Insert result
    ])

    const { POST } = await import('@/app/api/agents/register/route')
    const request = createMockRequest('POST', '/api/agents/register', {
      body: {
        name: 'Test Agent',
        description: 'A test agent for testing',
        capabilities: ['code', 'chat'],
      }
    })
    
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agent_id).toBe(1)
    expect(json.slug).toBe('test-agent-abcdef')
    expect(json.api_key).toContain('jam_sk_')
    expect(json.claim_url).toContain('/claim/')
  })

  it('rejects registration without name', async () => {
    const { POST } = await import('@/app/api/agents/register/route')
    const request = createMockRequest('POST', '/api/agents/register', {
      body: { description: 'No name provided' }
    })
    
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('name is required')
  })

  it('rejects name that is too short', async () => {
    const { POST } = await import('@/app/api/agents/register/route')
    const request = createMockRequest('POST', '/api/agents/register', {
      body: { name: 'X' }
    })
    
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('min 2 characters')
  })

  it('rejects duplicate agent name', async () => {
    setMockResponses([
      { data: { id: 99 }, error: null }, // Existing agent found
    ])

    const { POST } = await import('@/app/api/agents/register/route')
    const request = createMockRequest('POST', '/api/agents/register', {
      body: { name: 'Existing Agent' }
    })
    
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(409)
    expect(json.error).toContain('already exists')
  })

  it('validates wallet_chain if provided', async () => {
    const { POST } = await import('@/app/api/agents/register/route')
    const request = createMockRequest('POST', '/api/agents/register', {
      body: {
        name: 'Wallet Agent',
        wallet_address: '0x123',
        wallet_chain: 'invalid-chain'
      }
    })
    
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid wallet_chain')
  })

  it('accepts valid wallet_chain', async () => {
    setMockResponses([
      { data: null, error: { code: 'PGRST116' } },
      { data: { id: 1, slug: 'wallet-agent' }, error: null },
    ])

    const { POST } = await import('@/app/api/agents/register/route')
    const request = createMockRequest('POST', '/api/agents/register', {
      body: {
        name: 'Wallet Agent',
        wallet_address: '0x1234567890abcdef',
        wallet_chain: 'ethereum'
      }
    })
    
    const response = await POST(request)
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agent_id).toBe(1)
  })
})

describe('GET /api/agents/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns agent by slug', async () => {
    const mockAgent = {
      id: 1,
      name: 'Test Agent',
      slug: 'test-agent',
      description: 'A test agent',
      is_active: true,
      claimed: true,
    }
    
    setMockResponses([
      { data: mockAgent, error: null }, // Agent lookup
      { data: [], error: null }, // Submissions lookup
    ])

    const { GET } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('GET', '/api/agents/test-agent')
    const params = createMockParams({ slug: 'test-agent' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agent.name).toBe('Test Agent')
    expect(json.agent.slug).toBe('test-agent')
  })

  it('returns agent by numeric ID', async () => {
    const mockAgent = {
      id: 123,
      name: 'Agent By ID',
      slug: 'agent-by-id',
    }
    
    setMockResponses([
      { data: mockAgent, error: null },
      { data: [], error: null },
    ])

    const { GET } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('GET', '/api/agents/123')
    const params = createMockParams({ slug: '123' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agent.id).toBe(123)
  })

  it('returns 404 for non-existent agent', async () => {
    setMockResponses([
      { data: null, error: { code: 'PGRST116' } },
    ])

    const { GET } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('GET', '/api/agents/non-existent')
    const params = createMockParams({ slug: 'non-existent' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('Agent not found')
  })

  it('includes recent submissions', async () => {
    const mockAgent = { id: 1, name: 'Active Agent', slug: 'active-agent' }
    const mockSubmissions = [
      { id: 1, challenge_id: 1, status: 'pending', is_winner: false },
      { id: 2, challenge_id: 2, status: 'accepted', is_winner: true },
    ]
    
    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockSubmissions, error: null },
    ])

    const { GET } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('GET', '/api/agents/active-agent')
    const params = createMockParams({ slug: 'active-agent' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.submissions).toHaveLength(2)
    expect(json.submissions[1].is_winner).toBe(true)
  })
})

describe('PATCH /api/agents/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('updates agent with valid API key', async () => {
    const mockAgent = {
      id: 1,
      slug: 'test-agent',
      owner_id: 'user-123',
      api_key_hash: '6d6f636b65642d68617368', // matches our crypto.subtle mock
      metadata: {},
    }
    
    setMockResponses([
      { data: mockAgent, error: null }, // Find agent
      { data: null, error: null }, // Update
      { data: { ...mockAgent, description: 'Updated' }, error: null }, // Fetch updated
    ])

    const { PATCH } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('PATCH', '/api/agents/test-agent', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' },
      body: { description: 'Updated description' }
    })
    const params = createMockParams({ slug: 'test-agent' })
    
    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('rejects update without authorization', async () => {
    const mockAgent = {
      id: 1,
      slug: 'test-agent',
      owner_id: 'user-123',
      api_key_hash: 'different-hash',
      metadata: {},
    }
    
    setMockResponses([
      { data: mockAgent, error: null },
    ])
    
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ 
      data: { user: null }, 
      error: null 
    })

    const { PATCH } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('PATCH', '/api/agents/test-agent', {
      body: { description: 'Unauthorized update' }
    })
    const params = createMockParams({ slug: 'test-agent' })
    
    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 404 for non-existent agent', async () => {
    setMockResponses([
      { data: null, error: { code: 'PGRST116' } },
    ])

    const { PATCH } = await import('@/app/api/agents/[slug]/route')
    const request = createMockRequest('PATCH', '/api/agents/non-existent', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' },
      body: { description: 'Update' }
    })
    const params = createMockParams({ slug: 'non-existent' })
    
    const response = await PATCH(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
  })
})

describe('POST /api/agents/[slug]/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('claims agent with valid token', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const mockAgent = {
      id: 1,
      name: 'Unclaimed Agent',
      claimed: false,
      claim_token: 'valid-token',
      claim_expires_at: futureDate,
    }
    
    setMockResponses([
      { data: mockAgent, error: null }, // Get agent
      { data: null, error: null }, // Update claim
    ])
    
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const { POST } = await import('@/app/api/agents/[slug]/claim/route')
    const request = createMockRequest('POST', '/api/agents/1/claim', {
      headers: { 'Authorization': 'Bearer valid-user-token' },
      body: { token: 'valid-token' }
    })
    const params = createMockParams({ slug: '1' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toContain('claimed successfully')
  })

  it('rejects claim without token', async () => {
    const { POST } = await import('@/app/api/agents/[slug]/claim/route')
    const request = createMockRequest('POST', '/api/agents/1/claim', {
      headers: { 'Authorization': 'Bearer valid-user-token' },
      body: {}
    })
    const params = createMockParams({ slug: '1' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('token required')
  })

  it('rejects claim without authentication', async () => {
    const { POST } = await import('@/app/api/agents/[slug]/claim/route')
    const request = createMockRequest('POST', '/api/agents/1/claim', {
      body: { token: 'valid-token' }
    })
    const params = createMockParams({ slug: '1' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(401)
  })

  it('rejects claim for already claimed agent', async () => {
    const mockAgent = {
      id: 1,
      name: 'Already Claimed',
      claimed: true,
      claim_token: 'valid-token',
    }
    
    setMockResponses([
      { data: mockAgent, error: null },
    ])
    
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const { POST } = await import('@/app/api/agents/[slug]/claim/route')
    const request = createMockRequest('POST', '/api/agents/1/claim', {
      headers: { 'Authorization': 'Bearer valid-user-token' },
      body: { token: 'valid-token' }
    })
    const params = createMockParams({ slug: '1' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('already been claimed')
  })

  it('rejects claim with invalid token', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const mockAgent = {
      id: 1,
      name: 'Unclaimed Agent',
      claimed: false,
      claim_token: 'correct-token',
      claim_expires_at: futureDate,
    }
    
    setMockResponses([
      { data: mockAgent, error: null },
    ])
    
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const { POST } = await import('@/app/api/agents/[slug]/claim/route')
    const request = createMockRequest('POST', '/api/agents/1/claim', {
      headers: { 'Authorization': 'Bearer valid-user-token' },
      body: { token: 'wrong-token' }
    })
    const params = createMockParams({ slug: '1' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid claim token')
  })

  it('rejects expired claim token', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const mockAgent = {
      id: 1,
      name: 'Expired Claim',
      claimed: false,
      claim_token: 'valid-token',
      claim_expires_at: pastDate,
    }
    
    setMockResponses([
      { data: mockAgent, error: null },
    ])
    
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null
    })

    const { POST } = await import('@/app/api/agents/[slug]/claim/route')
    const request = createMockRequest('POST', '/api/agents/1/claim', {
      headers: { 'Authorization': 'Bearer valid-user-token' },
      body: { token: 'valid-token' }
    })
    const params = createMockParams({ slug: '1' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('expired')
  })
})

describe('GET /api/agents/by-github/[username]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns agent linked to GitHub username', async () => {
    const mockLink = { agent_id: 1 }
    const mockAgent = {
      id: 1,
      name: 'GitHub Agent',
      slug: 'github-agent',
      avatar_url: 'https://example.com/avatar.png',
    }
    
    setMockResponses([
      { data: mockLink, error: null }, // Link lookup
      { data: mockAgent, error: null }, // Agent lookup
    ])

    const { GET } = await import('@/app/api/agents/by-github/[username]/route')
    const request = createMockRequest('GET', '/api/agents/by-github/testuser')
    const params = createMockParams({ username: 'testuser' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.registered).toBe(true)
    expect(json.agent.name).toBe('GitHub Agent')
  })

  it('returns 404 for unregistered GitHub user', async () => {
    setMockResponses([
      { data: null, error: null },
    ])

    const { GET } = await import('@/app/api/agents/by-github/[username]/route')
    const request = createMockRequest('GET', '/api/agents/by-github/unknown')
    const params = createMockParams({ username: 'unknown' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
    expect(json.error).toBe('User not registered')
  })
})

describe('POST /api/agents/[slug]/link-github', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('links GitHub username to agent', async () => {
    const mockAgent = {
      id: 1,
      name: 'Link Agent',
      owner_id: 'user-123',
    }
    
    setMockResponses([
      { data: mockAgent, error: null }, // Find agent
      { data: { id: 1 }, error: null }, // API key auth check
      { data: null, error: null }, // Existing link check (none found)
      { data: { verified: false }, error: null }, // Upsert result
    ])

    const { POST } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('POST', '/api/agents/link-agent/link-github', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' },
      body: { github_username: 'testuser' }
    })
    const params = createMockParams({ slug: 'link-agent' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.link.github_username).toBe('testuser')
  })

  it('rejects without github_username', async () => {
    const { POST } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('POST', '/api/agents/link-agent/link-github', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' },
      body: {}
    })
    const params = createMockParams({ slug: 'link-agent' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('github_username is required')
  })

  it('cleans @ prefix from username', async () => {
    const mockAgent = { id: 1, name: 'Link Agent', owner_id: 'user-123' }
    
    setMockResponses([
      { data: mockAgent, error: null },
      { data: { id: 1 }, error: null },
      { data: null, error: null },
      { data: { verified: false }, error: null },
    ])

    const { POST } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('POST', '/api/agents/link-agent/link-github', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' },
      body: { github_username: '@testuser' }
    })
    const params = createMockParams({ slug: 'link-agent' })
    
    const response = await POST(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.link.github_username).toBe('testuser')
  })
})

describe('GET /api/agents/[slug]/link-github', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('returns linked GitHub accounts', async () => {
    const mockAgent = { id: 1, name: 'Agent With Links' }
    const mockLinks = [
      { github_username: 'user1', verified: true, created_at: '2026-01-01' },
      { github_username: 'user2', verified: false, created_at: '2026-01-02' },
    ]
    
    setMockResponses([
      { data: mockAgent, error: null },
      { data: mockLinks, error: null },
    ])

    const { GET } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('GET', '/api/agents/test-agent/link-github')
    const params = createMockParams({ slug: 'test-agent' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.agent.name).toBe('Agent With Links')
    expect(json.github_accounts).toHaveLength(2)
  })

  it('returns 404 for non-existent agent', async () => {
    setMockResponses([
      { data: null, error: { code: 'PGRST116' } },
    ])

    const { GET } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('GET', '/api/agents/non-existent/link-github')
    const params = createMockParams({ slug: 'non-existent' })
    
    const response = await GET(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/agents/[slug]/link-github', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = []
    callIndex = 0
  })

  it('unlinks GitHub username', async () => {
    const mockAgent = { id: 1, owner_id: 'user-123' }
    
    setMockResponses([
      { data: mockAgent, error: null }, // Find agent
      { data: { id: 1 }, error: null }, // API key auth check
      { data: null, error: null }, // Delete result
    ])

    const { DELETE } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('DELETE', '/api/agents/test-agent/link-github?github_username=testuser', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' },
      searchParams: { github_username: 'testuser' }
    })
    const params = createMockParams({ slug: 'test-agent' })
    
    const response = await DELETE(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('rejects without github_username param', async () => {
    const { DELETE } = await import('@/app/api/agents/[slug]/link-github/route')
    const request = createMockRequest('DELETE', '/api/agents/test-agent/link-github', {
      headers: { 'Authorization': 'Bearer jam_sk_testkey123' }
    })
    const params = createMockParams({ slug: 'test-agent' })
    
    const response = await DELETE(request, { params })
    const json = await getResponseJson(response)

    expect(response.status).toBe(400)
    expect(json.error).toContain('github_username query param is required')
  })
})
