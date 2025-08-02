/**
 * Tool usage tracking for all MCP operations
 * Automatically tracks which tools are used and how often
 */

import { getCurrentWorkspace } from './workspace.js';
import { extractMetadata, updateMetadata, classifyToolActivity } from './session-metadata.js';
import { updateLockHeartbeat } from './lock-manager.js';
import { notifyActivity } from './heartbeat-manager.js';

interface ToolContext {
  toolName: string;
  timestamp: string;
  taskId?: string;
}

// Global tracker instance
let isTracking = false;
let pendingUpdates: ToolContext[] = [];
let updateTimer: NodeJS.Timeout | null = null;

export async function enableToolTracking(): Promise<void> {
  isTracking = true;
}

export async function disableToolTracking(): Promise<void> {
  isTracking = false;
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
}

export async function trackToolUsage(toolName: string, context?: any): Promise<void> {
  if (!isTracking) return;
  
  // Notify heartbeat manager of activity
  notifyActivity();
  
  // Queue the update
  pendingUpdates.push({
    toolName,
    timestamp: new Date().toISOString(),
    taskId: context?.taskId
  });
  
  // Batch updates every 5 seconds to avoid too many file writes
  if (!updateTimer) {
    updateTimer = setTimeout(processPendingUpdates, 5000);
  }
}

async function processPendingUpdates(): Promise<void> {
  if (pendingUpdates.length === 0) return;
  
  try {
    const workspace = await getCurrentWorkspace();
    if (!workspace.exists) return;
    
    const metadata = await extractMetadata(workspace.path);
    if (!metadata) return;
    
    // Process all pending updates
    const updates = [...pendingUpdates];
    pendingUpdates = [];
    
    for (const update of updates) {
      // Update global tool usage
      metadata.tool_usage[update.toolName] = (metadata.tool_usage[update.toolName] || 0) + 1;
      
      // Update task-specific usage if in a task
      if (metadata.active_task) {
        const task = metadata.tasks.find(t => t.id === metadata.active_task);
        if (task) {
          task.tool_usage[update.toolName] = (task.tool_usage[update.toolName] || 0) + 1;
        }
      }
      
      // Update activity breakdown
      const activityType = classifyToolActivity(update.toolName);
      metadata.activity_breakdown[activityType]++;
    }
    
    // Update timing
    const now = new Date();
    const lastHeartbeat = new Date(metadata.session.last_heartbeat);
    const minutesSinceLastUpdate = (now.getTime() - lastHeartbeat.getTime()) / 60000;
    
    // If more than 5 minutes, add to pause time
    if (minutesSinceLastUpdate > 5) {
      metadata.timing.pauses.push({
        start: lastHeartbeat.toISOString(),
        end: now.toISOString(),
        reason: 'auto_inactive'
      });
      metadata.timing.pause_minutes += Math.round(minutesSinceLastUpdate);
    } else {
      // Otherwise add to active time
      metadata.timing.active_minutes += Math.round(minutesSinceLastUpdate);
    }
    
    // Update heartbeat
    metadata.session.last_heartbeat = now.toISOString();
    
    // Update lock heartbeat (multi-agent safety)
    await updateLockHeartbeat(metadata.session.agent_id);
    
    // Save metadata
    await updateMetadata(workspace.path, metadata);
    
  } catch (error) {
    console.error('Failed to update tool tracking:', error);
  } finally {
    updateTimer = null;
  }
}

// Wrapper for MCP tool handlers to add tracking
export function withToolTracking<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    // Track tool usage
    await trackToolUsage(toolName, args[0]);
    
    // Execute original handler
    return handler(...args);
  }) as T;
}

// Force flush any pending updates
export async function flushToolTracking(): Promise<void> {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  await processPendingUpdates();
}