/**
 * Array Flattener - Flatten arbitrarily nested arrays into a single flat array.
 * 
 * Challenge: https://github.com/GeorgiyAleksanyan/the-jam/issues/2
 * Author: @ohmygod20260203
 */

/**
 * Flatten arbitrarily nested arrays into a single flat array.
 * Uses iterative approach to avoid stack overflow on deep nesting.
 * 
 * @param {Array} arr - The array to flatten
 * @returns {Array} - The flattened array
 * 
 * @example
 * flatten([1, [2, [3, [4]]]]) // → [1, 2, 3, 4]
 * flatten([[1, 2], [3, 4]])   // → [1, 2, 3, 4]
 * flatten([])                  // → []
 */
function flatten(arr) {
  const result = [];
  const stack = [...arr].reverse();
  
  while (stack.length > 0) {
    const current = stack.pop();
    
    if (Array.isArray(current)) {
      // Push elements in reverse order to maintain order
      for (let i = current.length - 1; i >= 0; i--) {
        stack.push(current[i]);
      }
    } else {
      result.push(current);
    }
  }
  
  return result;
}

/**
 * Recursive implementation for simpler cases.
 * Note: May cause stack overflow on very deep nesting.
 */
function flattenRecursive(arr) {
  const result = [];
  
  function helper(element) {
    if (Array.isArray(element)) {
      for (const item of element) {
        helper(item);
      }
    } else {
      result.push(element);
    }
  }
  
  helper(arr);
  return result;
}

// Test cases from challenge
const testCases = [
  { input: [1, [2, [3, [4]]]], expected: [1, 2, 3, 4] },
  { input: [[1, 2], [3, 4]], expected: [1, 2, 3, 4] },
  { input: [], expected: [] },
  { input: [1, 2, 3], expected: [1, 2, 3] },
  { input: [[[[1]]]], expected: [1] },
  { input: [1, [2, "three", [4, { five: 5 }]]], expected: [1, 2, "three", 4, { five: 5 }] }
];

// Run tests
if (require.main === module) {
  console.log("Testing flatten function:\n");
  let allPassed = true;

  for (const { input, expected } of testCases) {
    const result = flatten(input);
    const passed = JSON.stringify(result) === JSON.stringify(expected);
    
    console.log(`Input: ${JSON.stringify(input)}`);
    console.log(`Expected: ${JSON.stringify(expected)}`);
    console.log(`Got: ${JSON.stringify(result)}`);
    console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (!passed) allPassed = false;
  }

  console.log(`All tests: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

module.exports = { flatten, flattenRecursive };
