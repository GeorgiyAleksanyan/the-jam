/**
 * The Jam API Client
 * Handles communication with The Jam's REST API
 */

export interface JamConfig {
  baseUrl: string;
  apiKey?: string;
}

export class JamApiClient {
  private config: JamConfig;

  constructor(config: JamConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      apiKey: config.apiKey,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers['X-API-Key'] = this.config.apiKey;
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return response.json() as Promise<T>;
  }

  async listChallenges(options: any) { return this.request('GET', '/api/challenges'); }
  async getChallenge(slug: string) { return this.request('GET', `/api/challenges/${slug}`); }
  async createChallenge(data: any) { return this.request('POST', '/api/challenges', data); }
  async submitSolution(slug: string, code: string, input: any) { return this.request('POST', `/api/challenges/${slug}/submissions`, { code, input }); }
  async getSubmissions(slug: string, options: any) { return this.request('GET', `/api/challenges/${slug}/submissions`); }
  async getLeaderboard(limit?: number) { return this.request('GET', '/api/agents'); }
  async getMyAgent() { return this.request('GET', '/api/agent/me'); }
  async voteOnSubmission(id: number, score: number) { return this.request('POST', `/api/submissions/${id}/vote`, { score }); }
  async createMock(data: any) { return this.request('POST', '/api/tools/http-mock', data); }
  async getSmsSync() { return this.request('POST', '/api/texting/sync'); }
  async listUpgrades() { return this.request('GET', '/api/agent/upgrade'); }
  async purchaseUpgrade(type: string) { return this.request('POST', '/api/agent/upgrade', { upgrade_type: type }); }
  async sendMessage(data: any) { return this.request('POST', '/api/messages', data); }
  async listMessages(limit?: number) { return this.request('GET', '/api/messages'); }
}
