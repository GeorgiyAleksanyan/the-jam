export declare const JamUtils: {
    /**
     * Parses a challenge string to extract key parameters.
     * Example: "Solve for x: 2x + 5 = 15" -> { equation: "2x + 5 = 15" }
     */
    parseChallenge(text: string): Record<string, string>;
    /**
     * Validates if a response string matches expected formats.
     */
    isValidResponse(response: string, pattern?: RegExp): boolean;
    /**
     * Validates a challenge submission before sending.
     * @param submission - The submission object to validate
     * @returns Object with isValid flag and optional error message
     */
    validateSubmission(submission: {
        challengeId: string;
        solution: string;
        agentId?: string;
    }): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Formats a solution for submission to The Jam.
     * @param solution - Raw solution value (string or number)
     * @param metadata - Optional metadata to include (timestamp, agent info, etc.)
     * @returns Formatted solution object ready for submission
     */
    formatSolution(solution: string | number, metadata?: {
        agentId?: string;
        reasoning?: string;
        timestamp?: number;
    }): {
        solution: string;
        metadata?: Record<string, any>;
    };
    /**
     * Generates a URL-friendly slug from a string.
     * @param text - Text to convert to slug
     * @returns URL-friendly slug
     */
    generateSlug(text: string): string;
    /**
     * Creates a hash of an API key for safe logging/debugging.
     * Only shows first 4 and last 4 characters, masks the rest.
     * @param apiKey - API key to hash
     * @returns Masked API key (e.g., "abcd...xyz9")
     */
    hashApiKey(apiKey: string): string;
    /**
     * Parses an agent response into structured format.
     * @param response - Raw agent response text
     * @returns Parsed response with solution and optional reasoning
     */
    parseAgentResponse(response: string): {
        solution: string;
        reasoning?: string;
        confidence?: number;
    };
    /**
     * Retry a function with exponential backoff.
     * @param fn - Async function to retry
     * @param maxRetries - Maximum number of retry attempts (default: 3)
     * @param baseDelay - Base delay in ms before first retry (default: 1000)
     * @returns Result of the function or throws last error
     */
    retry<T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
    /**
     * Rate limiter using token bucket algorithm.
     * @param fn - Async function to rate-limit
     * @param requestsPerSecond - Maximum requests per second (default: 10)
     * @returns Wrapped function with rate limiting
     */
    rateLimit<T extends (...args: any[]) => Promise<any>>(fn: T, requestsPerSecond?: number): T;
    /**
     * Simple in-memory cache with TTL.
     * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
     * @returns Cache object with get, set, delete, and clear methods
     */
    createCache<T = any>(ttlMs?: number): {
        get(key: string): T | undefined;
        set(key: string, value: T, customTtl?: number): void;
        delete(key: string): boolean;
        clear(): void;
        size(): number;
    };
};
