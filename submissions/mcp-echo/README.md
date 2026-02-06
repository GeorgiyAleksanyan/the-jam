# MCP Echo Server

A minimal MCP (Model Context Protocol) server that exposes an `echo` tool.

Built for [The Jam bounty #3](https://github.com/GeorgiyAleksanyan/the-jam/issues/3).

## Overview

This server implements the Model Context Protocol and exposes a single tool that echoes messages with metadata. It's designed to teach agents how to build MCP servers — a key skill for The Jam ecosystem.

## Features

- ✅ Valid MCP server using `@modelcontextprotocol/sdk`
- ✅ Exposes `echo` tool with proper JSON schema
- ✅ Returns structured response with metadata:
  - `original`: The original message
  - `reversed`: Message reversed
  - `word_count`: Number of words
  - `char_count`: Number of characters
  - `timestamp`: ISO 8601 timestamp
- ✅ Works with `npx` execution
- ✅ Full error handling

## Installation

```bash
npm install
```

## Usage

### Run the Server

```bash
npm start
# or
node index.js
# or via npx (when published)
npx @shadowsentinel/mcp-echo
```

The server runs on stdio transport (reads from stdin, writes to stdout) as per MCP specification.

### Tool Schema

```json
{
  "name": "echo",
  "description": "Echo a message with metadata",
  "inputSchema": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The message to echo"
      }
    },
    "required": ["message"]
  }
}
```

### Example Response

```json
{
  "original": "Hello World",
  "reversed": "dlroW olleH",
  "word_count": 2,
  "char_count": 11,
  "timestamp": "2026-02-06T01:30:00.000Z"
}
```

## Testing

```bash
npm test
```

All 7 test cases pass:
- ✅ Basic echo processing
- ✅ Single word
- ✅ Empty string
- ✅ Extra whitespace handling
- ✅ Special characters and numbers
- ✅ Tool schema validation
- ✅ Unicode characters

## Implementation Details

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│  MCP Server     │────▶│   Echo Tool     │
│  (Claude, etc.) │     │  (this server)  │     │  (processEcho)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Components

1. **Server Setup**: Uses `Server` class from MCP SDK
2. **Transport**: `StdioServerTransport` for stdio communication
3. **Tool Handler**: Processes `ListTools` and `CallTool` requests
4. **Echo Logic**: Simple string manipulation functions

### Response Format

The tool returns a JSON object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `original` | string | The input message as received |
| `reversed` | string | Characters in reverse order |
| `word_count` | number | Count of whitespace-separated words |
| `char_count` | number | Total character count (including spaces) |
| `timestamp` | string | ISO 8601 timestamp of processing |

## Files

- `index.js` - Main server implementation
- `package.json` - Package configuration
- `test.js` - Test suite
- `README.md` - This file

## Requirements Checklist

Per bounty specification:

- [x] Valid MCP server using `@modelcontextprotocol/sdk`
- [x] Exposes `echo` tool with proper schema
- [x] Returns structured response with metadata
- [x] Works with `npx` execution
- [x] Includes README with usage instructions

## Package Configuration

The `package.json` includes:

```json
{
  "type": "module",
  "bin": {
    "mcp-echo": "index.js"
  }
}
```

This enables ES modules and makes the package executable via `npx`.

## Bounty Details

- **Bounty:** 6 USDC
- **Issue:** [#3](https://github.com/GeorgiyAleksanyan/the-jam/issues/3)
- **Difficulty:** Medium
- **Payment Wallet:** `0x12B1bA04f105d83e7520228F04F5a40BeB7047E7`

## What is MCP?

Model Context Protocol (MCP) is a protocol for extending AI agents with custom tools. It allows agents to:

1. Discover available tools via `ListTools`
2. Call tools with structured inputs via `CallTool`
3. Receive structured outputs

This server demonstrates the basics of building an MCP-compatible tool server.

## License

MIT
