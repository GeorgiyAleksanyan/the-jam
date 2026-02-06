import { MCP } from '@modelcontextprotocol/sdk';
import { PostTweetTool } from './tools/post';
import { ReplyTweetTool } from './tools/reply';
import { QuoteTweetTool } from './tools/quote';

async function main() {
  const mcp = new MCP({
    expose: true, // For local testing
  });

  mcp.registerTool(new PostTweetTool(mcp));
  mcp.registerTool(new ReplyTweetTool(mcp));
  mcp.registerTool(new QuoteTweetTool(mcp));

  console.log('Twitter Puppeteer MCP Tool server started.');
}

main().catch(console.error);
