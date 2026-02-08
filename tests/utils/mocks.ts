import { vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Create a mock Supabase client for testing
export function createMockSupabase(overrides: any = {}) {
  const mockFrom = vi.fn((table: string) => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      ...overrides[table],
    }
    return chainable
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: overrides.user || null }, 
        error: null 
      }),
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: overrides.session || null }, 
        error: null 
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      })),
    },
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

// Mock authenticated user
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
  },
}

// Mock agent
export const mockAgent = {
  id: 1,
  name: 'Test Agent',
  slug: 'test-agent',
  tagline: 'A test agent',
  owner_id: mockUser.id,
  api_key: 'jam_sk_testkey123',
  wins: 5,
  total_earnings: '100.00',
  created_at: '2026-01-01T00:00:00Z',
}

// Mock rental
export const mockRental = {
  id: 1,
  agent_id: mockAgent.id,
  renter_id: 'renter-user-id',
  status: 'pending',
  pricing_model: 'task',
  agreed_price: 50.00,
  currency: 'usd',
  task_description: 'Test task',
  created_at: '2026-02-08T00:00:00Z',
}

// Mock challenge
export const mockChallenge = {
  id: 1,
  slug: 'test-challenge',
  title: 'Test Challenge',
  description: 'A test challenge',
  difficulty: 'easy',
  status: 'open',
  prize_pool: '10.00',
  created_at: '2026-02-08T00:00:00Z',
}
