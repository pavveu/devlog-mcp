# Max Listeners Stress Test for MCP DevLog Server

This test verifies that the MaxListenersExceededWarning fix is working correctly by making 20+ parallel calls to the MCP DevLog server.

## Background

Node.js EventEmitter has a default limit of 10 listeners per event to prevent memory leaks. When this limit is exceeded, Node.js shows a warning:

```
(node:12345) MaxListenersExceededWarning: Possible EventTarget memory leak detected. 
11 abort listeners added to [AbortSignal]. Use events.setMaxListeners() to increase limit
```

## The Test

The stress test (`src/test-max-listeners.ts`) makes 25 parallel tool calls:
- 5 `test_connection` calls
- 8 `search_devlogs` calls with different queries
- 7 `list_recent_devlogs` calls with different day ranges  
- 5 `search_devlogs` calls with tag filters

## Running the Test

### Option 1: Full Test (Starts Server Automatically)
```bash
./run-max-listeners-test.sh
```

This script:
1. Starts the devlog server
2. Runs the stress test
3. Stops the server
4. Reports results

### Option 2: Client Test Only (Server Must Be Running)
```bash
# In terminal 1: Start the server
tsx src/devlog-http-server.ts

# In terminal 2: Run the test
./test-max-listeners-only.sh
```

## Expected Results

### ✅ Success (Fix Working)
```
🚀 Starting Max Listeners Stress Test (20+ parallel calls)...
⚠️  Watch for any MaxListenersExceededWarning messages...

📊 Starting 25 parallel tool calls...
✓ [1/25] Completed: test-0
✓ [2/25] Completed: test-1
...
✓ [25/25] Completed: tag-search-4

📈 Results Summary:
   - Total calls: 25
   - Successful: 25
   - Failed: 0

✅ Stress test completed in 523ms
🎉 If no MaxListenersExceededWarning appeared above, the fix is working!
```

### ❌ Failure (Fix Not Working)
```
(node:12345) MaxListenersExceededWarning: Possible EventTarget memory leak detected. 
11 abort listeners added to [AbortSignal]. Use events.setMaxListeners() to increase limit
```

## How the Fix Works

The fix typically involves one of these approaches:

1. **Increase the max listeners limit**:
   ```typescript
   eventEmitter.setMaxListeners(0); // 0 = unlimited
   ```

2. **Reuse listeners/signals**:
   ```typescript
   // Instead of creating new AbortSignals for each request
   const sharedSignal = new AbortController().signal;
   ```

3. **Clean up listeners properly**:
   ```typescript
   signal.removeEventListener('abort', handler);
   ```

## Debugging

If the warning still appears:

1. Check which file/line triggers it
2. Look for event listener registrations without cleanup
3. Check if AbortSignals are being created in loops
4. Verify listener cleanup in error cases

## Manual Test

You can also manually trigger parallel calls using curl:

```bash
# Run 20 parallel curl requests
for i in {1..20}; do
  curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_connection","arguments":{}},"id":'$i'}' &
done
wait
```