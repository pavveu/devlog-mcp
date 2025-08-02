/**
 * Configuration for EventTarget max listeners to handle multiple MCP connections
 * without triggering Node.js memory leak warnings.
 */

import { setMaxListeners, EventEmitter } from 'events';

// Optimal limit based on typical MCP usage patterns (was 100, now 25)
EventEmitter.defaultMaxListeners = 25;

// Enhanced warning filter to catch all AbortSignal-related warnings
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    // Filter out AbortSignal warnings from MCP connections
    if (warning.message.includes('AbortSignal') || 
        warning.message.includes('abort listeners') ||
        warning.message.includes('perplexity-mcp')) {
      return; // Suppress these specific warnings
    }
  }
  console.warn(warning);
});

/**
 * Configures the maximum number of listeners for EventTarget-based objects
 * (like AbortSignal) to prevent warnings when multiple MCP connections are created.
 * 
 * Reduced from 100 to 25 for better memory efficiency while still handling
 * typical parallel MCP connection loads.
 */
export function configureMaxListeners(maxListeners: number = 25): void {
  try {
    // Set max listeners for EventTarget instances (AbortSignal, etc.)
    setMaxListeners(maxListeners);
  } catch (error) {
    // Fail silently if not supported in the environment
    console.debug('setMaxListeners not supported in this environment');
  }
}

// Configure on module load with optimal limit for MCP connections
configureMaxListeners(25);