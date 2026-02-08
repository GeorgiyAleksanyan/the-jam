"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JamUtils = void 0;
exports.JamUtils = {
    /**
     * Parses a challenge string to extract key parameters.
     * Example: "Solve for x: 2x + 5 = 15" -> { equation: "2x + 5 = 15" }
     */
    parseChallenge(text) {
        const lines = text.split('\n');
        const params = {};
        // Basic regex-based extraction logic for common challenge patterns
        const equationMatch = text.match(/Solve for \w: (.+)/i);
        if (equationMatch) {
            params.equation = equationMatch[1].trim();
        }
        return params;
    },
    /**
     * Validates if a response string matches expected formats.
     */
    isValidResponse(response, pattern) {
        if (!response)
            return false;
        if (pattern)
            return pattern.test(response);
        return response.length > 0;
    },
    /**
     * Validates a challenge submission before sending.
     * @param submission - The submission object to validate
     * @returns Object with isValid flag and optional error message
     */
    validateSubmission(submission) {
        if (!submission.challengeId || typeof submission.challengeId !== 'string') {
            return { isValid: false, error: 'challengeId is required and must be a string' };
        }
        if (!submission.solution || typeof submission.solution !== 'string') {
            return { isValid: false, error: 'solution is required and must be a string' };
        }
        if (submission.solution.trim().length === 0) {
            return { isValid: false, error: 'solution cannot be empty' };
        }
        if (submission.agentId && typeof submission.agentId !== 'string') {
            return { isValid: false, error: 'agentId must be a string if provided' };
        }
        return { isValid: true };
    },
    /**
     * Formats a solution for submission to The Jam.
     * @param solution - Raw solution value (string or number)
     * @param metadata - Optional metadata to include (timestamp, agent info, etc.)
     * @returns Formatted solution object ready for submission
     */
    formatSolution(solution, metadata) {
        const formatted = {
            solution: String(solution).trim(),
            ...(metadata && Object.keys(metadata).length > 0 && {
                metadata: {
                    ...metadata,
                    timestamp: metadata.timestamp || Date.now()
                }
            })
        };
        return formatted;
    },
    /**
     * Generates a URL-friendly slug from a string.
     * @param text - Text to convert to slug
     * @returns URL-friendly slug
     */
    generateSlug(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    /**
     * Creates a hash of an API key for safe logging/debugging.
     * Only shows first 4 and last 4 characters, masks the rest.
     * @param apiKey - API key to hash
     * @returns Masked API key (e.g., "abcd...xyz9")
     */
    hashApiKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return '****';
        }
        const start = apiKey.substring(0, 4);
        const end = apiKey.substring(apiKey.length - 4);
        return `${start}...${end}`;
    },
    /**
     * Parses an agent response into structured format.
     * @param response - Raw agent response text
     * @returns Parsed response with solution and optional reasoning
     */
    parseAgentResponse(response) {
        const lines = response.split('\n').map(l => l.trim()).filter(Boolean);
        // Try to extract solution from common patterns
        let solution = '';
        let reasoning = '';
        let confidence;
        for (const line of lines) {
            // Look for explicit solution markers
            const solutionMatch = line.match(/(?:solution|answer|result):\s*(.+)/i);
            if (solutionMatch) {
                solution = solutionMatch[1].trim();
            }
            // Look for reasoning
            const reasoningMatch = line.match(/(?:reasoning|explanation|because):\s*(.+)/i);
            if (reasoningMatch) {
                reasoning = reasoningMatch[1].trim();
            }
            // Look for confidence
            const confidenceMatch = line.match(/confidence:\s*(\d+(?:\.\d+)?)/i);
            if (confidenceMatch) {
                confidence = parseFloat(confidenceMatch[1]);
            }
        }
        // If no explicit solution found, use the last non-empty line
        if (!solution && lines.length > 0) {
            solution = lines[lines.length - 1];
        }
        return {
            solution,
            ...(reasoning && { reasoning }),
            ...(confidence !== undefined && { confidence })
        };
    },
    /**
     * Retry a function with exponential backoff.
     * @param fn - Async function to retry
     * @param maxRetries - Maximum number of retry attempts (default: 3)
     * @param baseDelay - Base delay in ms before first retry (default: 1000)
     * @returns Result of the function or throws last error
     */
    async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    },
    /**
     * Rate limiter using token bucket algorithm.
     * @param fn - Async function to rate-limit
     * @param requestsPerSecond - Maximum requests per second (default: 10)
     * @returns Wrapped function with rate limiting
     */
    rateLimit(fn, requestsPerSecond = 10) {
        const interval = 1000 / requestsPerSecond;
        const queue = [];
        let lastRun = 0;
        let processing = false;
        const processQueue = async () => {
            if (processing || queue.length === 0)
                return;
            processing = true;
            while (queue.length > 0) {
                const now = Date.now();
                const timeSinceLastRun = now - lastRun;
                if (timeSinceLastRun < interval) {
                    await new Promise(resolve => setTimeout(resolve, interval - timeSinceLastRun));
                }
                const item = queue.shift();
                if (item) {
                    lastRun = Date.now();
                    item.fn();
                }
            }
            processing = false;
        };
        return ((...args) => {
            return new Promise((resolve, reject) => {
                queue.push({
                    fn: async () => {
                        try {
                            const result = await fn(...args);
                            resolve(result);
                        }
                        catch (error) {
                            reject(error);
                        }
                    },
                    timestamp: Date.now()
                });
                processQueue();
            });
        });
    },
    /**
     * Simple in-memory cache with TTL.
     * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
     * @returns Cache object with get, set, delete, and clear methods
     */
    createCache(ttlMs = 5 * 60 * 1000) {
        const store = new Map();
        return {
            get(key) {
                const entry = store.get(key);
                if (!entry)
                    return undefined;
                if (Date.now() > entry.expiresAt) {
                    store.delete(key);
                    return undefined;
                }
                return entry.value;
            },
            set(key, value, customTtl) {
                const expiresAt = Date.now() + (customTtl ?? ttlMs);
                store.set(key, { value, expiresAt });
            },
            delete(key) {
                return store.delete(key);
            },
            clear() {
                store.clear();
            },
            size() {
                // Clean expired entries
                const now = Date.now();
                for (const [key, entry] of store.entries()) {
                    if (now > entry.expiresAt) {
                        store.delete(key);
                    }
                }
                return store.size;
            }
        };
    }
};
