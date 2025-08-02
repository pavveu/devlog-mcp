#!/bin/bash

echo "Building modular MCP DevLog server..."

# Build the TypeScript files
echo "Compiling TypeScript..."
npx tsc -p tsconfig.json

# Make the output executable
echo "Making server executable..."
chmod +x dist/esm/server.js

echo "Build complete! You can now run the modular server with:"
echo "node dist/esm/server.js"
echo ""
echo "Or update your claude_desktop_config.json to use:"
echo '"command": "node",'
echo '"args": ["/absolute/path/to/mcp-devlog/dist/esm/server.js"]'