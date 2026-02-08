import { describe, it, expect } from 'vitest'

// Test utility functions that don't require full API mocking
describe('Utility Functions', () => {
  describe('Avatar generation', () => {
    it('should generate agent avatar with bottts style', async () => {
      const { generateAgentAvatar } = await import('@/lib/avatars')
      const avatar = generateAgentAvatar('test-agent')
      expect(avatar).toContain('api.dicebear.com')
      expect(avatar).toContain('bottts')
    })

    it('should generate identicon for users', async () => {
      const { generateIdenticon } = await import('@/lib/avatars')
      const avatar = generateIdenticon('test-seed')
      expect(avatar).toContain('api.dicebear.com')
      expect(avatar).toContain('identicon')
    })

    it('should be deterministic', async () => {
      const { generateAgentAvatar } = await import('@/lib/avatars')
      const avatar1 = generateAgentAvatar('same-seed')
      const avatar2 = generateAgentAvatar('same-seed')
      expect(avatar1).toBe(avatar2)
    })

    it('should produce different avatars for different seeds', async () => {
      const { generateAgentAvatar } = await import('@/lib/avatars')
      const avatar1 = generateAgentAvatar('seed-1')
      const avatar2 = generateAgentAvatar('seed-2')
      expect(avatar1).not.toBe(avatar2)
    })

    it('should support custom sizes', async () => {
      const { generateAgentAvatar } = await import('@/lib/avatars')
      const avatar = generateAgentAvatar('test', 256)
      expect(avatar).toContain('256')
    })
  })

  describe('Logger', () => {
    it('should have info, warn, error methods', async () => {
      const { logger } = await import('@/lib/logger')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })
  })
})

describe('Escrow Library', () => {
  it('should export ESCROW_ADDRESS', async () => {
    const escrow = await import('@/lib/escrow')
    expect(escrow.ESCROW_ADDRESS).toBeDefined()
    expect(escrow.ESCROW_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/)
  })

  it('should export RENTAL_ESCROW_ADDRESS (may be empty on mainnet)', async () => {
    const escrow = await import('@/lib/escrow')
    expect(escrow.RENTAL_ESCROW_ADDRESS).toBeDefined()
    // Can be empty string if not deployed to mainnet yet
    if (escrow.RENTAL_ESCROW_ADDRESS) {
      expect(escrow.RENTAL_ESCROW_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/)
    }
  })

  it('should export USDC_ADDRESS', async () => {
    const escrow = await import('@/lib/escrow')
    expect(escrow.USDC_ADDRESS).toBeDefined()
  })

  it('should export ERC20_ABI', async () => {
    const escrow = await import('@/lib/escrow')
    expect(escrow.ERC20_ABI).toBeDefined()
    expect(Array.isArray(escrow.ERC20_ABI)).toBe(true)
  })

  it('should export ESCROW_ADDRESSES for multiple chains', async () => {
    const escrow = await import('@/lib/escrow')
    expect(escrow.ESCROW_ADDRESSES).toBeDefined()
    expect(escrow.ESCROW_ADDRESSES[8453]).toBeDefined() // Base mainnet
    expect(escrow.ESCROW_ADDRESSES[84532]).toBeDefined() // Base sepolia
  })
})

describe('Wallet Library', () => {
  it('should export PLATFORM_WALLETS', async () => {
    const { PLATFORM_WALLETS } = await import('@/lib/wallets')
    expect(PLATFORM_WALLETS).toBeDefined()
    expect(PLATFORM_WALLETS.base).toBeDefined()
    expect(PLATFORM_WALLETS.base.address).toMatch(/^0x/)
  })

  it('should export getPlatformWallet function', async () => {
    const { getPlatformWallet } = await import('@/lib/wallets')
    const wallet = getPlatformWallet('base')
    expect(wallet).toBeDefined()
    expect(wallet.address).toMatch(/^0x/)
    expect(wallet.chainId).toBe(8453)
  })

  it('should export getDefaultWallet function', async () => {
    const { getDefaultWallet } = await import('@/lib/wallets')
    const wallet = getDefaultWallet()
    expect(wallet).toBeDefined()
    expect(wallet.address).toMatch(/^0x/)
    expect(wallet.chain).toBe('base')
  })

  it('should export USDC_CONTRACTS', async () => {
    const { USDC_CONTRACTS } = await import('@/lib/wallets')
    expect(USDC_CONTRACTS).toBeDefined()
    expect(USDC_CONTRACTS.base).toMatch(/^0x/)
  })

  it('should export getUSDCContract function', async () => {
    const { getUSDCContract } = await import('@/lib/wallets')
    const usdc = getUSDCContract('base')
    expect(usdc).toMatch(/^0x/)
  })
})
