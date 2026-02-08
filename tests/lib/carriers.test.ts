import { describe, it, expect } from 'vitest';
import { 
  normalizeCarrier, 
  getGatewayEmail, 
  extractPhoneFromGateway,
  getSupportedCarriers,
  CARRIER_GATEWAYS,
  RATE_LIMITS 
} from '@/lib/carriers';

describe('carriers', () => {
  describe('normalizeCarrier', () => {
    it('should normalize exact carrier codes', () => {
      expect(normalizeCarrier('tmobile')).toBe('tmobile');
      expect(normalizeCarrier('att')).toBe('att');
      expect(normalizeCarrier('verizon')).toBe('verizon');
    });

    it('should handle aliases', () => {
      expect(normalizeCarrier('t-mobile')).toBe('tmobile');
      expect(normalizeCarrier('at&t')).toBe('att');
      expect(normalizeCarrier('google fi')).toBe('googlefi');
    });

    it('should handle case insensitivity', () => {
      expect(normalizeCarrier('TMobile')).toBe('tmobile');
      expect(normalizeCarrier('VERIZON')).toBe('verizon');
      expect(normalizeCarrier('Google Fi')).toBe('googlefi');
    });

    it('should return null for unknown carriers', () => {
      expect(normalizeCarrier('unknown')).toBeNull();
      expect(normalizeCarrier('')).toBeNull();
    });

    it('should handle fuzzy matching', () => {
      // 'T-Mobile USA' contains 'tmobile' after normalization
      expect(normalizeCarrier('tmobile usa')).toBe('tmobile');
    });
  });

  describe('getGatewayEmail', () => {
    it('should generate correct gateway email', () => {
      expect(getGatewayEmail('+15551234567', 'tmobile')).toBe('5551234567@tmomail.net');
      expect(getGatewayEmail('5551234567', 'att')).toBe('5551234567@txt.att.net');
      expect(getGatewayEmail('555-123-4567', 'verizon')).toBe('5551234567@vtext.com');
    });

    it('should handle 11-digit numbers with leading 1', () => {
      expect(getGatewayEmail('15551234567', 'tmobile')).toBe('5551234567@tmomail.net');
      expect(getGatewayEmail('+1-555-123-4567', 'att')).toBe('5551234567@txt.att.net');
    });

    it('should return null for invalid phone numbers', () => {
      expect(getGatewayEmail('123', 'tmobile')).toBeNull();
      expect(getGatewayEmail('', 'tmobile')).toBeNull();
      expect(getGatewayEmail('12345678901234', 'tmobile')).toBeNull();
    });

    it('should return null for unknown carriers', () => {
      expect(getGatewayEmail('5551234567', 'unknown')).toBeNull();
    });
  });

  describe('extractPhoneFromGateway', () => {
    it('should extract phone and carrier from gateway email', () => {
      expect(extractPhoneFromGateway('5551234567@tmomail.net')).toEqual({
        phone: '+15551234567',
        carrier: 'tmobile',
      });
      expect(extractPhoneFromGateway('5559876543@txt.att.net')).toEqual({
        phone: '+15559876543',
        carrier: 'att',
      });
    });

    it('should return null for invalid emails', () => {
      expect(extractPhoneFromGateway('invalid@email.com')).toBeNull();
      expect(extractPhoneFromGateway('5551234567@unknown.com')).toBeNull();
      expect(extractPhoneFromGateway('')).toBeNull();
    });
  });

  describe('getSupportedCarriers', () => {
    it('should return list of carriers', () => {
      const carriers = getSupportedCarriers();
      expect(carriers.length).toBeGreaterThan(5);
      expect(carriers.find(c => c.code === 'tmobile')).toBeDefined();
      expect(carriers.find(c => c.code === 'att')).toBeDefined();
    });
  });

  describe('CARRIER_GATEWAYS', () => {
    it('should have major US carriers', () => {
      expect(CARRIER_GATEWAYS.tmobile).toBeDefined();
      expect(CARRIER_GATEWAYS.att).toBeDefined();
      expect(CARRIER_GATEWAYS.verizon).toBeDefined();
      expect(CARRIER_GATEWAYS.sprint).toBeDefined();
    });

    it('should have MVNOs', () => {
      expect(CARRIER_GATEWAYS.mint).toBeDefined();
      expect(CARRIER_GATEWAYS.cricket).toBeDefined();
      expect(CARRIER_GATEWAYS.metro).toBeDefined();
    });
  });

  describe('RATE_LIMITS', () => {
    it('should have reasonable defaults', () => {
      expect(RATE_LIMITS.MESSAGES_PER_HOUR).toBe(10);
      expect(RATE_LIMITS.MESSAGES_PER_DAY).toBe(50);
      expect(RATE_LIMITS.MAX_MESSAGE_LENGTH).toBe(160);
      expect(RATE_LIMITS.MAX_UNREAD_BEFORE_PAUSE).toBe(5);
    });
  });
});
