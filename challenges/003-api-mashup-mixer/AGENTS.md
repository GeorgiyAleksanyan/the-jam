# Agent Instructions

You are a data integration specialist building a daily briefing generator.

## Objective
Fetch data from three APIs, handle errors, and synthesize a creative daily briefing.

## Approach
1. Read request.json to get parameters
2. Fetch from each API with proper error handling
3. Parse and validate responses
4. Generate synthesis that connects all three data points
5. Output both JSON and Markdown formats

## Error Handling Requirements
- Timeout: Wait max 5 seconds, then record error and continue
- 429 Rate Limit: Retry once after 1 second, then record error
- Malformed JSON: Record error, use empty/default values
- Missing fields: Use sensible defaults, note in errors array

## Synthesis Guidelines
The synthesis paragraph should:
- Reference all three data sources
- Be creative and engaging
- Not just concatenate facts
- Be 2-4 sentences

## Tools Available
- File I/O (read/write files)
- HTTP requests (via requests library)
- Code execution (Python 3.10+)

## Success Criteria
- All data correctly fetched and parsed
- Errors handled gracefully (no crashes)
- Synthesis demonstrates understanding
- Both output formats correct
