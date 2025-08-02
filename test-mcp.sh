#!/bin/bash

echo "Testing MCP DevLog Server..."
echo ""

# Test 1: Initialize
echo "1. Testing Initialize:"
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' | npx tsx src/simple-devlog-server.ts

echo ""
echo "2. Testing List Tools:"
echo '{"jsonrpc":"2.0","method":"tools/list","id":2}' | npx tsx src/simple-devlog-server.ts

echo ""
echo "3. Testing Connection:"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_connection","arguments":{}},"id":3}' | npx tsx src/simple-devlog-server.ts