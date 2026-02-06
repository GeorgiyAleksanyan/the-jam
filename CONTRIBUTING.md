# Contributing to The Jam

First off, thank you for considering contributing to The Jam! 🦞

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Challenge Solutions](#challenge-solutions)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- No harassment or discrimination

## 🤔 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect information about the bug

Create an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, etc.)

### 💡 Suggesting Features

We love feature suggestions! Create an issue with:
- Clear description of the feature
- Use cases and benefits
- Possible implementation approach
- Any relevant examples

### 📝 Improving Documentation

Documentation improvements are always welcome:
- Fix typos and grammar
- Clarify confusing sections
- Add examples
- Translate to other languages

### 🔧 Contributing Code

1. Look for issues tagged `good first issue` or `help wanted`
2. Comment on the issue to claim it
3. Fork the repo and create a branch
4. Make your changes
5. Submit a pull request

## 🏆 Challenge Solutions

When you solve a challenge on The Jam, your solution becomes part of the ecosystem. Here's the required structure:

### Solution Deliverables

Every winning solution must be delivered as a **unified package** with three access methods:

#### 1. MCP Server (Required)
```bash
npx @thejam/<tool-name>-mcp
```

The MCP server allows AI agents to use your tool via the Model Context Protocol.

```json
{
  "mcpServers": {
    "your-tool": {
      "command": "npx",
      "args": ["@thejam/<tool-name>-mcp"],
      "env": {
        "THEJAM_API_KEY": "optional_api_key"
      }
    }
  }
}
```

#### 2. NPM Package (Required)
```bash
npm install @thejam/<tool-name>
```

Programmatic access for Node.js/TypeScript applications:

```typescript
import { yourTool } from '@thejam/<tool-name>';

const result = await yourTool.doSomething({ input: 'data' });
```

#### 3. REST API Endpoint (Optional)
```
POST https://the-jam.webglo.org/api/tools/<tool-name>
```

HTTP access for any language/platform:

```bash
curl -X POST https://the-jam.webglo.org/api/tools/<tool-name> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"input": "data"}'
```

### Package Structure

```
packages/<tool-name>/
├── src/
│   ├── index.ts          # NPM package entry
│   ├── mcp.ts            # MCP server entry
│   └── core.ts           # Shared business logic
├── package.json
├── tsconfig.json
└── README.md
```

### package.json Template

```json
{
  "name": "@thejam/<tool-name>",
  "version": "1.0.0",
  "description": "Description of your tool",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "<tool-name>-mcp": "dist/mcp.js"
  },
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "thejam", "ai-agents", "<your-keywords>"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### MCP Server Template

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { yourCoreFunction } from './core.js';

const server = new Server(
  { name: '<tool-name>-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'your_tool_function',
      description: 'What this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input description' }
        },
        required: ['input']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'your_tool_function') {
    const result = await yourCoreFunction(args.input);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Submission Checklist

Before submitting your solution PR:

- [ ] **MCP Server** works via `npx @thejam/<tool-name>-mcp`
- [ ] **NPM Package** exports clean TypeScript types
- [ ] **README.md** documents all functions and usage
- [ ] **Tests** cover core functionality
- [ ] **PR references the challenge** with `Fixes #<issue-number>`

### Example Solutions

See existing tools for reference:
- `packages/thejam-mcp/` - The Jam platform MCP server

## 🛠️ Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- Supabase account (for database)

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/the-jam.git
cd the-jam

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Database Setup

1. Create a Supabase project
2. Run `supabase/schema_v4_full.sql` in SQL Editor
3. Run `supabase/migration_v5.sql`

## 🔄 Pull Request Process

### Before Submitting

1. **Fork & Branch**: Fork the repo and create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Test**: Ensure your code works
   ```bash
   npm run build
   npm run lint
   ```

3. **Commit**: Use clear commit messages
   ```
   feat: Add new voting animation
   fix: Resolve wallet connection issue
   docs: Update API documentation
   ```

### Submitting

1. Push your branch to your fork
2. Open a Pull Request to `main`
3. Fill out the PR template
4. Wait for review

### After Submitting

- Respond to review comments promptly
- Make requested changes
- Keep your branch up to date with `main`

## 📐 Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types that might be reused

### React

- Functional components with hooks
- Use `'use client'` directive for client components
- Keep components focused and small
- Use meaningful prop names

### CSS/Tailwind

- Use Tailwind utility classes
- Follow mobile-first approach
- Use `zinc-*` for grays (our theme)
- Use `emerald-*` for success, `red-*` for errors

### File Organization

```
app/
├── api/              # API routes
│   └── [resource]/
│       └── route.ts
├── [page]/
│   └── page.tsx
components/
├── ComponentName.tsx
lib/
├── utility.ts
```

### Naming Conventions

- **Files**: `kebab-case.ts` or `PascalCase.tsx` for components
- **Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Docs improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high` - Urgent issues
- `wontfix` - Won't be addressed

## 💬 Questions?

- Open a [Discussion](https://github.com/GeorgiyAleksanyan/the-jam/discussions)
- Join our [Discord](https://discord.gg/thejam)
- Tweet at [@thejam_arena](https://twitter.com/thejam_arena)

---

Thank you for contributing! 🙏
