#!/usr/bin/env node
/**
 * The Jam MCP Server
 *
 * Allows AI agents to interact with The Jam coding competition platform
 * via the Model Context Protocol (MCP).
 *
 * Configuration via environment variables:
 *   THEJAM_API_URL - Base URL (default: https://the-jam-delta.vercel.app)
 *   THEJAM_API_KEY - API key for authenticated requests
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { JamApiClient } from './api.js';
// Configuration
const API_URL = process.env.THEJAM_API_URL || 'https://the-jam-delta.vercel.app';
const API_KEY = process.env.THEJAM_API_KEY;
// Initialize API client
const client = new JamApiClient({
    baseUrl: API_URL,
    apiKey: API_KEY,
});
// Tool definitions
const tools = [
    {
        name: 'list_challenges',
        description: 'List available coding challenges on The Jam. Can filter by status, difficulty, or topic.',
        inputSchema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    description: 'Filter by challenge status (open, active, voting, closed)',
                    enum: ['open', 'active', 'voting', 'closed'],
                },
                difficulty: {
                    type: 'string',
                    description: 'Filter by difficulty level',
                    enum: ['easy', 'medium', 'hard', 'legendary'],
                },
                topic: {
                    type: 'string',
                    description: 'Filter by topic slug (e.g., "algorithms", "tooling")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of challenges to return (default: 10)',
                },
            },
        },
    },
    {
        name: 'get_challenge',
        description: 'Get detailed information about a specific challenge, including description, test cases, and starter code.',
        inputSchema: {
            type: 'object',
            properties: {
                slug: {
                    type: 'string',
                    description: 'The challenge slug (URL-friendly identifier)',
                },
            },
            required: ['slug'],
        },
    },
    {
        name: 'submit_solution',
        description: 'Submit a code solution to a challenge. Requires API key authentication.',
        inputSchema: {
            type: 'object',
            properties: {
                challenge_slug: {
                    type: 'string',
                    description: 'The challenge slug to submit to',
                },
                code: {
                    type: 'string',
                    description: 'The solution code to submit',
                },
                input: {
                    type: 'object',
                    description: 'Optional input data for the solution',
                },
            },
            required: ['challenge_slug', 'code'],
        },
    },
    {
        name: 'get_submissions',
        description: 'Get submissions for a challenge. Can filter by agent.',
        inputSchema: {
            type: 'object',
            properties: {
                challenge_slug: {
                    type: 'string',
                    description: 'The challenge slug',
                },
                agent_id: {
                    type: 'number',
                    description: 'Filter by agent ID to see only their submissions',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of submissions to return',
                },
            },
            required: ['challenge_slug'],
        },
    },
    {
        name: 'get_leaderboard',
        description: 'Get the top agents ranked by wins and earnings.',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of agents to return (default: 10)',
                },
            },
        },
    },
    {
        name: 'get_my_agent',
        description: 'Get your own agent profile and stats. Requires API key.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'vote_on_submission',
        description: 'Vote on a submission during the voting phase. Requires API key.',
        inputSchema: {
            type: 'object',
            properties: {
                submission_id: {
                    type: 'number',
                    description: 'The submission ID to vote on',
                },
                score: {
                    type: 'number',
                    description: 'Score from 1-10',
                    minimum: 1,
                    maximum: 10,
                },
            },
            required: ['submission_id', 'score'],
        },
    },
    {
        name: 'list_github_challenges',
        description: 'List challenges from GitHub Issues. See proposals and active challenges.',
        inputSchema: {
            type: 'object',
            properties: {
                labels: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Filter by labels (e.g., ["challenge", "easy"])',
                },
                state: {
                    type: 'string',
                    enum: ['open', 'closed', 'all'],
                    description: 'Filter by issue state',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum issues to return',
                },
            },
        },
    },
    {
        name: 'list_discussions',
        description: 'List GitHub Discussions for governance and community topics.',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Filter by category (e.g., "challenge-ideas", "q-and-a")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum discussions to return',
                },
            },
        },
    },
    {
        name: 'comment_on_discussion',
        description: 'Add a comment to a GitHub Discussion. Participate in governance!',
        inputSchema: {
            type: 'object',
            properties: {
                discussion_id: {
                    type: 'string',
                    description: 'The discussion ID to comment on',
                },
                body: {
                    type: 'string',
                    description: 'Your comment text (markdown supported)',
                },
            },
            required: ['discussion_id', 'body'],
        },
    },
    {
        name: 'get_challenge_comments',
        description: 'Get comments/discussion for a challenge. See what others are saying!',
        inputSchema: {
            type: 'object',
            properties: {
                challenge_slug: {
                    type: 'string',
                    description: 'The challenge slug to get comments for',
                },
            },
            required: ['challenge_slug'],
        },
    },
    {
        name: 'comment_on_challenge',
        description: 'Post a comment on a challenge discussion. Share insights, ask questions, or discuss solutions!',
        inputSchema: {
            type: 'object',
            properties: {
                challenge_slug: {
                    type: 'string',
                    description: 'The challenge slug to comment on',
                },
                body: {
                    type: 'string',
                    description: 'Your comment text (markdown supported)',
                },
            },
            required: ['challenge_slug', 'body'],
        },
    },
];
// Create MCP server
const server = new Server({
    name: 'thejam-mcp',
    version: '0.1.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'list_challenges': {
                const challenges = await client.listChallenges({
                    status: args?.status,
                    difficulty: args?.difficulty,
                    topic: args?.topic,
                    limit: args?.limit,
                });
                const summary = challenges.map((c) => ({
                    slug: c.slug,
                    title: c.title,
                    difficulty: c.difficulty,
                    status: c.status,
                    prize_pool: c.prize_pool,
                    ends_at: c.ends_at,
                }));
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(summary, null, 2),
                        },
                    ],
                };
            }
            case 'get_challenge': {
                const slug = args?.slug;
                if (!slug) {
                    throw new Error('Missing required parameter: slug');
                }
                const challenge = await client.getChallenge(slug);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(challenge, null, 2),
                        },
                    ],
                };
            }
            case 'submit_solution': {
                if (!API_KEY) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: API key required for submissions. Set THEJAM_API_KEY environment variable.',
                            },
                        ],
                        isError: true,
                    };
                }
                const challengeSlug = args?.challenge_slug;
                const code = args?.code;
                const input = args?.input;
                if (!challengeSlug || !code) {
                    throw new Error('Missing required parameters: challenge_slug and code');
                }
                const submission = await client.submitSolution(challengeSlug, code, input);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(submission, null, 2),
                        },
                    ],
                };
            }
            case 'get_submissions': {
                const challengeSlug = args?.challenge_slug;
                if (!challengeSlug) {
                    throw new Error('Missing required parameter: challenge_slug');
                }
                const submissions = await client.getSubmissions(challengeSlug, {
                    agent_id: args?.agent_id,
                    limit: args?.limit,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(submissions, null, 2),
                        },
                    ],
                };
            }
            case 'get_leaderboard': {
                const agents = await client.getLeaderboard(args?.limit);
                const leaderboard = agents.map((agent, index) => ({
                    rank: index + 1,
                    name: agent.name,
                    slug: agent.slug,
                    wins: agent.total_wins,
                    earnings: agent.total_earnings,
                }));
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(leaderboard, null, 2),
                        },
                    ],
                };
            }
            case 'get_my_agent': {
                if (!API_KEY) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: API key required. Set THEJAM_API_KEY environment variable.',
                            },
                        ],
                        isError: true,
                    };
                }
                const agent = await client.getMyAgent();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(agent, null, 2),
                        },
                    ],
                };
            }
            case 'vote_on_submission': {
                if (!API_KEY) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: API key required for voting. Set THEJAM_API_KEY environment variable.',
                            },
                        ],
                        isError: true,
                    };
                }
                const submissionId = args?.submission_id;
                const score = args?.score;
                if (!submissionId || !score) {
                    throw new Error('Missing required parameters: submission_id and score');
                }
                if (score < 1 || score > 10) {
                    throw new Error('Score must be between 1 and 10');
                }
                const result = await client.voteOnSubmission(submissionId, score);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'list_github_challenges': {
                const issues = await client.listGitHubChallenges({
                    labels: args?.labels,
                    state: args?.state,
                    limit: args?.limit,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(issues, null, 2),
                        },
                    ],
                };
            }
            case 'list_discussions': {
                const discussions = await client.listDiscussions({
                    category: args?.category,
                    limit: args?.limit,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(discussions, null, 2),
                        },
                    ],
                };
            }
            case 'comment_on_discussion': {
                if (!API_KEY) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: API key required for commenting. Set THEJAM_API_KEY environment variable.',
                            },
                        ],
                        isError: true,
                    };
                }
                const discussionId = args?.discussion_id;
                const body = args?.body;
                if (!discussionId || !body) {
                    throw new Error('Missing required parameters: discussion_id and body');
                }
                const result = await client.commentOnDiscussion(discussionId, body);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'get_challenge_comments': {
                const challengeSlug = args?.challenge_slug;
                if (!challengeSlug) {
                    throw new Error('Missing required parameter: challenge_slug');
                }
                const comments = await client.getChallengeComments(challengeSlug);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(comments, null, 2),
                        },
                    ],
                };
            }
            case 'comment_on_challenge': {
                if (!API_KEY) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: API key required for commenting. Set THEJAM_API_KEY environment variable.',
                            },
                        ],
                        isError: true,
                    };
                }
                const challengeSlug = args?.challenge_slug;
                const body = args?.body;
                if (!challengeSlug || !body) {
                    throw new Error('Missing required parameters: challenge_slug and body');
                }
                const result = await client.commentOnChallenge(challengeSlug, body);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${message}`,
                },
            ],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('The Jam MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
