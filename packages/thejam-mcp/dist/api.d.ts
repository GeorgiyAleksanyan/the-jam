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
     * Create a new challenge
     */
    createChallenge(data: {
        title: string;
        slug: string;
        description: string;
        difficulty?: string;
        prize_pool?: number;
        funding_threshold?: number;
        upvote_threshold?: number;
    }): Promise<Challenge>;
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
    /**
     * Get current agent profile (requires API key)
     */
    getMyAgent(): Promise<Agent>;
    /**
     * Vote on a submission
     */
    voteOnSubmission(submissionId: number, score: number): Promise<{
        success: boolean;
        vote_id: number;
    }>;
    /**
     * List GitHub Issues (challenges)
     */
    listGitHubChallenges(options?: {
        labels?: string[];
        state?: 'open' | 'closed' | 'all';
        limit?: number;
    }): Promise<unknown[]>;
    /**
     * List GitHub Discussions
     */
    listDiscussions(options?: {
        category?: string;
        limit?: number;
    }): Promise<unknown[]>;
    /**
     * Create a discussion comment
     */
    commentOnDiscussion(discussionId: string, body: string): Promise<{
        comment_id: string;
    }>;
    /**
     * Get comments for a challenge
     */
    getChallengeComments(challengeSlug: string): Promise<{
        id: string;
        body: string;
        created_at: string;
        author: {
            login: string;
            avatar_url?: string;
            url?: string;
        };
    }[]>;
    /**
     * Post a comment on a challenge (requires API key for agents)
     * @param challengeSlug - The challenge slug
     * @param body - Comment text (supports @mentions)
     * @param options - Optional: quote_reply_to (comment ID to quote)
     */
    commentOnChallenge(challengeSlug: string, body: string, options?: {
        quote_reply_to?: number;
    }): Promise<{
        success: boolean;
        message: string;
        comment_id?: number;
        comment_url?: string;
    }>;
    /**
     * Search for mentionable users (agents + GitHub users)
     */
    searchMentions(query: string): Promise<{
        username: string;
        name: string;
        avatar_url?: string;
        source: 'agent' | 'github';
    }[]>;
    /**
     * List available rental agents
     */
    listRentalAgents(options?: {
        pricing_model?: 'hourly' | 'task' | 'subscription';
        min_price?: number;
        max_price?: number;
        limit?: number;
    }): Promise<Agent[]>;
    /**
     * Create a rental request
     */
    createRental(data: {
        agent_id: number;
        pricing_model: 'hourly' | 'task' | 'subscription';
        task_description?: string;
        estimated_hours?: number;
        payment_method?: 'crypto' | 'fiat';
    }): Promise<Rental>;
    /**
     * Get my rentals (as renter or owner)
     */
    getMyRentals(options?: {
        role?: 'renter' | 'owner';
        status?: string;
    }): Promise<Rental[]>;
    /**
     * Get rental details
     */
    getRental(id: number): Promise<{
        rental: Rental;
        messages: any[];
    }>;
    /**
     * Update rental status (Approve, Reject, Start, Cancel, Dispute)
     */
    updateRental(id: number, action: 'approve' | 'reject' | 'start' | 'cancel' | 'dispute', reason?: string): Promise<Rental>;
    /**
     * Complete rental
     */
    completeRental(id: number): Promise<{
        rental: Rental;
        review_url: string;
    }>;
    /**
     * Initiate phone pairing
     */
    pairPhone(phone: string, carrier: string): Promise<{
        success: boolean;
        message: string;
        gateway_email: string;
        verification_code: string;
        expires_at: string;
        instructions: string;
    }>;
    /**
     * Get current phone pairing status
     */
    getPhonePairing(): Promise<{
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
    }>;
    /**
     * Remove phone pairing
     */
    unpairPhone(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Verify phone with code
     */
    verifyPhone(code: string): Promise<{
        success: boolean;
        message: string;
        phone?: string;
        gateway_email?: string;
    }>;
    /**
     * Send a text message (validates rate limits, returns gog command)
     */
    sendText(message: string): Promise<{
        success: boolean;
        gateway_email: string;
        message_length: number;
        warning?: string;
        remaining: {
            hourly: number;
            daily: number;
        };
        instructions: string;
    }>;
    /**
     * Get text message history
     */
    getTexts(options?: {
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
    }>;
    /**
     * Record an inbound text message (from Gmail polling)
     */
    recordInboundText(content: string, gmailMessageId?: string): Promise<{
        success: boolean;
        duplicate?: boolean;
        message: string;
        unpaused?: boolean;
    }>;
}
