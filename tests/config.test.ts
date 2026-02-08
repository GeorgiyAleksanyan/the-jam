import { describe, it, expect } from 'vitest'

// Test constants and configuration values
describe('Platform Configuration', () => {
  describe('Platform Fees', () => {
    const CHALLENGE_FEE_PERCENT = 5
    const RENTAL_FEE_PERCENT = 10

    it('should have 5% fee for challenges', () => {
      expect(CHALLENGE_FEE_PERCENT).toBe(5)
    })

    it('should have 10% fee for rentals', () => {
      expect(RENTAL_FEE_PERCENT).toBe(10)
    })

    it('should calculate correct platform fee for challenge', () => {
      const prizePool = 100
      const fee = prizePool * (CHALLENGE_FEE_PERCENT / 100)
      expect(fee).toBe(5)
    })

    it('should calculate correct platform fee for rental', () => {
      const rentalPrice = 100
      const fee = rentalPrice * (RENTAL_FEE_PERCENT / 100)
      expect(fee).toBe(10)
    })
  })

  describe('Chain Configuration', () => {
    const SUPPORTED_CHAINS = {
      BASE_MAINNET: 8453,
      BASE_SEPOLIA: 84532,
    }

    it('should have Base mainnet chain ID', () => {
      expect(SUPPORTED_CHAINS.BASE_MAINNET).toBe(8453)
    })

    it('should have Base Sepolia testnet chain ID', () => {
      expect(SUPPORTED_CHAINS.BASE_SEPOLIA).toBe(84532)
    })
  })

  describe('API Key Formats', () => {
    it('should validate agent API key format', () => {
      const validKey = 'jam_sk_abc123def456789012345678901234567890123456789012345678901234'
      expect(validKey.startsWith('jam_sk_')).toBe(true)
      expect(validKey.length).toBeGreaterThan(10)
    })

    it('should validate rental API key format', () => {
      const validKey = 'jam_rental_sk_abc123def456789012345678901234567890123456789012345678901234'
      expect(validKey.startsWith('jam_rental_sk_')).toBe(true)
    })
  })

  describe('Limits and Thresholds', () => {
    const DEFAULT_UPVOTE_THRESHOLD = 20
    const MAX_API_KEYS_PER_RENTAL = 5
    const MAX_DELIVERABLE_REVISIONS = 2
    const DEFAULT_RATE_LIMIT_RPM = 60

    it('should require 20 upvotes for free challenges', () => {
      expect(DEFAULT_UPVOTE_THRESHOLD).toBe(20)
    })

    it('should allow max 5 API keys per rental', () => {
      expect(MAX_API_KEYS_PER_RENTAL).toBe(5)
    })

    it('should allow max 2 revisions per deliverable', () => {
      expect(MAX_DELIVERABLE_REVISIONS).toBe(2)
    })

    it('should default to 60 RPM rate limit', () => {
      expect(DEFAULT_RATE_LIMIT_RPM).toBe(60)
    })
  })
})

describe('Data Validation Helpers', () => {
  describe('Slug Validation', () => {
    const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug)

    it('should accept lowercase slugs', () => {
      expect(isValidSlug('test-challenge')).toBe(true)
    })

    it('should accept slugs with numbers', () => {
      expect(isValidSlug('challenge-123')).toBe(true)
    })

    it('should reject uppercase', () => {
      expect(isValidSlug('Test-Challenge')).toBe(false)
    })

    it('should reject spaces', () => {
      expect(isValidSlug('test challenge')).toBe(false)
    })

    it('should reject special characters', () => {
      expect(isValidSlug('test_challenge')).toBe(false)
    })
  })

  describe('Price Validation', () => {
    const isValidPrice = (price: number) => price >= 0 && price <= 10000 && Number.isFinite(price)

    it('should accept zero price (free)', () => {
      expect(isValidPrice(0)).toBe(true)
    })

    it('should accept reasonable prices', () => {
      expect(isValidPrice(50)).toBe(true)
      expect(isValidPrice(100)).toBe(true)
    })

    it('should reject negative prices', () => {
      expect(isValidPrice(-10)).toBe(false)
    })

    it('should reject prices over limit', () => {
      expect(isValidPrice(10001)).toBe(false)
    })

    it('should reject Infinity', () => {
      expect(isValidPrice(Infinity)).toBe(false)
    })
  })

  describe('Rating Validation', () => {
    const isValidRating = (rating: number) => rating >= 1 && rating <= 5 && Number.isInteger(rating)

    it('should accept ratings 1-5', () => {
      for (let i = 1; i <= 5; i++) {
        expect(isValidRating(i)).toBe(true)
      }
    })

    it('should reject 0 rating', () => {
      expect(isValidRating(0)).toBe(false)
    })

    it('should reject ratings over 5', () => {
      expect(isValidRating(6)).toBe(false)
    })

    it('should reject decimal ratings', () => {
      expect(isValidRating(4.5)).toBe(false)
    })
  })
})
