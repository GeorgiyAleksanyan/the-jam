import { VM } from 'vm2'

export async function runAgent(code: string, input: any = {}) {
  const vm = new VM({
    timeout: 1000, // 1 second timeout
    sandbox: {
      console: {
        log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
        error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => String(a)).join(' '))
      },
      input
    }
  })

  const logs: string[] = []

  try {
    // Wrap code in a function if it isn't one, or just eval it
    // We expect the user to write `function agent(input) { ... }` or just code.
    // Let's force a structure: We expect a function named 'agent' or we wrap it.
    
    // Simple approach: standard eval, looking for a return value.
    const script = `
      ${code}
      
      // If 'agent' function is defined, call it.
      if (typeof agent === 'function') {
        agent(input);
      } else {
        // Otherwise just return the last expression
        "No 'agent' function found. Please define function agent(input) { ... }";
      }
    `
    
    const result = vm.run(script)
    return { 
      success: true, 
      output: result, 
      logs 
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message, 
      logs 
    }
  }
}
