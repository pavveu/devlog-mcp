import { Client } from './client/index.js';
import { StreamableHTTPClientTransport } from './client/streamableHttp.js';
import {
  ListToolsRequest,
  ListToolsResultSchema,
  CallToolResultSchema,
  LoggingMessageNotificationSchema,
  CallToolResult,
} from './types.js';

/**
 * Max Listeners Stress Test for MCP DevLog Server
 * 
 * This test script makes 20+ parallel calls to various devlog tools
 * to verify that the MaxListenersExceededWarning has been fixed.
 */

// Type definitions for test results
type TestSuccess = {
  id: string;
  result: any;
  success: true;
};

type TestFailure = {
  id: string;
  error: any;
  success: false;
};

type TestResult = TestSuccess | TestFailure;

// Command line args processing
const args = process.argv.slice(2);
const serverUrl = args[0] || 'http://localhost:3000/mcp';

async function main(): Promise<void> {
  console.log('MCP DevLog Max Listeners Stress Test');
  console.log('=====================================');
  console.log(`Connecting to server at: ${serverUrl}`);
  console.log('This test will make 20+ parallel tool calls to stress test the system.\n');

  let client: Client;
  let transport: StreamableHTTPClientTransport;

  try {
    // Create client with streamable HTTP transport
    client = new Client({
      name: 'max-listeners-test-client',
      version: '1.0.0'
    });

    client.onerror = (error) => {
      console.error('Client error:', error);
    };

    // Connect to the server
    transport = new StreamableHTTPClientTransport(new URL(serverUrl));
    await client.connect(transport);
    console.log('✅ Successfully connected to MCP server\n');

    // Set up notification handler
    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      console.log(`📢 Notification: ${notification.params.data}`);
    });

    // List available tools
    console.log("🔧 Listing available tools...");
    await listTools(client);

    // Run the stress test with 20+ parallel calls
    console.log('\n🚀 Starting Max Listeners Stress Test (20+ parallel calls)...');
    console.log('⚠️  Watch for any MaxListenersExceededWarning messages...\n');
    
    const startTime = Date.now();
    await runStressTest(client);
    const endTime = Date.now();
    
    console.log(`\n✅ Stress test completed in ${endTime - startTime}ms`);
    console.log('🎉 If no MaxListenersExceededWarning appeared above, the fix is working!');

    // Disconnect
    console.log('\n🔌 Disconnecting...');
    await transport.close();
    console.log('✅ Disconnected from MCP server');

  } catch (error) {
    console.error('❌ Error running test:', error);
    process.exit(1);
  }
}

/**
 * List available tools on the server
 */
async function listTools(client: Client): Promise<void> {
  try {
    const toolsRequest: ListToolsRequest = {
      method: 'tools/list',
      params: {}
    };
    const toolsResult = await client.request(toolsRequest, ListToolsResultSchema);

    console.log('Available tools:');
    if (toolsResult.tools.length === 0) {
      console.log('  No tools available');
    } else {
      for (const tool of toolsResult.tools) {
        console.log(`  - ${tool.name}: ${tool.description}`);
      }
    }
  } catch (error) {
    console.log(`Tools not supported by this server: ${error}`);
  }
}

/**
 * Run stress test with multiple parallel devlog tool calls
 */
async function runStressTest(client: Client): Promise<void> {
  try {
    // Define 20+ tool calls to stress test the system
    const toolCalls = [
      // Test connection calls (5)
      ...Array(5).fill(null).map((_, i) => ({
        id: `test-${i}`,
        request: {
          method: 'tools/call',
          params: {
            name: 'test_connection',
            arguments: {}
          }
        }
      })),
      
      // Search devlogs with different queries (8)
      ...['refactoring', 'feature', 'bug', 'performance', 'security', 'test', 'documentation', 'architecture'].map((query, i) => ({
        id: `search-${query}`,
        request: {
          method: 'tools/call',
          params: {
            name: 'search_devlogs',
            arguments: {
              query,
              type: 'all',
              limit: 5
            }
          }
        }
      })),
      
      // List recent devlogs with different parameters (7)
      ...[1, 3, 5, 7, 14, 21, 30].map((days) => ({
        id: `recent-${days}days`,
        request: {
          method: 'tools/call',
          params: {
            name: 'list_recent_devlogs',
            arguments: {
              days,
              type: 'all'
            }
          }
        }
      })),
      
      // Additional search calls with tag filters (5)
      ...Array(5).fill(null).map((_, i) => ({
        id: `tag-search-${i}`,
        request: {
          method: 'tools/call',
          params: {
            name: 'search_devlogs',
            arguments: {
              query: '',
              type: ['insights', 'decisions', 'features', 'daily', 'all'][i],
              limit: 3,
              tags: { priority: 'high' }
            }
          }
        }
      }))
    ];

    console.log(`📊 Starting ${toolCalls.length} parallel tool calls...`);
    console.log('   - 5 test_connection calls');
    console.log('   - 8 search_devlogs calls with different queries');
    console.log('   - 7 list_recent_devlogs calls with different day ranges');
    console.log('   - 5 search_devlogs calls with tag filters\n');

    // Track progress
    let completed = 0;
    const total = toolCalls.length;

    // Start all tool calls in parallel
    const toolPromises = toolCalls.map(({ id, request }) => {
      return client.request(request, CallToolResultSchema)
        .then(result => {
          completed++;
          console.log(`✓ [${completed}/${total}] Completed: ${id}`);
          return { id, result, success: true } as TestSuccess;
        })
        .catch(error => {
          completed++;
          console.error(`✗ [${completed}/${total}] Failed: ${id} - ${error.message}`);
          return { id, error, success: false } as TestFailure;
        });
    });

    // Wait for all tool calls to complete
    const results: TestResult[] = await Promise.all(toolPromises);

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📈 Results Summary:`);
    console.log(`   - Total calls: ${total}`);
    console.log(`   - Successful: ${successful}`);
    console.log(`   - Failed: ${failed}`);

    // Check for any failures
    if (failed > 0) {
      console.log('\n❌ Failed calls:');
      results.filter((r): r is TestFailure => !r.success).forEach(r => {
        console.log(`   - ${r.id}: ${r.error?.message || 'Unknown error'}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error running stress test:`, error);
    throw error;
  }
}

// Start the test
main().catch((error: unknown) => {
  console.error('❌ Error running max listeners test:', error);
  process.exit(1);
});