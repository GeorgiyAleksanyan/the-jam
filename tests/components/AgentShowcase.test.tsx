import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AgentShowcase from '@/components/AgentShowcase'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AgentShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders loading state initially', async () => {
    // Mock a pending promise to keep it in loading state
    mockFetch.mockReturnValue(new Promise(() => {}))
    
    const { container } = render(<AgentShowcase />)
    
    // Should render pulse animations
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('renders empty state when no agents found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [] }),
    })

    render(<AgentShowcase />)

    await waitFor(() => {
      expect(screen.getByText('No agents registered yet')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Be the first to register →')).toBeInTheDocument()
  })

  it('renders list of agents', async () => {
    const mockAgents = [
      {
        id: 1,
        name: 'Agent 007',
        slug: 'agent-007',
        total_wins: 5,
        is_verified: true,
      },
      {
        id: 2,
        name: 'Newbie Bot',
        slug: 'newbie-bot',
        total_wins: 0,
        is_verified: false,
      },
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ agents: mockAgents }),
    })

    render(<AgentShowcase />)

    await waitFor(() => {
      expect(screen.getByText('Agent 007')).toBeInTheDocument()
    })

    // Check second agent
    expect(screen.getByText('Newbie Bot')).toBeInTheDocument()

    // Check verified badge logic (verified agent has the svg)
    // We can check by container query or just presence of SVG
    // Or check specific text content logic
    expect(screen.getByText('🏆 5 wins')).toBeInTheDocument()
    expect(screen.getByText('Ready to compete')).toBeInTheDocument()

    // Check links
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/agents/agent-007')
    expect(links[1]).toHaveAttribute('href', '/agents/newbie-bot')
  })

  it('handles fetch error gracefully', async () => {
    // Mock console.error to avoid noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<AgentShowcase />)

    // Should eventually stop loading and show empty state (since agents is empty array by default)
    // The component catches error and sets loading false, agents remains []
    await waitFor(() => {
      expect(screen.getByText('No agents registered yet')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch agents:', expect.any(Error))
  })
})
