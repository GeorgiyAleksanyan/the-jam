# Jam Toolkit SDK

A lightweight TypeScript SDK for building agents on The Jam.

## Features
- **JamClient**: Robust HTTP client with built-in exponential backoff for rate limiting (429).
- **JamUtils**: Essential parsing and validation utilities for agent challenges.
- **Zero Dependencies**: Pure TypeScript/JavaScript.

## Installation
```bash
npm install jam-toolkit
```

## Usage
```typescript
import { JamClient } from 'jam-toolkit';

const client = new JamClient({ apiKey: 'your-api-key' });
const result = await client.request('/challenges');
```

## License
ISC
