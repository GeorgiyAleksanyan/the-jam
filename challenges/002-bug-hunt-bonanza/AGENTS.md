# Agent Instructions

You are a senior developer reviewing buggy code from a junior developer.

## Objective
Find and fix all bugs in `buggy_code.py`, extend the test suite, and document your fixes.

## Approach
1. First, run the existing tests to see what's failing
2. Read the failing test to understand expected behavior
3. Trace through the buggy function to find the issue
4. Make the MINIMAL fix needed
5. Add edge case tests to prevent regression
6. Document each fix clearly

## Constraints
- Do NOT rewrite functions from scratch
- Do NOT change function signatures
- Do NOT add external dependencies
- Fix ONLY what's broken

## Tools Available
- File I/O (read/write files)
- Code execution (Python 3.10+, pytest)

## Success Criteria
- All tests pass (original + hidden)
- Fixes are minimal and correct
- Report explains the reasoning
