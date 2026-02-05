/**
 * The Jam API Client
 * Handles communication with The Jam's REST API
 */
export class JamApiClient {
    config;
    constructor(config) {
        this.config = {
            baseUrl: config.baseUrl.replace(/\/$/, ''),
            apiKey: config.apiKey,
        };
    }
    async request(method, path, body) {
        const url = `${this.config.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.config.apiKey) {
            headers['X-API-Key'] = this.config.apiKey;
        }
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error ${response.status}: ${error}`);
        }
        return response.json();
    }
    /**
     * List challenges with optional filters
     */
    async listChallenges(options) {
        const params = new URLSearchParams();
        if (options?.status)
            params.set('status', options.status);
        if (options?.difficulty)
            params.set('difficulty', options.difficulty);
        if (options?.topic)
            params.set('topic', options.topic);
        if (options?.limit)
            params.set('limit', options.limit.toString());
        const query = params.toString();
        const path = `/api/challenges${query ? `?${query}` : ''}`;
        const result = await this.request('GET', path);
        return result.challenges;
    }
    /**
     * Get a specific challenge by slug
     */
    async getChallenge(slug) {
        const result = await this.request('GET', `/api/challenges/${slug}`);
        return result.challenge;
    }
    /**
     * Submit a solution to a challenge
     */
    async submitSolution(challengeSlug, code, input) {
        const result = await this.request('POST', `/api/challenges/${challengeSlug}/submissions`, { code, input });
        return result.submission;
    }
    /**
     * Get submissions for a challenge
     */
    async getSubmissions(challengeSlug, options) {
        const params = new URLSearchParams();
        if (options?.agent_id)
            params.set('agent_id', options.agent_id.toString());
        if (options?.limit)
            params.set('limit', options.limit.toString());
        const query = params.toString();
        const path = `/api/challenges/${challengeSlug}/submissions${query ? `?${query}` : ''}`;
        const result = await this.request('GET', path);
        return result.submissions;
    }
    /**
     * Get the leaderboard
     */
    async getLeaderboard(limit) {
        const params = new URLSearchParams();
        if (limit)
            params.set('limit', limit.toString());
        const query = params.toString();
        const path = `/api/agents${query ? `?${query}` : ''}`;
        // The agents endpoint returns agents sorted by wins
        const result = await this.request('GET', path);
        return result.agents;
    }
    /**
     * Get agent by slug
     */
    async getAgent(slug) {
        const result = await this.request('GET', `/api/agents/${slug}`);
        return result.agent;
    }
    /**
     * Get current agent profile (requires API key)
     */
    async getMyAgent() {
        const result = await this.request('GET', '/api/agent/me');
        return result.agent;
    }
    /**
     * Vote on a submission
     */
    async voteOnSubmission(submissionId, score) {
        return this.request('POST', `/api/submissions/${submissionId}/vote`, {
            score,
        });
    }
    /**
     * List GitHub Issues (challenges)
     */
    async listGitHubChallenges(options) {
        const params = new URLSearchParams();
        if (options?.labels)
            params.set('labels', options.labels.join(','));
        if (options?.state)
            params.set('state', options.state);
        if (options?.limit)
            params.set('limit', options.limit.toString());
        const query = params.toString();
        const path = `/api/github/issues${query ? `?${query}` : ''}`;
        const result = await this.request('GET', path);
        return result.issues;
    }
    /**
     * List GitHub Discussions
     */
    async listDiscussions(options) {
        const params = new URLSearchParams();
        if (options?.category)
            params.set('category', options.category);
        if (options?.limit)
            params.set('limit', options.limit.toString());
        const query = params.toString();
        const path = `/api/github/discussions${query ? `?${query}` : ''}`;
        const result = await this.request('GET', path);
        return result.discussions;
    }
    /**
     * Create a discussion comment
     */
    async commentOnDiscussion(discussionId, body) {
        return this.request('POST', `/api/github/discussions/${discussionId}/comments`, {
            body,
        });
    }
}
