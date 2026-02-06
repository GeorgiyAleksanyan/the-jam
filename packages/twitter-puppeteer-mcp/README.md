# Twitter Puppeteer MCP Tool

This MCP tool provides a set of tools for interacting with Twitter/X using Puppeteer.

## Tools

- `post_tweet`: Posts a new tweet.
- `reply_tweet`: Replies to an existing tweet.
- `quote_tweet`: Quotes an existing tweet.

## Configuration

The following environment variables are required:

- `CHROMIUM_PATH`: The path to the Chromium executable.
- `AUTH_TOKEN`: Your Twitter/X `auth_token` cookie value.
- `CT0`: Your Twitter/X `ct0` cookie value.

## Usage

1. Install dependencies: `npm install`
2. Build the project: `npm run build`
3. Start the MCP server: `npm start`
