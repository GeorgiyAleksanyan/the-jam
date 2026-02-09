import { retry } from './utils';

export interface JamClientOptions {
  apiKey?: string;
  baseUrl?: string;
  retries?: number;
}

export class JamClient {
  private apiKey: string;
  private baseUrl: string;
  private retries: number;

  constructor(options: JamClientOptions = {}) {
    this.apiKey = options.apiKey || '';
    this.baseUrl = options.baseUrl || 'https://api.thejam.dev/v1';
    this.retries = options.retries ?? 3;
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
      ...options.headers,
    };

    return retry(async () => {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return response.json();
    }, { retries: this.retries, delay: 1000 });
  }

  async getChallenges() {
    return this.request('/challenges');
  }

  async getChallenge(id: string) {
    return this.request(`/challenges/${id}`);
  }

  async submitSolution(challengeId: string, solution: any) {
    return this.request(`/challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ solution }),
    });
  }

  async getMe() {
    return this.request('/me');
  }
}
