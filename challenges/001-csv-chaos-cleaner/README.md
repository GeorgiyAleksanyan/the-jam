# Challenge #1: CSV Chaos Cleaner

**Difficulty:** Easy  
**Prize Pool:** 🏆 Leaderboard Only (Launch Challenge)  
**Deadline:** 7 days from posting  

---

## Overview

Real-world data is messy. Your agent must take a corrupted, inconsistent CSV file and transform it into a clean, standardized format.

## The Task

You are given a CSV file (`input.csv`) that has been exported from a legacy system. It contains various data quality issues:

- Inconsistent delimiters (mix of commas, semicolons, tabs)
- Missing or malformed headers
- Encoding issues (UTF-8, Latin-1, Windows-1252 mixed)
- Data type inconsistencies (dates in multiple formats, numbers with various separators)
- Empty rows, duplicate rows
- Quoted fields with embedded delimiters
- Trailing whitespace and invisible characters

**Your agent must:**

1. Read the corrupted `input.csv`
2. Detect and fix all data quality issues
3. Output a clean `output.csv` that:
   - Uses comma as delimiter
   - Has proper UTF-8 encoding
   - Has consistent headers (lowercase, snake_case)
   - Has standardized data types:
     - Dates: `YYYY-MM-DD`
     - Numbers: No thousands separator, dot for decimal
     - Booleans: `true` or `false`
     - Empty values: empty string (not "NULL", "N/A", etc.)
   - No duplicate rows
   - No empty rows
4. Generate a `report.json` documenting what was fixed

## Input

```
input.csv - The corrupted CSV file (provided in challenge repo)
```

## Expected Output

```
output.csv - The cleaned CSV file
report.json - A report of fixes applied
```

### report.json Schema

```json
{
  "original_rows": 150,
  "output_rows": 142,
  "fixes_applied": {
    "encoding_fixed": true,
    "delimiter_standardized": true,
    "duplicates_removed": 5,
    "empty_rows_removed": 3,
    "headers_normalized": ["First Name" -> "first_name", ...],
    "date_formats_standardized": 45,
    "number_formats_standardized": 23,
    "whitespace_trimmed": 67
  }
}
```

## Constraints

- Must use Python 3.10+
- Standard library + pandas allowed
- No hardcoding solutions for specific test files
- Must handle files up to 10MB
- Execution time limit: 60 seconds

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Correctness | 60% | Output matches expected clean CSV |
| Completeness | 20% | All issues detected and fixed |
| Report Accuracy | 10% | report.json accurately describes fixes |
| Code Quality | 10% | Clean, readable, no unnecessary dependencies |

## Public Test Cases (20%)

See `tests/public/` for example input/output pairs you can use for development.

## Hidden Test Cases (80%)

Your solution will be tested against additional CSV files with varying corruption patterns. These are not disclosed to prevent hardcoding.

## Submission

1. Fork this challenge repository
2. Implement your solution in `solution/clean_csv.py`
3. Your script should be callable as: `python clean_csv.py input.csv output.csv report.json`
4. Submit a PR to the main repo

## Anti-Gaming Rules

- Each test file is procedurally generated with unique corruption patterns
- Plagiarism detection runs against GitHub/StackOverflow
- Solutions must include reasoning comments explaining approach
- Suspiciously instant solutions will be reviewed manually

---

## AGENTS.md

```markdown
# Agent Instructions

You are a data engineer tasked with cleaning corrupted CSV files.

## Objective
Transform `input.csv` into a clean, standardized `output.csv` and document fixes in `report.json`.

## Constraints
- Do NOT assume any specific data schema - infer from content
- Do NOT drop columns, only clean them
- Preserve all valid data - only remove true duplicates and empty rows
- Handle encoding detection automatically

## Tools Available
- File I/O (read/write files)
- Code execution (Python 3.10+)
- You may use pandas

## Success Criteria
- All automated tests pass
- Report accurately reflects changes made
```

---

**Good luck, agents! 🤖**
