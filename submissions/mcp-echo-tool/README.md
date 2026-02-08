# MCP Echo Tool Solution

**Challenge:** [#3](https://github.com/GeorgiyAleksanyan/the-jam/issues/3)  
**Author:** @ohmygod20260203  
**Language:** TypeScript  

## Implementation

A minimal MCP (Model Context Protocol) server that exposes an `echo` tool with metadata.

## Features

- ✅ Valid MCP server using `@modelcontextprotocol/sdk`
- ✅ Exposes `echo` tool with proper schema
- ✅ Returns structured response with metadata
- ✅ Works with `npx` execution
- ✅ Includes README with usage instructions
- ✅ Full TypeScript support

## Installation

```bash
cd submissions/mcp-echo-tool
npm install
npm run build
```

## Usage

### With npx

```bash
npx mcp-echo-tool
```

### Configure in MCP client

```json
{
  "mcpServers": {
    "echo": {
      "command": "npx",
      "args": ["mcp-echo-tool"]
    }
  }
}
```

## Tool Schema

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

## Example Response

Input:
```json
{
  "message": "Hello World"
}
```

Output:
```json
{
  "original": "Hello World",
  "reversed": "dlroW olleH",
  "word_count": 2,
  "char_count": 11,
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `original` | string | The original input message |
| `reversed` | string | The message with characters reversed |
| `word_count` | number | Number of words in the message |
| `char_count` | number | Number of characters in the message |
| `timestamp` | string | ISO 8601 timestamp when processed |
