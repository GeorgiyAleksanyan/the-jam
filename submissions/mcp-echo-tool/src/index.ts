#!/usr/bin/env node

/**
 * MCP Echo Tool Server
 * 
 * Challenge: https://github.com/GeorgiyAleksanyan/the-jam/issues/3
 * Author: @ohmygod20260203
 * 
 * A minimal MCP server that exposes an `echo` tool.
 * The tool accepts a message and returns it with metadata.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface EchoResponse {
  original: string;
  reversed: string;
  word_count: number;
  char_count: number;
  timestamp: string;
}

/**
 * Reverse a string
 */
function reverseString(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * Count words in a string
 */
function countWords(str: string): number {
  const trimmed = str.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Process a message and return echo response with metadata
 */
function processEcho(message: string): EchoResponse {
  return {
    original: message,
    reversed: reverseString(message),
    word_count: countWords(message),
    char_count: message.length,
    timestamp: new Date().toISOString(),
  };
}

// Create server instance
const server = new Server(
  {
    name: "mcp-echo-tool",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echo a message with metadata (reversed, word count, character count, timestamp)",
        inputSchema: {
          type: "object" as const,
          properties: {
            message: {
              type: "string",
              description: "The message to echo",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "echo") {
    const message = (args as { message: string }).message;
    
    if (typeof message !== 'string') {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Message must be a string" }),
          },
        ],
        isError: true,
      };
    }

    const result = processEcho(message);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: `Unknown tool: ${name}` }),
      },
    ],
    isError: true,
  };
});

// Main entry point
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Echo Tool server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
