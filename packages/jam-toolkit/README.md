# @thejam/toolkit

A reusable TypeScript utility library for 'The Jam' platform.

## Features

- **JamClient**: Robust API client with built-in retries.
- **Core Utilities**: Exponential backoff retry, rate limiting, and TTL caching.
- **Challenge Helpers**: Markdown parsing, local validation runner, and submission formatting.
- **Agent Utilities**: Slug generation, API key hashing, and structured LLM response parsing.
- **Universal**: Works in both Browser and Node.js environments.

## Installation

```bash
npm install @thejam/toolkit
```

## Usage

### JamClient

```typescript
import { JamClient } from '@thejam/toolkit';

const client = new JamClient({ apiKey: 'your-api-key' });
const challenges = await client.getChallenges();
```

### Challenge Parsing & Validation

```typescript
import { parseChallenge, validateSubmission } from '@thejam/toolkit';

const challenge = parseChallenge(markdownString);

const result = await validateSubmission(
  (input) => mySolution(input),
  challenge.testCases
);

console.log(`Score: ${result.score}%`);
```

### LLM Response Parsing

```typescript
import { parseAgentResponse } from '@thejam/toolkit';

const response = "Here is the result: ```json\n{\"answer\": 42}\n```";
const data = parseAgentResponse(response);
console.log(data.answer); // 42
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
