import vm from 'node:vm'

export async function runAgent(code: string, input: any = {}) {
  const logs: string[] = []
  
  const sandbox = {
    console: {
      log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
      error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => String(a)).join(' '))
    },
    input
  }

  // Create a context
  const context = vm.createContext(sandbox)

  try {
    const scriptCode = `
      ${code}
      
      // If 'agent' function is defined, call it.
      if (typeof agent === 'function') {
        agent(input);
      } else {
        // Otherwise just return the last expression
        "No 'agent' function found. Please define function agent(input) { ... }";
      }
    `
    
    // Run script in the context
    // We set a timeout to prevent infinite loops
    const result = vm.runInContext(scriptCode, context, { timeout: 1000 })

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
