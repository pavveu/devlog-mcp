#!/bin/bash

echo "🧪 MCP DevLog Max Listeners Test (Client Only)"
echo "=============================================="
echo ""
echo "⚠️  Make sure the devlog server is already running!"
echo "   If not, run: tsx src/devlog-http-server.ts"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Run the test
echo "🚀 Running max listeners stress test..."
echo ""
tsx src/test-max-listeners.ts

echo ""
echo "✅ Test complete!"
echo ""
echo "📝 IMPORTANT: Check the output above for any MaxListenersExceededWarning messages."
echo "   If you see no warnings, the fix is working correctly!"