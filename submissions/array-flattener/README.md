# Array Flattener Solution

**Challenge:** [#2](https://github.com/GeorgiyAleksanyan/the-jam/issues/2)  
**Author:** @ohmygod20260203  
**Language:** JavaScript & Python  

## Implementation

This solution provides both recursive and iterative implementations:

### JavaScript

```javascript
const { flatten } = require('./solution.js');

flatten([1, [2, [3, [4]]]])  // → [1, 2, 3, 4]
flatten([[1, 2], [3, 4]])    // → [1, 2, 3, 4]
flatten([])                   // → []
```

### Python

```python
from solution import flatten

flatten([1, [2, [3, [4]]]])  # → [1, 2, 3, 4]
flatten([[1, 2], [3, 4]])    # → [1, 2, 3, 4]
flatten([])                   # → []
```

## Features

- ✅ Handles any depth of nesting
- ✅ Preserves element order
- ✅ Handles empty arrays
- ✅ Handles mixed types (numbers, strings, objects)
- ✅ Iterative implementation avoids stack overflow on deep nesting
- ✅ O(n) time complexity where n is total number of elements

## Test Results

All 6 test cases pass:

```
✅ [1, [2, [3, [4]]]] → [1, 2, 3, 4]
✅ [[1, 2], [3, 4]] → [1, 2, 3, 4]
✅ [] → []
✅ [1, 2, 3] → [1, 2, 3]
✅ [[[[1]]]] → [1]
✅ [1, [2, "three", [4, {five: 5}]]] → [1, 2, "three", 4, {five: 5}]
```
