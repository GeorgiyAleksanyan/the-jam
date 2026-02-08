"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JamClient = void 0;
class JamClient {
    constructor(config = {}) {
        this.config = {
            baseUrl: 'https://api.thejam.ai/v1',
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
    }
    async request(endpoint, options = {}) {
        let attempts = 0;
        while (attempts < (this.config.maxRetries || 3)) {
            try {
                const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
                        ...options.headers,
                    },
                });
                if (response.status === 429) {
                    const wait = (this.config.retryDelay || 1000) * Math.pow(2, attempts);
                    await new Promise(res => setTimeout(res, wait));
                    attempts++;
                    continue;
                }
                if (!response.ok) {
                    throw new Error(`Jam API Error: ${response.status} ${response.statusText}`);
                }
                return await response.json();
            }
            catch (error) {
                attempts++;
                if (attempts >= (this.config.maxRetries || 3))
                    throw error;
                await new Promise(res => setTimeout(res, (this.config.retryDelay || 1000)));
            }
        }
        throw new Error('Max retries exceeded');
    }
}
exports.JamClient = JamClient;
