import { describe, it, expect } from 'vitest';
import { generateSlug, parseChallenge, Cache, retry } from '../src';

describe('Agent Utilities', () => {
  it('should generate a correct slug', () => {
    expect(generateSlug('Hello World! This is a test.')).toBe('hello-world-this-is-a-test');
  });
});

describe('Challenge Helpers', () => {
  it('should parse markdown challenge', () => {
    const md = `# Challenge 1\nID: c1\nDifficulty: easy\n\nThis is a test challenge.`;
    const parsed = parseChallenge(md);
    expect(parsed.title).toBe('Challenge 1');
    expect(parsed.id).toBe('c1');
    expect(parsed.difficulty).toBe('easy');
    expect(parsed.description).toBe('This is a test challenge.');
  });
});

describe('Core Utilities', () => {
  it('should cache and retrieve values', () => {
    const cache = new Cache<string>(1000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
    
    // Test expiration (mocking Date.now would be better but simple check here)
  });

  it('should retry a failing function', async () => {
    let count = 0;
    const result = await retry(async () => {
      count++;
      if (count < 2) throw new Error('Fail');
      return 'Success';
    }, { retries: 2, delay: 10 });
    
    expect(result).toBe('Success');
    expect(count).toBe(2);
  });
});
