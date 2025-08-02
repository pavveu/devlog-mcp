#!/bin/bash

echo "Updating Claude Code configuration for DevLog MCP..."

# Create updated config
cat > ~/Library/Application\ Support/Claude/claude_code_config.json << 'EOF'
{
  "mcpServers": {
    "nx-mcp": {
      "command": "npx",
      "args": [
        "@nx/nx-mcp",
        "/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai"
      ]
    },
    "devlog": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai/mcp-devlog/src/simple-devlog-server.ts"
      ],
      "env": {
        "DEVLOG_PATH": "/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai/devlog"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": [
        "-y",
        "server-perplexity-ask"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "your-perplexity-api-key-here"
      }
    }
  }
}
EOF

echo "✅ Configuration updated!"
echo ""
echo "📋 Next steps:"
echo "1. Quit Claude Code completely (Cmd+Q)"
echo "2. Restart Claude Code"
echo "3. Check the MCP panel - you should see 'devlog' listed"
echo ""
echo "🧪 To test if it's working, ask Claude:"
echo "   'Use the devlog MCP to test the connection'"
echo "   'Search devlogs for template'"
echo "   'List recent devlogs from the last 3 days'"