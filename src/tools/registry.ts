import { McpServer } from '../server/mcp.js';
import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: any;
  handler: (params: any) => Promise<any>;
}

/**
 * Register a tool with the MCP server
 */
export function registerTool(server: McpServer, tool: ToolDefinition) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    tool.handler
  );
}

/**
 * Register multiple tools at once
 */
export function registerTools(server: McpServer, tools: ToolDefinition[]) {
  tools.forEach(tool => registerTool(server, tool));
}