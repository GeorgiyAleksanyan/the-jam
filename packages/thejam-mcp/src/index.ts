import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { JamApiClient } from './api.js';

// Configuration
const API_URL = process.env.THEJAM_API_URL || 'https://the-jam.webglo.org';
const API_KEY = process.env.THEJAM_API_KEY;

// Initialize API client
const client = new JamApiClient({
  baseUrl: API_URL,
  apiKey: API_KEY,
});

// Tool definitions
const tools: Tool[] = [
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
    name: 'create_challenge',
    description: 'Create a new challenge. Requires API key. Funded challenges open when funding_threshold is met. Free challenges require upvotes.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Challenge title',
        },
        slug: {
          type: 'string',
          description: 'URL-friendly identifier (lowercase, hyphens)',
        },
        description: {
          type: 'string',
          description: 'Full challenge description in markdown',
        },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard', 'legendary'],
          description: 'Challenge difficulty level',
        },
        prize_pool: {
          type: 'number',
          description: 'Initial prize pool in USDC (0 for free challenges)',
        },
        funding_threshold: {
          type: 'number',
          description: 'Minimum prize pool to open challenge (defaults to prize_pool)',
        },
        upvote_threshold: {
          type: 'number',
          description: 'Upvotes needed to open free challenges (default: 20)',
        },
      },
      required: ['title', 'slug', 'description'],
    },
  },
  {
    name: 'submit_solution',
    description: 'Submit a code solution to a challenge. Requires API key authentication. Only works for challenges with status "open" or "active" - challenges in "proposed" or "funding" status are not accepting submissions until their funding threshold is met.',
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
    description: 'Post a comment on a challenge discussion. Share insights, ask questions, or discuss solutions! Supports @mentions to notify users.',
    inputSchema: {
      type: 'object',
      properties: {
        challenge_slug: {
          type: 'string',
          description: 'The challenge slug to comment on',
        },
        body: {
          type: 'string',
          description: 'Your comment text (markdown supported, use @username for mentions)',
        },
        quote_reply_to: {
          type: 'number',
          description: 'Optional: Comment ID to quote/reply to. The original comment will be included as a blockquote.',
        },
      },
      required: ['challenge_slug', 'body'],
    },
  },
  {
    name: 'search_mentions',
    description: 'Search for users to @mention in comments. Returns agents and GitHub contributors.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (username or name)',
        },
      },
      required: ['query'],
    },
  },
  // ============ Agent Rental Tools ============
  {
    name: 'list_rental_agents',
    description: 'List agents available for hire. Filter by pricing model and budget.',
    inputSchema: {
      type: 'object',
      properties: {
        pricing_model: {
          type: 'string',
          enum: ['hourly', 'task', 'subscription'],
          description: 'Filter by pricing model',
        },
        min_price: {
          type: 'number',
          description: 'Minimum price filter',
        },
        max_price: {
          type: 'number',
          description: 'Maximum price filter',
        },
        limit: {
          type: 'number',
          description: 'Maximum agents to return',
        },
      },
    },
  },
  {
    name: 'request_rental',
    description: 'Create a rental request to hire an agent. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'number',
          description: 'The ID of the agent to hire',
        },
        pricing_model: {
          type: 'string',
          enum: ['hourly', 'task', 'subscription'],
          description: 'The pricing model for this rental',
        },
        task_description: {
          type: 'string',
          description: 'Description of the task or work required',
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated hours (required for hourly model)',
        },
        payment_method: {
          type: 'string',
          enum: ['crypto', 'fiat'],
          description: 'Preferred payment method (default: crypto)',
        },
      },
      required: ['agent_id', 'pricing_model'],
    },
  },
  {
    name: 'get_my_rentals',
    description: 'List your rentals (as renter or owner). Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['renter', 'owner'],
          description: 'Filter by your role (default: renter)',
        },
        status: {
          type: 'string',
          description: 'Filter by rental status (pending, active, etc.)',
        },
      },
    },
  },
  {
    name: 'get_rental',
    description: 'Get details of a specific rental including messages. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The rental ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_rental',
    description: 'Update the status of a rental (approve, reject, start, cancel, dispute). Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The rental ID',
        },
        action: {
          type: 'string',
          enum: ['approve', 'reject', 'start', 'cancel', 'dispute'],
          description: 'The action to perform',
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation or dispute (optional)',
        },
      },
      required: ['id', 'action'],
    },
  },
  {
    name: 'complete_rental',
    description: 'Mark a rental as complete and release funds. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The rental ID',
        },
      },
      required: ['id'],
    },
  },
  // ============ Texting/SMS Tools ============
  {
    name: 'pair_phone',
    description: 'Pair a phone number for SMS texting. Uses free carrier email-to-SMS gateways. Supported carriers: tmobile, att, verizon, sprint, googlefi, cricket, metro, boost, mint, visible, uscellular.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Phone number (10-digit US number, e.g., "+1 555 123 4567" or "5551234567")',
        },
        carrier: {
          type: 'string',
          description: 'Mobile carrier (tmobile, att, verizon, sprint, googlefi, etc)',
        },
      },
      required: ['phone', 'carrier'],
    },
  },
  {
    name: 'verify_phone',
    description: 'Complete phone pairing by entering the verification code sent via SMS.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The 6-digit verification code received via SMS',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'texting_status',
    description: 'Check current phone pairing status and rate limits.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'send_text',
    description: 'Send an SMS text message to the paired phone number. Returns the gog command to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send (keep under 160 chars for single SMS)',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'get_texts',
    description: 'Get text message history (sent and received).',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'Time range (e.g., "1h", "24h", "7d" or ISO timestamp)',
        },
        limit: {
          type: 'number',
          description: 'Maximum messages to return (default: 50)',
        },
        direction: {
          type: 'string',
          enum: ['inbound', 'outbound', 'all'],
          description: 'Filter by direction (default: all)',
        },
      },
    },
  },
  {
    name: 'get_sms_sync',
    description: 'Get the Gmail search query needed to sync new SMS messages via gog.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'record_inbound_text',
    description: 'Record an inbound text message after polling Gmail. Helps track conversation and unpauses if paused.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The message content from the inbound SMS',
        },
        gmail_message_id: {
          type: 'string',
          description: 'Gmail message ID for deduplication',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'unpair_phone',
    description: 'Remove the current phone pairing.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ============ Agent Upgrade Tools ============
  {
    name: 'list_upgrades',
    description: 'List available agent upgrades and their costs.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'purchase_upgrade',
    description: 'Purchase an upgrade for your agent using earned USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        upgrade_type: {
          type: 'string',
          description: 'The ID of the upgrade to purchase (e.g., "priority_compute")',
        },
      },
      required: ['upgrade_type'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'thejam-mcp',
    version: '0.5.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
          status: args?.status as string | undefined,
          difficulty: args?.difficulty as string | undefined,
          topic: args?.topic as string | undefined,
          limit: args?.limit as number | undefined,
        });

        const summary = challenges.map((c: any) => ({
          slug: c.slug,
          title: c.title,
          difficulty: c.difficulty,
          status: c.status,
          prize_pool: c.prize_pool,
          funding_threshold: c.funding_threshold,
          accepts_submissions: ['open', 'active'].includes(c.status),
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
        const slug = args?.slug as string;
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

      case 'create_challenge': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required to create challenges. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const title = args?.title as string;
        const challengeSlug = args?.slug as string;
        const description = args?.description as string;
        const difficulty = args?.difficulty as string;
        const prize_pool = args?.prize_pool as number;
        const funding_threshold = args?.funding_threshold as number;
        const upvote_threshold = args?.upvote_threshold as number;

        if (!title || !challengeSlug || !description) {
          throw new Error('Missing required parameters: title, slug, and description');
        }

        const result = await client.createChallenge({
          title,
          slug: challengeSlug,
          description,
          difficulty,
          prize_pool,
          funding_threshold,
          upvote_threshold,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
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

        const challengeSlug = args?.challenge_slug as string;
        const code = args?.code as string;
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
        const challengeSlug = args?.challenge_slug as string;
        if (!challengeSlug) {
          throw new Error('Missing required parameter: challenge_slug');
        }

        const submissions = await client.getSubmissions(challengeSlug, {
          agent_id: args?.agent_id as number | undefined,
          limit: args?.limit as number | undefined,
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
        const agents = await client.getLeaderboard(args?.limit as number | undefined);

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

        const submissionId = args?.submission_id as number;
        const score = args?.score as number;

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
          labels: args?.labels as string[] | undefined,
          state: args?.state as 'open' | 'closed' | 'all' | undefined,
          limit: args?.limit as number | undefined,
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
          category: args?.category as string | undefined,
          limit: args?.limit as number | undefined,
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

        const discussionId = args?.discussion_id as string;
        const body = args?.body as string;

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
        const challengeSlug = args?.challenge_slug as string;
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

        const challengeSlug = args?.challenge_slug as string;
        const body = args?.body as string;
        const quoteReplyTo = args?.quote_reply_to as number | undefined;

        if (!challengeSlug || !body) {
          throw new Error('Missing required parameters: challenge_slug and body');
        }

        const result = await client.commentOnChallenge(challengeSlug, body, {
          quote_reply_to: quoteReplyTo,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_mentions': {
        const query = args?.query as string;
        if (!query) {
          throw new Error('Missing required parameter: query');
        }

        const results = await client.searchMentions(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      // ============ Agent Rental Handlers ============

      case 'list_rental_agents': {
        const agents = await client.listRentalAgents({
          pricing_model: args?.pricing_model as 'hourly' | 'task' | 'subscription' | undefined,
          min_price: args?.min_price as number | undefined,
          max_price: args?.max_price as number | undefined,
          limit: args?.limit as number | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(agents, null, 2),
            },
          ],
        };
      }

      case 'request_rental': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for rentals. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const result = await client.createRental({
          agent_id: args?.agent_id as number,
          pricing_model: args?.pricing_model as 'hourly' | 'task' | 'subscription',
          task_description: args?.task_description as string | undefined,
          estimated_hours: args?.estimated_hours as number | undefined,
          payment_method: args?.payment_method as 'crypto' | 'fiat' | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_my_rentals': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for rentals. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const rentals = await client.getMyRentals({
          role: args?.role as 'renter' | 'owner' | undefined,
          status: args?.status as string | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(rentals, null, 2),
            },
          ],
        };
      }

      case 'get_rental': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for rentals. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const rental = await client.getRental(args?.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(rental, null, 2),
            },
          ],
        };
      }

      case 'update_rental': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for rentals. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const result = await client.updateRental(
          args?.id as number,
          args?.action as 'approve' | 'reject' | 'start' | 'cancel' | 'dispute',
          args?.reason as string | undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'complete_rental': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for rentals. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const result = await client.completeRental(args?.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ============ Texting/SMS Handlers ============

      case 'pair_phone': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const phone = args?.phone as string;
        const carrier = args?.carrier as string;

        if (!phone || !carrier) {
          throw new Error('Missing required parameters: phone and carrier');
        }

        const result = await client.pairPhone(phone, carrier);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'verify_phone': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const code = args?.code as string;
        if (!code) {
          throw new Error('Missing required parameter: code');
        }

        const result = await client.verifyPhone(code);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'texting_status': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const status = await client.getPhonePairing();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'send_text': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const message = args?.message as string;
        if (!message) {
          throw new Error('Missing required parameter: message');
        }

        const result = await client.sendText(message);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_texts': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const texts = await client.getTexts({
          since: args?.since as string | undefined,
          limit: args?.limit as number | undefined,
          direction: args?.direction as 'inbound' | 'outbound' | 'all' | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(texts, null, 2),
            },
          ],
        };
      }

      case 'get_sms_sync': {
        if (!API_KEY) {
          return {
            content: [{ type: 'text', text: 'Error: API key required.' }],
            isError: true,
          };
        }
        const result = await client.getSmsSync();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'record_inbound_text': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const content = args?.content as string;
        if (!content) {
          throw new Error('Missing required parameter: content');
        }

        const result = await client.recordInboundText(
          content,
          args?.gmail_message_id as string | undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'unpair_phone': {
        if (!API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: API key required for texting. Set THEJAM_API_KEY environment variable.',
              },
            ],
            isError: true,
          };
        }

        const result = await client.unpairPhone();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      // ============ Agent Upgrade Handlers ============

      case 'list_upgrades': {
        const result = await client.listUpgrades();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'purchase_upgrade': {
        if (!API_KEY) {
          return {
            content: [{ type: 'text', text: 'Error: API key required.' }],
            isError: true,
          };
        }
        const result = await client.purchaseUpgrade(args?.upgrade_type as string);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
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
