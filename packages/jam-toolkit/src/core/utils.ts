/**
 * Simple retry with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number; factor?: number } = { retries: 3, delay: 1000, factor: 2 }
): Promise<T> {
  let attempt = 0;
  const { retries, delay, factor = 2 } = options;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const waitTime = delay * Math.pow(factor, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      attempt++;
    }
  }
  throw new Error('Retry failed');
}

/**
 * Basic Rate Limiter
 */
export class RateLimiter {
  private queue: (() => void)[] = [];
  private activeCount = 0;

  constructor(private limit: number, private interval: number) {}

  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    await this.wait();
    try {
      return await fn();
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private wait(): Promise<void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeCount < this.limit) {
      const next = this.queue.shift();
      if (next) {
        this.activeCount++;
        setTimeout(next, this.interval);
      }
    }
  }
}

/**
 * Simple In-Memory Cache with TTL
 */
export class Cache<T> {
  private store = new Map<string, { value: T; expires: number }>();

  constructor(private defaultTtlMs: number = 60000) {}

  set(key: string, value: T, ttlMs?: number): void {
    const expires = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expires });
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
