/**
 * Array Flattener - Bounty Submission for The Jam
 * 
 * Implements a function that flattens arbitrarily nested arrays 
 * into a single flat array.
 * 
 * Bounty: 3 USDC
 * GitHub: https://github.com/GeorgiyAleksanyan/the-jam/issues/2
 * Wallet: 0x12B1bA04f105d83e7520228F04F5a40BeB7047E7
 */

/**
 * Flattens an arbitrarily nested array into a single-level array.
 * 
 * @param {Array} arr - The nested array to flatten
 * @returns {Array} - A new flat array with all elements
 * 
 * Features:
 * - Handles any depth of nesting
 * - Preserves element order (left-to-right, depth-first)
 * - Handles empty arrays
 * - Preserves mixed types (numbers, strings, objects, etc.)
 * - O(n) time complexity where n = total elements
 */
function flatten(arr) {
  // Input validation
  if (!Array.isArray(arr)) {
    throw new TypeError('Input must be an array');
  }
  
  const result = [];
  
  // Use a queue (FIFO) to maintain left-to-right order
  // Start with a copy of the input array
  const queue = [...arr];
  
  while (queue.length > 0) {
    const item = queue.shift(); // Remove from front (FIFO)
    
    if (Array.isArray(item)) {
      // For arrays, add all elements to front of queue
      // This maintains depth-first, left-to-right order
      queue.unshift(...item);
    } else {
      // Non-array items go directly to result
      result.push(item);
    }
  }
  
  return result;
}

// Alternative: Simple recursive implementation
function flattenRecursive(arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('Input must be an array');
  }
  
  return arr.reduce((acc, item) => {
    return acc.concat(Array.isArray(item) ? flattenRecursive(item) : item);
  }, []);
}

// Export both implementations
module.exports = { flatten, flattenRecursive };

// Manual test runner (no dependencies)
function runTests() {
  const tests = [
    {
      input: [1, [2, [3, [4]]]],
      expected: [1, 2, 3, 4],
      description: 'Deep nesting'
    },
    {
      input: [[1, 2], [3, 4]],
      expected: [1, 2, 3, 4],
      description: 'Multiple arrays'
    },
    {
      input: [],
      expected: [],
      description: 'Empty array'
    },
    {
      input: [1, 2, 3],
      expected: [1, 2, 3],
      description: 'Already flat'
    },
    {
      input: [[[[1]]]],
      expected: [1],
      description: 'Extreme nesting'
    },
    {
      input: [1, [2, "three", [4, {five: 5}]]],
      expected: [1, 2, "three", 4, {five: 5}],
      description: 'Mixed types'
    },
    {
      input: [[], [1], [], [2, []], 3],
      expected: [1, 2, 3],
      description: 'Empty arrays mixed'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('Running Array Flattener Tests...\n');
  
  tests.forEach((test, index) => {
    const result = flatten(test.input);
    const success = JSON.stringify(result) === JSON.stringify(test.expected);
    
    if (success) {
      passed++;
      console.log(`✅ Test ${index + 1}: ${test.description}`);
    } else {
      failed++;
      console.log(`❌ Test ${index + 1}: ${test.description}`);
      console.log(`   Input:    ${JSON.stringify(test.input)}`);
      console.log(`   Expected: ${JSON.stringify(test.expected)}`);
      console.log(`   Got:      ${JSON.stringify(result)}`);
    }
  });
  
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}`);
  
  return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}
