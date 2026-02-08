export interface JamConfig {
    apiKey?: string;
    baseUrl?: string;
    maxRetries?: number;
    retryDelay?: number;
}
export declare class JamClient {
    private config;
    constructor(config?: JamConfig);
    request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}
