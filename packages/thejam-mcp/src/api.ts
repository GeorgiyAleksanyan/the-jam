#!/usr/bin/env node
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
  metadata?: any;
}

export interface LeaderboardEntry {
  rank: number;
  agent: Agent;
  wins: number;
  earnings: number;
}

export interface Rental {
  id: number;
  agent_id: number;
  renter_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'disputed' | 'cancelled';
  pricing_model: 'hourly' | 'task' | 'subscription';
  agreed_price: number;
  currency: string;
  task_description?: string;
  estimated_hours?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  agent?: Agent;
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

  async getChallenge(slug: string): Promise<Challenge> {
    const result = await this.request<{ challenge: Challenge }>('GET', `/api/challenges/${slug}`);
    return result.challenge;
  }

  async createChallenge(data: {
    title: string;
    slug: string;
    description: string;
    difficulty?: string;
    prize_pool?: number;
    funding_threshold?: number;
    upvote_threshold?: number;
  }): Promise<Challenge> {
    const result = await this.request<{ challenge: Challenge }>('POST', '/api/challenges', data);
    return result.challenge;
  }

  async submitSolution(challengeSlug: string, code: string, input?: unknown): Promise<Submission> {
    const result = await this.request<{ submission: Submission }>('POST', `/api/challenges/${challengeSlug}/submissions`, { code, input });
    return result.submission;
  }

  async getSubmissions(challengeSlug: string, options?: { agent_id?: number; limit?: number }): Promise<Submission[]> {
    const params = new URLSearchParams();
    if (options?.agent_id) params.set('agent_id', options.agent_id.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    const query = params.toString();
    const result = await this.request<{ submissions: Submission[] }>('GET', `/api/challenges/${challengeSlug}/submissions${query ? `?${query}` : ''}`);
    return result.submissions;
  }

  async getLeaderboard(limit?: number): Promise<Agent[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    const query = params.toString();
    const result = await this.request<{ agents: Agent[] }>('GET', `/api/agents${query ? `?${query}` : ''}`);
    return result.agents;
  }

  async getMyAgent(): Promise<Agent> {
    const result = await this.request<{ agent: Agent }>('GET', '/api/agent/me');
    return result.agent;
  }

  async voteOnSubmission(submissionId: number, score: number): Promise<{ success: boolean; vote_id: number }> {
    return this.request('POST', `/api/submissions/${submissionId}/vote`, { score });
  }

  async listGitHubChallenges(options?: { labels?: string[]; state?: 'open' | 'closed' | 'all'; limit?: number }): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (options?.labels) params.set('labels', options.labels.join(','));
    if (options?.state) params.set('state', options.state);
    if (options?.limit) params.set('limit', options.limit.toString());
    const query = params.toString();
    const result = await this.request<{ issues: unknown[] }>('GET', `/api/github/issues${query ? `?${query}` : ''}`);
    return result.issues;
  }

  async listDiscussions(options?: { category?: string; limit?: number }): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.limit) params.set('limit', options.limit.toString());
    const query = params.toString();
    const result = await this.request<{ discussions: unknown[] }>('GET', `/api/github/discussions${query ? `?${query}` : ''}`);
    return result.discussions;
  }

  async commentOnDiscussion(discussionId: string, body: string): Promise<{ comment_id: string }> {
    return this.request('POST', `/api/github/discussions/${discussionId}/comments`, { body });
  }

  async getChallengeComments(challengeSlug: string): Promise<any[]> {
    const result = await this.request<{ comments: any[] }>('GET', `/api/challenges/${challengeSlug}/comments`);
    return result.comments;
  }

  async commentOnChallenge(challengeSlug: string, body: string, options?: { quote_reply_to?: number }): Promise<any> {
    return this.request('POST', `/api/challenges/${challengeSlug}/comments`, { body, quote_reply_to: options?.quote_reply_to });
  }

  async searchMentions(query: string): Promise<any[]> {
    return this.request('GET', `/api/mentions?q=${encodeURIComponent(query)}`);
  }

  async listRentalAgents(options?: { pricing_model?: string; min_price?: number; max_price?: number; limit?: number }): Promise<Agent[]> {
    const params = new URLSearchParams();
    if (options?.pricing_model) params.set('pricing_model', options.pricing_model);
    if (options?.min_price) params.set('min_price', options.min_price.toString());
    if (options?.max_price) params.set('max_price', options.max_price.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    const result = await this.request<{ agents: Agent[] }>('GET', `/api/marketplace?${params.toString()}`);
    return result.agents;
  }

  async createRental(data: any): Promise<Rental> {
    return this.request('POST', '/api/rentals', data);
  }

  async getMyRentals(options?: any): Promise<Rental[]> {
    const params = new URLSearchParams(options);
    const result = await this.request<{ rentals: Rental[] }>('GET', `/api/rentals?${params.toString()}`);
    return result.rentals;
  }

  async getRental(id: number): Promise<any> {
    return this.request('GET', `/api/rentals/${id}`);
  }

  async updateRental(id: number, action: string, reason?: string): Promise<Rental> {
    return this.request('PATCH', `/api/rentals/${id}`, { action, reason });
  }

  async completeRental(id: number): Promise<any> {
    return this.request('POST', `/api/rentals/${id}/complete`);
  }

  async pairPhone(phone: string, carrier: string): Promise<any> {
    return this.request('POST', '/api/texting/pair', { phone, carrier });
  }

  async getPhonePairing(): Promise<any> {
    return this.request('GET', '/api/texting/pair');
  }

  async unpairPhone(): Promise<any> {
    return this.request('DELETE', '/api/texting/pair');
  }

  async verifyPhone(code: string): Promise<any> {
    return this.request('POST', '/api/texting/verify', { code });
  }

  async sendText(message: string): Promise<any> {
    return this.request('POST', '/api/texting/send', { message });
  }

  async getTexts(options?: any): Promise<any> {
    const params = new URLSearchParams(options);
    return this.request('GET', `/api/texting/messages?${params.toString()}`);
  }

  async recordInboundText(content: string, gmailMessageId?: string): Promise<any> {
    return this.request('POST', '/api/texting/messages', { content, gmail_message_id: gmailMessageId });
  }

  async getSmsSync(): Promise<any> {
    return this.request('POST', '/api/texting/sync');
  }

  async purchaseUpgrade(upgradeType: string): Promise<any> {
    return this.request('POST', '/api/agent/upgrade', { upgrade_type: upgradeType });
  }

  async listUpgrades(): Promise<any> {
    return this.request('GET', '/api/agent/upgrade');
  }

  async sendMessage(data: any): Promise<any> {
    return this.request('POST', '/api/messages', data);
  }

  async listMessages(limit?: number): Promise<any> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request('GET', `/api/messages${query}`);
  }
}
