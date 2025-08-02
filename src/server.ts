#!/usr/bin/env node
import { McpServer } from './server/mcp.js';
import { StdioServerTransport } from './server/stdio.js';
import { registerTools } from './tools/registry.js';

// Import all tool modules
import { basicTools } from './tools/basic-tools.js';
import { conflictTools } from './tools/conflict-tools.js';
import { analysisTools } from './tools/analysis-tools.js';
import { enhancedAnalysisTools } from './tools/analysis-enhanced-tools.js';
import { tagTools } from './tools/tag-tools.js';
import { planningTools } from './tools/planning-tools.js';
import { workspaceTools } from './tools/workspace-tools.js';
import { aiTaggingTools } from './tools/ai-tagging-tools.js';
import { similarityTools } from './tools/similarity-tools.js';
import { summarizationTools } from './tools/summarization-tools.js';
import { currentWorkspaceTools } from './tools/current-workspace-tools.js';
import { chromadbTools } from './tools/chromadb-tools.js';

// Initialize the MCP server
const server = new McpServer({
  name: 'mcp-devlog',
  vendor: 'turbowizard',
  version: '3.0.0',
  description: 'DevLog MCP server for development insights - Modular Edition'
}, {
  capabilities: {
    tools: {},
  },
});

// Register all tools
const allTools = [
  ...basicTools,
  ...conflictTools,
  ...analysisTools,
  ...enhancedAnalysisTools,
  ...tagTools,
  ...planningTools,
  ...workspaceTools,
  ...aiTaggingTools,
  ...similarityTools,
  ...summarizationTools,
  ...currentWorkspaceTools,
  ...chromadbTools
];

registerTools(server, allTools);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DevLog MCP Server v3.0 (Modular) running...');
  console.error(`Registered ${allTools.length} tools`);
  
  // Log tool categories for debugging
  const categories = {
    basic: basicTools.length,
    conflict: conflictTools.length,
    analysis: analysisTools.length,
    enhancedAnalysis: enhancedAnalysisTools.length,
    tag: tagTools.length,
    planning: planningTools.length,
    workspace: workspaceTools.length,
    aiTagging: aiTaggingTools.length,
    similarity: similarityTools.length,
    summarization: summarizationTools.length
  };
  
  console.error('Tool categories:', categories);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});