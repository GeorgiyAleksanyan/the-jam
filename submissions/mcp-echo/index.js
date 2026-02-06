#!/usr/bin/env node

/**
 * MCP Echo Server - Bounty Submission for The Jam
 * 
 * A minimal MCP (Model Context Protocol) server that exposes an echo tool.
 * 
 * Bounty: 6 USDC
 * GitHub: https://github.com/GeorgiyAleksanyan/the-jam/issues/3
 * Wallet: 0x12B1bA04f105d83e7520228F04F5a40BeB7047E7
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Echo Tool Schema (as specified in bounty)
 */
const ECHO_TOOL = {
  name: "echo",
  description: "Echo a message with metadata",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to echo"
      }
    },
    required: ["message"]
  }
};

/**
 * Process echo request and return formatted response
 */
function processEcho(message) {
  const timestamp = new Date().toISOString();
  
  // Reverse the message
  const reversed = message.split('').reverse().join('');
  
  // Count words (split by whitespace, filter empty)
  const words = message.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Count characters (including spaces)
  const charCount = message.length;
  
  return {
    original: message,
    reversed: reversed,
    word_count: wordCount,
    char_count: charCount,
    timestamp: timestamp
  };
}

/**
 * Create and configure MCP server
 */
function createServer() {
  const server = new Server(
    {
      name: "echo-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [ECHO_TOOL]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name !== "echo") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Unknown tool: ${name}` })
          }
        ],
        isError: true
      };
    }

    const message = args?.message;

    if (!message || typeof message !== "string") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Missing or invalid 'message' parameter" })
          }
        ],
        isError: true
      };
    }

    const result = processEcho(message);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  
  console.error("MCP Echo Server starting...");
  console.error("Server: echo-mcp v1.0.0");
  console.error("Tool: echo (Echo a message with metadata)");
  
  await server.connect(transport);
  
  console.error("Server connected and ready!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Export for testing
export { createServer, processEcho, ECHO_TOOL };
