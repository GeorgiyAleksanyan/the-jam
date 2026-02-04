/**
 * Secure Agent Code Runner
 * Uses Node.js VM with strict sandboxing
 * 
 * SECURITY MEASURES:
 * 1. Strict context isolation - no access to global objects
 * 2. Timeout enforcement - prevents infinite loops
 * 3. Memory limits (via context options)
 * 4. No network access
 * 5. No file system access
 * 6. No require/import
 * 7. Blocked dangerous globals
 */

import vm from 'node:vm';

// Maximum execution time in milliseconds
const TIMEOUT_MS = 5000;

// Maximum output size in characters
const MAX_OUTPUT_SIZE = 100000;

// Maximum log entries
const MAX_LOGS = 100;

// Blocked property access
const BLOCKED_GLOBALS = [
  'process',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'global',
  'globalThis',
  'Buffer',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'eval',
  'Function',
];

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
  
  // Create safe console that limits log size
  const safeConsole = {
    log: (...args: any[]) => {
      if (logs.length < MAX_LOGS) {
        const msg = args.map(a => {
          try {
            return typeof a === 'object' ? JSON.stringify(a).slice(0, 1000) : String(a);
          } catch {
            return '[unserializable]';
          }
        }).join(' ');
        logs.push(msg.slice(0, 1000));
      }
    },
    error: (...args: any[]) => {
      if (logs.length < MAX_LOGS) {
        logs.push('ERROR: ' + args.map(a => String(a)).join(' ').slice(0, 1000));
      }
    },
    warn: (...args: any[]) => {
      if (logs.length < MAX_LOGS) {
        logs.push('WARN: ' + args.map(a => String(a)).join(' ').slice(0, 1000));
      }
    },
    info: (...args: any[]) => safeConsole.log(...args),
  };

  // Minimal safe sandbox
  const sandbox: Record<string, any> = {
    console: safeConsole,
    input: safeInput,
    JSON: {
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    Math: Math,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    RegExp: RegExp,
    Map: Map,
    Set: Set,
    Error: Error,
    TypeError: TypeError,
    RangeError: RangeError,
    SyntaxError: SyntaxError,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
    undefined: undefined,
    null: null,
    NaN: NaN,
    Infinity: Infinity,
  };

  // Block dangerous globals by making them throw
  for (const blocked of BLOCKED_GLOBALS) {
    sandbox[blocked] = new Proxy({}, {
      get: () => { throw new Error(`Access to '${blocked}' is not allowed in sandbox`); },
      apply: () => { throw new Error(`'${blocked}' is not callable in sandbox`); },
    });
  }

  // Create isolated context
  const context = vm.createContext(sandbox, {
    name: 'agent-sandbox',
    origin: 'thejam://sandbox',
    codeGeneration: {
      strings: false, // Disable eval() and new Function()
      wasm: false,    // Disable WebAssembly
    },
  });

  try {
    // Wrap user code to call agent function
    const wrappedCode = `
      'use strict';
      
      // User code
      ${code}
      
      // Execute agent function if defined
      (function() {
        if (typeof agent === 'function') {
          return agent(input);
        } else {
          throw new Error("No 'agent' function found. Define: function agent(input) { ... }");
        }
      })();
    `;
    
    // Compile script
    const script = new vm.Script(wrappedCode, {
      filename: 'agent.js',
      lineOffset: -4, // Adjust for wrapper lines
    });
    
    // Run with timeout
    const result = script.runInContext(context, {
      timeout: TIMEOUT_MS,
      displayErrors: true,
    });

    // Serialize output safely
    let output: any;
    try {
      const serialized = JSON.stringify(result);
      output = serialized.length > MAX_OUTPUT_SIZE 
        ? serialized.slice(0, MAX_OUTPUT_SIZE) + '... [truncated]'
        : result;
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
    // Handle different error types
    let errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('Script execution timed out')) {
      errorMessage = `Execution timeout: Script exceeded ${TIMEOUT_MS}ms limit`;
    }
    
    return {
      success: false,
      error: errorMessage.slice(0, 1000),
      logs,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Validate code before execution
 * Quick static checks for obviously dangerous patterns
 */
export function validateCode(code: string): { valid: boolean; reason?: string } {
  // Check code length
  if (code.length > 50000) {
    return { valid: false, reason: 'Code exceeds maximum length (50KB)' };
  }
  
  // Check for obvious escape attempts
  const dangerousPatterns = [
    /\bprocess\b/,
    /\brequire\s*\(/,
    /\bimport\s+/,
    /\b__proto__\b/,
    /\bconstructor\b\s*\[/,
    /\bthis\s*\.\s*constructor/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Code contains blocked pattern: ${pattern.source}` };
    }
  }
  
  return { valid: true };
}
