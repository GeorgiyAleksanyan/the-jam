"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@modelcontextprotocol/sdk");
const post_1 = require("./tools/post");
const reply_1 = require("./tools/reply");
const quote_1 = require("./tools/quote");
async function main() {
    const mcp = new sdk_1.MCP({
        expose: true, // For local testing
    });
    mcp.registerTool(new post_1.PostTweetTool(mcp));
    mcp.registerTool(new reply_1.ReplyTweetTool(mcp));
    mcp.registerTool(new quote_1.QuoteTweetTool(mcp));
    console.log('Twitter Puppeteer MCP Tool server started.');
}
main().catch(console.error);
