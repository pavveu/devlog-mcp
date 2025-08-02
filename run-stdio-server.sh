#!/bin/bash

# Build the project first
echo "Building MCP DevLog server..."
npm run build

# Run the stdio-based devlog server
echo "Starting DevLog MCP Server (stdio mode)..."
export DEVLOG_PATH="/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai/devlog"
node dist/esm/devlog-server.js