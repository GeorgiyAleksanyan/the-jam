/**
 * Test suite for MCP Echo Server
 */

import { processEcho, ECHO_TOOL } from './index.js';

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('Running MCP Echo Server Tests...\n');

let passed = 0;
let failed = 0;

// Test 1: processEcho basic functionality
try {
  const result = processEcho("Hello World");
  
  assertEqual(result.original, "Hello World", "Original message mismatch");
  assertEqual(result.reversed, "dlroW olleH", "Reversed message mismatch");
  assertEqual(result.word_count, 2, "Word count mismatch");
  assertEqual(result.char_count, 11, "Char count mismatch");
  assert(typeof result.timestamp === 'string', "Timestamp should be string");
  assert(new Date(result.timestamp).toISOString() === result.timestamp, "Timestamp should be valid ISO");
  
  console.log('✅ Test 1: Basic echo processing');
  passed++;
} catch (err) {
  console.log(`❌ Test 1: ${err.message}`);
  failed++;
}

// Test 2: Single word
try {
  const result = processEcho("Hello");
  
  assertEqual(result.original, "Hello", "Original mismatch");
  assertEqual(result.reversed, "olleH", "Reversed mismatch");
  assertEqual(result.word_count, 1, "Word count should be 1");
  assertEqual(result.char_count, 5, "Char count should be 5");
  
  console.log('✅ Test 2: Single word');
  passed++;
} catch (err) {
  console.log(`❌ Test 2: ${err.message}`);
  failed++;
}

// Test 3: Empty string
try {
  const result = processEcho("");
  
  assertEqual(result.original, "", "Original should be empty");
  assertEqual(result.reversed, "", "Reversed should be empty");
  assertEqual(result.word_count, 0, "Word count should be 0");
  assertEqual(result.char_count, 0, "Char count should be 0");
  
  console.log('✅ Test 3: Empty string');
  passed++;
} catch (err) {
  console.log(`❌ Test 3: ${err.message}`);
  failed++;
}

// Test 4: Multiple words with extra spaces
try {
  const result = processEcho("  Hello   World  ");
  
  assertEqual(result.word_count, 2, "Should count 2 words ignoring extra spaces");
  assertEqual(result.char_count, 17, "Should count all chars including spaces");
  
  console.log('✅ Test 4: Extra whitespace handling');
  passed++;
} catch (err) {
  console.log(`❌ Test 4: ${err.message}`);
  failed++;
}

// Test 5: Special characters and numbers
try {
  const result = processEcho("Hello123! @#$");
  
  assertEqual(result.original, "Hello123! @#$", "Original with special chars");
  assertEqual(result.reversed, "$#@ !321olleH", "Reversed with special chars");
  assertEqual(result.word_count, 2, "Word count with special chars");
  
  console.log('✅ Test 5: Special characters and numbers');
  passed++;
} catch (err) {
  console.log(`❌ Test 5: ${err.message}`);
  failed++;
}

// Test 6: ECHO_TOOL schema validation
try {
  assertEqual(ECHO_TOOL.name, "echo", "Tool name should be 'echo'");
  assert(typeof ECHO_TOOL.description === 'string', "Tool should have description");
  assertEqual(ECHO_TOOL.inputSchema.type, "object", "Schema type should be object");
  assert(ECHO_TOOL.inputSchema.properties.message, "Schema should have message property");
  assertEqual(ECHO_TOOL.inputSchema.properties.message.type, "string", "Message should be string type");
  assert(ECHO_TOOL.inputSchema.required.includes("message"), "Message should be required");
  
  console.log('✅ Test 6: Tool schema validation');
  passed++;
} catch (err) {
  console.log(`❌ Test 6: ${err.message}`);
  failed++;
}

// Test 7: Unicode characters
try {
  const result = processEcho("Hello 🌍 World");
  
  assertEqual(result.original, "Hello 🌍 World", "Unicode original");
  assertEqual(result.word_count, 3, "Unicode word count");
  assert(result.char_count > 0, "Unicode char count");
  
  console.log('✅ Test 7: Unicode characters');
  passed++;
} catch (err) {
  console.log(`❌ Test 7: ${err.message}`);
  failed++;
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}`);

process.exit(failed === 0 ? 0 : 1);
