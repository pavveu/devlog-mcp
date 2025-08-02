#!/bin/bash

# Set the devlog path
export DEVLOG_PATH="/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai/devlog"
export MCP_PORT=3100

# Build first
echo "Building MCP DevLog server..."
npm run build

echo ""
echo "🚀 Starting DevLog MCP HTTP Server..."
echo "📁 DevLog Path: $DEVLOG_PATH"
echo "🌐 Server Port: $MCP_PORT"
echo ""
echo "📄 Open http://localhost:$MCP_PORT in your browser for server info"
echo "🧪 Open file://$PWD/src/test-client.html to test the server"
echo ""

# Run the HTTP server
node dist/esm/devlog-http-server.js