declare module '@modelcontextprotocol/sdk' {
  export class MCP {
    constructor(options: any);
    registerTool(tool: Tool): void;
  }

  export class Tool {
    constructor(mcp: MCP, options: any);
    run(input: any): Promise<any>;
  }

  export interface ToolInput {
    [key: string]: any;
  }
}
