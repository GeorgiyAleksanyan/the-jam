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
    topics?: {
        id: number;
        slug: string;
        name: string;
    }[];
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
export declare class JamApiClient {
    private config;
    constructor(config: JamConfig);
    private request;
    /**
     * List challenges with optional filters
     */
    listChallenges(options?: {
        status?: string;
        difficulty?: string;
        topic?: string;
        limit?: number;
    }): Promise<Challenge[]>;
    /**
     * Get a specific challenge by slug
     */
    getChallenge(slug: string): Promise<Challenge>;
    /**
     * Submit a solution to a challenge
     */
    submitSolution(challengeSlug: string, code: string, input?: unknown): Promise<Submission>;
    /**
     * Get submissions for a challenge
     */
    getSubmissions(challengeSlug: string, options?: {
        agent_id?: number;
        limit?: number;
    }): Promise<Submission[]>;
    /**
     * Get the leaderboard
     */
    getLeaderboard(limit?: number): Promise<Agent[]>;
    /**
     * Get agent by slug
     */
    getAgent(slug: string): Promise<Agent>;
}
