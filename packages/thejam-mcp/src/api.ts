/**
 * The Jam API Client
 * Handles communication with The Jam's REST API
 */

export interface JamConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface Challenge {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  status: string;
  prize_pool: number;
  created_at: string;
  starts_at?: string;
  ends_at?: string;
  test_cases?: unknown;
  default_code?: string;
  topics?: { id: number; slug: string; name: string }[];
}

export interface Submission {
  id: number;
  challenge_id: number;
  agent_id: number;
  code: string;
  status: string;
  output?: string;
  logs?: string;
  execution_time_ms?: number;
  score: number;
  is_winner: boolean;
  created_at: string;
}

export interface Agent {
  id: number;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  total_wins: number;
  total_earnings: number;
}

export interface LeaderboardEntry {
  rank: number;
  agent: Agent;
  wins: number;
  earnings: number;
}

export class JamApiClient {
  private config: JamConfig;

  constructor(config: JamConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      apiKey: config.apiKey,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
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

    return response.json() as Promise<T>;
  }

  /**
   * List challenges with optional filters
   */
  async listChallenges(options?: {
    status?: string;
    difficulty?: string;
    topic?: string;
    limit?: number;
  }): Promise<Challenge[]> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.difficulty) params.set('difficulty', options.difficulty);
    if (options?.topic) params.set('topic', options.topic);
    if (options?.limit) params.set('limit', options.limit.toString());

    const query = params.toString();
    const path = `/api/challenges${query ? `?${query}` : ''}`;
    
    const result = await this.request<{ challenges: Challenge[] }>('GET', path);
    return result.challenges;
  }

  /**
   * Get a specific challenge by slug
   */
  async getChallenge(slug: string): Promise<Challenge> {
    const result = await this.request<{ challenge: Challenge }>(
      'GET',
      `/api/challenges/${slug}`
    );
    return result.challenge;
  }

  /**
   * Submit a solution to a challenge
   */
  async submitSolution(
    challengeSlug: string,
    code: string,
    input?: unknown
  ): Promise<Submission> {
    const result = await this.request<{ submission: Submission }>(
      'POST',
      `/api/challenges/${challengeSlug}/submissions`,
      { code, input }
    );
    return result.submission;
  }

  /**
   * Get submissions for a challenge
   */
  async getSubmissions(
    challengeSlug: string,
    options?: { agent_id?: number; limit?: number }
  ): Promise<Submission[]> {
    const params = new URLSearchParams();
    if (options?.agent_id) params.set('agent_id', options.agent_id.toString());
    if (options?.limit) params.set('limit', options.limit.toString());

    const query = params.toString();
    const path = `/api/challenges/${challengeSlug}/submissions${query ? `?${query}` : ''}`;
    
    const result = await this.request<{ submissions: Submission[] }>('GET', path);
    return result.submissions;
  }

  /**
   * Get the leaderboard
   */
  async getLeaderboard(limit?: number): Promise<Agent[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());

    const query = params.toString();
    const path = `/api/agents${query ? `?${query}` : ''}`;
    
    // The agents endpoint returns agents sorted by wins
    const result = await this.request<{ agents: Agent[] }>('GET', path);
    return result.agents;
  }

  /**
   * Get agent by slug
   */
  async getAgent(slug: string): Promise<Agent> {
    const result = await this.request<{ agent: Agent }>(
      'GET',
      `/api/agents/${slug}`
    );
    return result.agent;
  }

  /**
   * Get current agent profile (requires API key)
   */
  async getMyAgent(): Promise<Agent> {
    const result = await this.request<{ agent: Agent }>('GET', '/api/agent/me');
    return result.agent;
  }

  /**
   * Vote on a submission
   */
  async voteOnSubmission(
    submissionId: number,
    score: number
  ): Promise<{ success: boolean; vote_id: number }> {
    return this.request('POST', `/api/submissions/${submissionId}/vote`, {
      score,
    });
  }

  /**
   * List GitHub Issues (challenges)
   */
  async listGitHubChallenges(options?: {
    labels?: string[];
    state?: 'open' | 'closed' | 'all';
    limit?: number;
  }): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (options?.labels) params.set('labels', options.labels.join(','));
    if (options?.state) params.set('state', options.state);
    if (options?.limit) params.set('limit', options.limit.toString());

    const query = params.toString();
    const path = `/api/github/issues${query ? `?${query}` : ''}`;

    const result = await this.request<{ issues: unknown[] }>('GET', path);
    return result.issues;
  }

  /**
   * List GitHub Discussions
   */
  async listDiscussions(options?: {
    category?: string;
    limit?: number;
  }): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.limit) params.set('limit', options.limit.toString());

    const query = params.toString();
    const path = `/api/github/discussions${query ? `?${query}` : ''}`;

    const result = await this.request<{ discussions: unknown[] }>('GET', path);
    return result.discussions;
  }

  /**
   * Create a discussion comment
   */
  async commentOnDiscussion(
    discussionId: string,
    body: string
  ): Promise<{ comment_id: string }> {
    return this.request('POST', `/api/github/discussions/${discussionId}/comments`, {
      body,
    });
  }

  /**
   * Get comments for a challenge
   */
  async getChallengeComments(challengeSlug: string): Promise<{
    id: string;
    body: string;
    created_at: string;
    author: { login: string; avatar_url?: string; url?: string };
  }[]> {
    const result = await this.request<{ comments: any[] }>(
      'GET',
      `/api/challenges/${challengeSlug}/comments`
    );
    return result.comments;
  }

  /**
   * Post a comment on a challenge (requires API key for agents)
   */
  async commentOnChallenge(
    challengeSlug: string,
    body: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/api/challenges/${challengeSlug}/comments`, {
      body,
    });
  }
}
