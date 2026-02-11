import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/image
vi.mock('next/image', async () => {
  const React = await import('react')
  return {
    __esModule: true,
    default: (props: { fill?: boolean; unoptimized?: boolean; [key: string]: unknown }) => {
      const { fill, unoptimized: _unoptimized, ...rest } = props
      return React.createElement('img', { ...rest, 'data-fill': fill })
    },
  }
})

// Mock crypto module - needs to be here for API routes that import it
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return {
    ...actual,
    default: actual,  // Node's crypto has a default export
  }
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock123'
process.env.NEXT_PUBLIC_APP_URL = 'https://test.example.com'

// Suppress known console noise
const originalWarn = console.warn
console.warn = (...args) => {
  // Supabase client warning in tests
  if (typeof args[0] === 'string' && args[0].includes('Multiple GoTrueClient instances')) return
  originalWarn(...args)
}

const originalError = console.error
console.error = (...args) => {
  // Expected errors in tests
  if (typeof args[0] === 'string') {
    if (args[0].includes('Upstash rate limit error')) return
    if (args[0].includes('Challenges fetch error')) return
  }
  originalError(...args)
}
