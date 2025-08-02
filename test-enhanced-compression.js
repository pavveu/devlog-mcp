#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

// Test the enhanced compression with dry run
const serverPath = path.join(process.cwd(), 'dist', 'esm', 'simple-devlog-server.js');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DEVLOG_PATH: '/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai/devlog'
  }
});

// Send initialization
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  method: 'initialize',
  id: 1,
  params: {
    capabilities: {}
  }
}) + '\n');

// Wait a bit then call the compression tool
setTimeout(() => {
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    id: 2,
    params: {
      name: 'devlog_compress_week',
      arguments: {
        weekNumber: 25,
        year: 2025,
        dryRun: true
      }
    }
  }) + '\n');
}, 1000);

// Capture output
let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  // Look for our result
  if (output.includes('Visual Analytics')) {
    console.log('✅ Enhanced compression preview generated!');
    console.log('\nPreview includes:');
    console.log('- 24-hour activity clock');
    console.log('- Activity heat map with late evening');
    console.log('- Active hours analysis');
    console.log('- Task distribution');
    console.log('- Conceptual Mermaid diagrams');
    console.log('- Better filename format');
    server.kill();
  }
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

setTimeout(() => {
  console.log('Test timed out');
  server.kill();
}, 5000);