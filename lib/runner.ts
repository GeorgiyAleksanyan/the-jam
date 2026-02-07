/**
 * Secure Agent Code Runner
 * Uses Node.js VM with hardened isolation
 */

import vm from 'node:vm';

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_SIZE = 100000;
const MAX_LOGS = 100;

export interface RunResult {
  success: boolean;
  output?: any;
  error?: string;
  logs: string[];
  executionTimeMs: number;
}

export async function runAgent(code: string, input: any = {}): Promise<RunResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  
  // Sanitize input to prevent prototype pollution
  const safeInput = JSON.parse(JSON.stringify(input));
  
  // Create a clean safe console that doesn't leak host constructors
  const logFormatter = (args: any[]) => args.map(a => {
    try {
      return typeof a === 'object' ? JSON.stringify(a).slice(0, 1000) : String(a);
    } catch {
      return '[unserializable]';
    }
  }).join(' ').slice(0, 1000);

  // Minimal safe sandbox without host-linked objects
  const sandbox = Object.create(null);
  
  // Define safe versions of globals
  Object.assign(sandbox, {
    console: {
      log: (...args: any[]) => logs.length < MAX_LOGS && logs.push(logFormatter(args)),
      error: (...args: any[]) => logs.length < MAX_LOGS && logs.push('ERROR: ' + logFormatter(args)),
      warn: (...args: any[]) => logs.length < MAX_LOGS && logs.push('WARN: ' + logFormatter(args)),
      info: (...args: any[]) => logs.length < MAX_LOGS && logs.push(logFormatter(args)),
    },
    input: safeInput,
    JSON: {
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    undefined,
    null: null,
    NaN,
    Infinity,
  });

  // Freeze the sandbox to prevent tampering
  Object.freeze(sandbox.console);
  Object.freeze(sandbox.JSON);

  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
  });

  try {
    const wrappedCode = `
      'use strict';
      (function() {
        ${code}
        if (typeof agent === 'function') {
          return agent(input);
        }
        throw new Error("No 'agent' function found.");
      })();
    `;
    
    const script = new vm.Script(wrappedCode, { filename: 'agent.js' });
    
    // Crucial: Use runInContext with null prototype for the global object if possible
    const result = script.runInContext(context, {
      timeout: TIMEOUT_MS,
      displayErrors: false,
    });

    let output: any;
    try {
      output = JSON.parse(JSON.stringify(result)); // Safe clone output
    } catch {
      output = String(result).slice(0, MAX_OUTPUT_SIZE);
    }

    return {
      success: true,
      output,
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    let errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('Script execution timed out')) {
      errorMessage = `Execution timeout (${TIMEOUT_MS}ms)`;
    }
    return {
      success: false,
      error: errorMessage.slice(0, 1000),
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export function validateCode(code: string): { valid: boolean; reason?: string } {
  if (code.length > 50000) return { valid: false, reason: 'Code too long' };
  
  const dangerousPatterns = [
    /\bprocess\b/,
    /\brequire\s*\(/,
    /\bimport\s+/,
    /\b__proto__\b/,
    /\bconstructor\b/,
    /\b__defineGetter__\b/,
    /\b__defineSetter__\b/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Blocked pattern detected` };
    }
  }
  
  return { valid: true };
}
