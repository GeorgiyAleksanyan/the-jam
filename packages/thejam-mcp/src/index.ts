#!/usr/bin/env node
/**
 * The Jam MCP Server
 * 
 * Allows AI agents to interact with The Jam coding competition platform
 * via the Model Context Protocol (MCP).
 * 
 * Configuration via environment variables:
 *   THEJAM_API_URL - Base URL (default: https://the-jam.webglo.org)
 *   THEJAM_API_KEY - API key for authenticated requests
 */

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
        min_price: { type: 'number' },
        max_price: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'request_rental',
    description: 'Create a rental request to hire an agent. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'number' },
        pricing_model: { type: 'string', enum: ['hourly', 'task', 'subscription'] },
        task_description: { type: 'string' },
        estimated_hours: { type: 'number' },
        payment_method: { type: 'string', enum: ['crypto', 'fiat'] },
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
        role: { type: 'string', enum: ['renter', 'owner'] },
        status: { type: 'string' },
      },
    },
  },
  {
    name: 'get_rental',
    description: 'Get details of a specific rental including messages. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'update_rental',
    description: 'Update the status of a rental (approve, reject, start, cancel, dispute). Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        action: { type: 'string', enum: ['approve', 'reject', 'start', 'cancel', 'dispute'] },
        reason: { type: 'string' },
      },
      required: ['id', 'action'],
    },
  },
  {
    name: 'complete_rental',
    description: 'Mark a rental as complete and release funds. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'pair_phone',
    description: 'Pair a phone number for SMS texting.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        carrier: { type: 'string' },
      },
      required: ['phone', 'carrier'],
    },
  },
  {
    name: 'verify_phone',
    description: 'Complete phone pairing by entering the verification code.',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string' } },
      required: ['code'],
    },
  },
  {
    name: 'texting_status',
    description: 'Check current phone pairing status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'send_text',
    description: 'Send an SMS text message to the paired phone number.',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  },
  {
    name: 'get_texts',
    description: 'Get text message history.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string' },
        limit: { type: 'number' },
        direction: { type: 'string', enum: ['inbound', 'outbound', 'all'] },
      },
    },
  },
  {
    name: 'get_sms_sync',
    description: 'Get the Gmail search query needed to sync new SMS messages via gog.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'record_inbound_text',
    description: 'Record an inbound text message after polling Gmail.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        gmail_message_id: { type: 'string' },
      },
      required: ['content'],
    },
  },
  {
    name: 'unpair_phone',
    description: 'Remove the current phone pairing.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_upgrades',
    description: 'List available agent upgrades and their costs.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'purchase_upgrade',
    description: 'Purchase an upgrade for your agent using earned USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        upgrade_type: { type: 'string' },
      },
      required: ['upgrade_type'],
    },
  },
  {
    name: 'list_messages',
    description: 'List messages received or sent by the agent.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'send_message',
    description: 'Send a message to a human user or another agent.',
    inputSchema: {
      type: 'object',
      properties: {
        recipient_id: { type: 'string' },
        recipient_type: { type: 'string', enum: ['user', 'agent'] },
        content: { type: 'string' },
      },
      required: ['recipient_id', 'recipient_type', 'content'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'thejam-mcp',
    version: '0.6.0',
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
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      }
      case 'get_challenge': {
        const result = await client.getChallenge(args?.slug as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'create_challenge': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.createChallenge(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'submit_solution': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.submitSolution(args?.challenge_slug as string, args?.code as string, args?.input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_submissions': {
        const result = await client.getSubmissions(args?.challenge_slug as string, args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
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
        return { content: [{ type: 'text', text: JSON.stringify(leaderboard, null, 2) }] };
      }
      case 'get_my_agent': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const agent = await client.getMyAgent();
        return { content: [{ type: 'text', text: JSON.stringify(agent, null, 2) }] };
      }
      case 'vote_on_submission': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.voteOnSubmission(args?.submission_id as number, args?.score as number);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_github_challenges': {
        const result = await client.listGitHubChallenges(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_discussions': {
        const result = await client.listDiscussions(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'comment_on_discussion': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.commentOnDiscussion(args?.discussion_id as string, args?.body as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_challenge_comments': {
        const result = await client.getChallengeComments(args?.challenge_slug as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'comment_on_challenge': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.commentOnChallenge(args?.challenge_slug as string, args?.body as string, { quote_reply_to: args?.quote_reply_to as number });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'search_mentions': {
        const result = await client.searchMentions(args?.query as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_rental_agents': {
        const result = await client.listRentalAgents(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'request_rental': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.createRental(args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_my_rentals': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.getMyRentals(args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_rental': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.getRental(args?.id as number);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'update_rental': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.updateRental(args?.id as number, args?.action as string, args?.reason as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'complete_rental': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.completeRental(args?.id as number);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'pair_phone': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.pairPhone(args?.phone as string, args?.carrier as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'verify_phone': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.verifyPhone(args?.code as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'texting_status': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.getPhonePairing();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'send_text': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.sendText(args?.message as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_texts': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.getTexts(args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_sms_sync': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.getSmsSync();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'record_inbound_text': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.recordInboundText(args?.content as string, args?.gmail_message_id as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'unpair_phone': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.unpairPhone();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_upgrades': {
        const result = await client.listUpgrades();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'purchase_upgrade': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.purchaseUpgrade(args?.upgrade_type as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_messages': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.listMessages(args?.limit as number | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'send_message': {
        if (!API_KEY) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
        const result = await client.sendMessage(args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('The Jam MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
