import { JamUtils } from '../src/utils';

describe('JamUtils', () => {
  describe('parseChallenge', () => {
    it('should parse equation from challenge text', () => {
      const result = JamUtils.parseChallenge('Solve for x: 2x + 5 = 15');
      expect(result.equation).toBe('2x + 5 = 15');
    });
  });

  describe('isValidResponse', () => {
    it('should return true for non-empty response', () => {
      expect(JamUtils.isValidResponse('answer')).toBe(true);
    });

    it('should return false for empty response', () => {
      expect(JamUtils.isValidResponse('')).toBe(false);
    });

    it('should validate against pattern when provided', () => {
      expect(JamUtils.isValidResponse('42', /^\d+$/)).toBe(true);
      expect(JamUtils.isValidResponse('abc', /^\d+$/)).toBe(false);
    });
  });

  describe('validateSubmission', () => {
    it('should validate correct submission', () => {
      const result = JamUtils.validateSubmission({
        challengeId: 'ch-123',
        solution: 'answer'
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject missing challengeId', () => {
      const result = JamUtils.validateSubmission({
        challengeId: '',
        solution: 'answer'
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('challengeId');
    });

    it('should reject empty solution', () => {
      const result = JamUtils.validateSubmission({
        challengeId: 'ch-123',
        solution: '   '
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('formatSolution', () => {
    it('should format solution with metadata', () => {
      const result = JamUtils.formatSolution('42', {
        agentId: 'agent-1',
        reasoning: 'calculated'
      });
      expect(result.solution).toBe('42');
      expect(result.metadata?.agentId).toBe('agent-1');
      expect(result.metadata?.timestamp).toBeDefined();
    });
  });

  describe('generateSlug', () => {
    it('should create URL-friendly slug', () => {
      expect(JamUtils.generateSlug('Hello World!')).toBe('hello-world');
      expect(JamUtils.generateSlug('  Test_String  ')).toBe('test-string');
    });
  });

  describe('hashApiKey', () => {
    it('should mask API key safely', () => {
      const result = JamUtils.hashApiKey('abcdefghijklmnop');
      expect(result).toBe('abcd...mnop');
    });

    it('should handle short keys', () => {
      expect(JamUtils.hashApiKey('short')).toBe('****');
    });
  });

  describe('parseAgentResponse', () => {
    it('should parse explicit solution', () => {
      const result = JamUtils.parseAgentResponse('Solution: 42');
      expect(result.solution).toBe('42');
    });

    it('should fall back to last line', () => {
      const result = JamUtils.parseAgentResponse('Thinking...\n42');
      expect(result.solution).toBe('42');
    });

    it('should extract confidence', () => {
      const result = JamUtils.parseAgentResponse('Solution: 42\nConfidence: 0.95');
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await JamUtils.retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const result = await JamUtils.retry(fn, 2, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createCache', () => {
    it('should store and retrieve values', () => {
      const cache = JamUtils.createCache(1000);
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should expire values after TTL', async () => {
      const cache = JamUtils.createCache(50);
      cache.set('key', 'value');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key')).toBeUndefined();
    });
  });
});
