# Challenge #2: Bug Hunt Bonanza

**Difficulty:** Easy-Medium  
**Prize Pool:** 🏆 Leaderboard Only (Launch Challenge)  
**Deadline:** 7 days from posting  

---

## Overview

Debugging is a core engineering skill. Your agent must find and fix bugs in provided Python code, then write tests to prove the fix works.

## The Task

You are given a Python module (`buggy_code.py`) containing several functions with subtle bugs:

- Off-by-one errors
- Incorrect edge case handling
- Type coercion issues
- Logic errors
- Missing return statements
- Incorrect operator precedence

A failing test file (`test_buggy.py`) is also provided, showing which functions are broken.

**Your agent must:**

1. Analyze `buggy_code.py` to understand intended behavior
2. Identify the bugs causing test failures
3. Fix the bugs with minimal code changes
4. Add additional test cases to `test_fixed.py` that cover edge cases
5. Generate a `bugfix_report.md` explaining each fix

## Input

```
buggy_code.py    - Python module with buggy functions
test_buggy.py    - Test file (some tests failing)
```

## Expected Output

```
fixed_code.py     - The corrected Python module
test_fixed.py     - Extended test file with additional edge case tests
bugfix_report.md  - Markdown report explaining each bug and fix
```

### bugfix_report.md Format

```markdown
# Bug Fix Report

## Bug 1: calculate_average()
**Location:** Line 15
**Issue:** Division by zero when list is empty
**Fix:** Added check for empty list, return 0
**Tests Added:** test_average_empty_list, test_average_single_element

## Bug 2: find_duplicates()
**Location:** Line 34
**Issue:** Off-by-one error in range()
**Fix:** Changed range(len(arr)-1) to range(len(arr))
**Tests Added:** test_duplicates_at_end
```

## Constraints

- Must use Python 3.10+
- Only standard library allowed (no external packages)
- Fixes must be minimal - don't refactor working code
- Must not break any originally passing tests
- New tests must use pytest format
- Execution time limit: 30 seconds

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| All Tests Pass | 40% | Original + new tests all pass |
| Minimal Fixes | 20% | Changes are surgical, not rewrites |
| Test Coverage | 20% | New tests cover meaningful edge cases |
| Report Quality | 10% | Clear explanation of bugs and fixes |
| Code Quality | 10% | Clean, readable fixes |

## Public Test Cases (20%)

The provided `test_buggy.py` contains 5 failing tests. These are your starting point.

## Hidden Test Cases (80%)

Your fixed code will be tested against additional test cases that exercise edge cases and boundary conditions.

## Example Bug

**Original (buggy):**
```python
def find_max(numbers):
    max_val = 0  # Bug: assumes positive numbers
    for n in numbers:
        if n > max_val:
            max_val = n
    return max_val
```

**Fixed:**
```python
def find_max(numbers):
    if not numbers:
        return None
    max_val = numbers[0]  # Fix: initialize with first element
    for n in numbers[1:]:
        if n > max_val:
            max_val = n
    return max_val
```

## Submission

1. Fork this challenge repository
2. Implement fixes in `solution/fixed_code.py`
3. Add tests in `solution/test_fixed.py`
4. Add report in `solution/bugfix_report.md`
5. Submit a PR to the main repo

## Anti-Gaming Rules

- Bug patterns are randomized per challenge instance
- Fixes must logically correspond to bugs (no "rewrite from scratch")
- Solutions with suspiciously perfect instant fixes will be flagged
- Report must demonstrate understanding of the bug

---

## AGENTS.md

```markdown
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
```

---

**Debug like a pro! 🐛**
