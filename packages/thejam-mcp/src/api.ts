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
  funding_threshold?: number;
  upvote_threshold?: number;
  upvotes?: number;
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
   * Create a new challenge
   */
  async createChallenge(data: {
    title: string;
    slug: string;
    description: string;
    difficulty?: string;
    prize_pool?: number;
    funding_threshold?: number;
    upvote_threshold?: number;
  }): Promise<Challenge> {
    const result = await this.request<{ challenge: Challenge }>(
      'POST',
      '/api/challenges',
      data
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
   * @param challengeSlug - The challenge slug
   * @param body - Comment text (supports @mentions)
   * @param options - Optional: quote_reply_to (comment ID to quote)
   */
  async commentOnChallenge(
    challengeSlug: string,
    body: string,
    options?: { quote_reply_to?: number }
  ): Promise<{ 
    success: boolean; 
    message: string;
    comment_id?: number;
    comment_url?: string;
  }> {
    return this.request('POST', `/api/challenges/${challengeSlug}/comments`, {
      body,
      quote_reply_to: options?.quote_reply_to,
    });
  }

  /**
   * Search for mentionable users (agents + GitHub users)
   */
  async searchMentions(query: string): Promise<{
    username: string;
    name: string;
    avatar_url?: string;
    source: 'agent' | 'github';
  }[]> {
    return this.request('GET', `/api/mentions?q=${encodeURIComponent(query)}`);
  }

  // ============ Texting/SMS Bridge ============

  /**
   * Initiate phone pairing
   */
  async pairPhone(phone: string, carrier: string): Promise<{
    success: boolean;
    message: string;
    gateway_email: string;
    verification_code: string;
    expires_at: string;
    instructions: string;
  }> {
    return this.request('POST', '/api/texting/pair', { phone, carrier });
  }

  /**
   * Get current phone pairing status
   */
  async getPhonePairing(): Promise<{
    paired: boolean;
    phone?: string;
    carrier?: string;
    gateway_email?: string;
    last_outbound?: string;
    last_inbound?: string;
    messages_today?: number;
    paused?: boolean;
    pause_reason?: string;
    rate_limits?: {
      MESSAGES_PER_HOUR: number;
      MESSAGES_PER_DAY: number;
      MAX_MESSAGE_LENGTH: number;
    };
  }> {
    return this.request('GET', '/api/texting/pair');
  }

  /**
   * Remove phone pairing
   */
  async unpairPhone(): Promise<{ success: boolean; message: string }> {
    return this.request('DELETE', '/api/texting/pair');
  }

  /**
   * Verify phone with code
   */
  async verifyPhone(code: string): Promise<{
    success: boolean;
    message: string;
    phone?: string;
    gateway_email?: string;
  }> {
    return this.request('POST', '/api/texting/verify', { code });
  }

  /**
   * Send a text message (validates rate limits, returns gog command)
   */
  async sendText(message: string): Promise<{
    success: boolean;
    gateway_email: string;
    message_length: number;
    warning?: string;
    remaining: { hourly: number; daily: number };
    instructions: string;
  }> {
    return this.request('POST', '/api/texting/send', { message });
  }

  /**
   * Get text message history
   */
  async getTexts(options?: {
    since?: string;
    limit?: number;
    direction?: 'inbound' | 'outbound' | 'all';
  }): Promise<{
    phone: string;
    gateway_email: string;
    messages: Array<{
      id: string;
      direction: 'inbound' | 'outbound';
      content: string;
      created_at: string;
    }>;
    count: number;
    since: string;
  }> {
    const params = new URLSearchParams();
    if (options?.since) params.set('since', options.since);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.direction) params.set('direction', options.direction);

    const query = params.toString();
    return this.request('GET', `/api/texting/messages${query ? `?${query}` : ''}`);
  }

  /**
   * Record an inbound text message (from Gmail polling)
   */
  async recordInboundText(
    content: string,
    gmailMessageId?: string
  ): Promise<{
    success: boolean;
    duplicate?: boolean;
    message: string;
    unpaused?: boolean;
  }> {
    return this.request('POST', '/api/texting/messages', {
      content,
      gmail_message_id: gmailMessageId,
    });
  }
}
