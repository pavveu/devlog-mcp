#!/bin/bash

echo "🧪 MCP DevLog Max Listeners Test"
echo "================================"
echo ""

# Check if server is running
echo "⚡ Starting devlog server..."
echo "   Running on http://localhost:3000/mcp"
echo ""

# Start the server in background
tsx src/devlog-http-server.ts &
SERVER_PID=$!

# Give server time to start
echo "⏳ Waiting for server to start..."
sleep 2

# Run the test
echo ""
echo "🚀 Running max listeners stress test..."
echo ""
tsx src/test-max-listeners.ts

# Kill the server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Test complete!"
echo ""
echo "📝 IMPORTANT: Check the output above for any MaxListenersExceededWarning messages."
echo "   If you see no warnings, the fix is working correctly!"