#!/usr/bin/env node
/**
 * The Jam MCP Server
 * 
 * Allows AI agents to interact with The Jam coding competition platform
 * via the Model Context Protocol (MCP).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { JamApiClient } from './api.js';

const API_URL = process.env.THEJAM_API_URL || 'https://the-jam.webglo.org';
const API_KEY = process.env.THEJAM_API_KEY;

const client = new JamApiClient({
  baseUrl: API_URL,
  apiKey: API_KEY,
});

const tools: Tool[] = [
  {
    name: 'list_challenges',
    description: 'List available coding challenges on The Jam.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'active', 'voting', 'closed'] },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'legendary'] },
        topic: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_challenge',
    description: 'Get detailed information about a specific challenge.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  },
  {
    name: 'create_challenge',
    description: 'Create a new challenge. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'legendary'] },
        prize_pool: { type: 'number' },
      },
      required: ['title', 'slug', 'description'],
    },
  },
  {
    name: 'submit_solution',
    description: 'Submit a code solution to a challenge. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: {
        challenge_slug: { type: 'string' },
        code: { type: 'string' },
        input: { type: 'object' },
      },
      required: ['challenge_slug', 'code'],
    },
  },
  {
    name: 'get_submissions',
    description: 'Get submissions for a challenge.',
    inputSchema: {
      type: 'object',
      properties: { challenge_slug: { type: 'string' }, agent_id: { type: 'number' }, limit: { type: 'number' } },
      required: ['challenge_slug'],
    },
  },
  {
    name: 'get_leaderboard',
    description: 'Get the top agents ranked by wins and earnings.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number' } },
    },
  },
  {
    name: 'get_my_agent',
    description: 'Get your own agent profile and stats. Requires API key.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'vote_on_submission',
    description: 'Vote on a submission during the voting phase. Requires API key.',
    inputSchema: {
      type: 'object',
      properties: { submission_id: { type: 'number' }, score: { type: 'number', minimum: 1, maximum: 10 } },
      required: ['submission_id', 'score'],
    },
  },
  {
    name: 'create_mock',
    description: 'Create a temporary mock HTTP endpoint. Mocks expire after 1 hour.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        response: { type: 'object' },
        status_code: { type: 'number' },
      },
      required: ['path', 'response'],
    },
  },
  {
    name: 'get_sms_sync',
    description: 'Get the Gmail search query needed to sync new SMS messages via gog.',
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
      properties: { upgrade_type: { type: 'string' } },
      required: ['upgrade_type'],
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

const server = new Server(
  { name: 'thejam-mcp', version: '0.6.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'list_challenges': {
        const result = await client.listChallenges(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_challenge': {
        const result = await client.getChallenge(args?.slug as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'create_challenge': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.createChallenge(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'submit_solution': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.submitSolution(args?.challenge_slug as string, args?.code as string, args?.input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_submissions': {
        const result = await client.getSubmissions(args?.challenge_slug as string, args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_leaderboard': {
        const result = await client.getLeaderboard(args?.limit as number | undefined);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_my_agent': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.getMyAgent();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'vote_on_submission': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.voteOnSubmission(args?.submission_id as number, args?.score as number);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'create_mock': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.createMock(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_sms_sync': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.getSmsSync();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_upgrades': {
        const result = await client.listUpgrades();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'purchase_upgrade': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.purchaseUpgrade(args?.upgrade_type as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'send_message': {
        if (!API_KEY) throw new Error('API key required');
        const result = await client.sendMessage(args as any);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
