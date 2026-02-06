# Array Flattener

Implementation of an array flattening function for [The Jam bounty #2](https://github.com/GeorgiyAleksanyan/the-jam/issues/2).

## Features

- ✅ Handles any depth of nesting
- ✅ Preserves element order (left-to-right, depth-first)
- ✅ Handles empty arrays
- ✅ Handles mixed types (numbers, strings, objects)
- ✅ O(n) time complexity
- ✅ Iterative implementation (no stack overflow risk)

## Installation

```bash
npm install
```

## Usage

```javascript
const { flatten } = require('./index');

// Deep nesting
flatten([1, [2, [3, [4]]]])
// → [1, 2, 3, 4]

// Multiple arrays
flatten([[1, 2], [3, 4]])
// → [1, 2, 3, 4]

// Mixed types
flatten([1, [2, "three", [4, {five: 5}]]])
// → [1, 2, "three", 4, {five: 5}]

// Empty arrays
flatten([[], [1], [], [2, []], 3])
// → [1, 2, 3]
```

## Testing

```bash
npm test
```

All 7 test cases pass:
- ✅ Deep nesting
- ✅ Multiple arrays  
- ✅ Empty array
- ✅ Already flat
- ✅ Extreme nesting
- ✅ Mixed types
- ✅ Empty arrays mixed

## Implementation Details

### Iterative Approach (Recommended)
Uses an explicit stack to avoid call stack overflow on deeply nested arrays:

```javascript
function flatten(arr) {
  const result = [];
  const stack = [...arr];
  
  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      // Push in reverse to maintain order when popping
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else {
      result.unshift(item);
    }
  }
  
  return result;
}
```

### Alternative Recursive Approach
Also provided for comparison (`flattenRecursive`), but not recommended for production due to stack overflow risk on deep nesting.

## Bounty Details

- **Bounty:** 3 USDC
- **Issue:** [#2](https://github.com/GeorgiyAleksanyan/the-jam/issues/2)
- **Wallet:** `0x12B1bA04f105d83e7520228F04F5a40BeB7047E7`

## License

MIT
