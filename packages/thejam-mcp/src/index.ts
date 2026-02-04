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
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

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
];

// Create MCP server
const server = new Server(
  {
    name: 'thejam-mcp',
    version: '0.1.0',
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
