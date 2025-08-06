import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { ToolDefinition } from './registry.js';
import { getCurrentWorkspace, generateAgentId, parseAgentFromContent } from '../utils/workspace.js';
import { CallToolResult } from '../types.js';
import { DEVLOG_PATH } from '../types/devlog.js';
import { acquireLock, releaseLock, checkLock, formatLockInfo } from '../utils/lock-manager.js';
import { 
  createInitialMetadata, 
  updateMetadata, 
  extractMetadata,
  generateSessionSummary,
  formatDuration,
  calculateDuration
} from '../utils/session-metadata.js';
import { enableToolTracking, disableToolTracking, flushToolTracking } from '../utils/tool-tracker.js';
import { startHeartbeat, stopHeartbeat } from '../utils/heartbeat-manager.js';

export const workspaceTools: ToolDefinition[] = [
  {
    name: 'devlog_workspace_claim',
    title: 'Claim Workspace',
    description: 'Claim workspace with multi-agent lock and tracking',
    inputSchema: {
      task: z.string().describe('Current task or focus area'),
      force: z.boolean().optional().default(false).describe('Force claim even if locked'),
      tags: z.record(z.any()).optional().describe('Tags for this session'),
    },
    handler: async ({ task, force = false, tags }): Promise<CallToolResult> => {
      const workspace = await getCurrentWorkspace();
      const agentId = await generateAgentId();
      const sessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-')}-${agentId}`;
      
      // Try to acquire lock
      const lockResult = await acquireLock(agentId, sessionId, force);
      if (!lockResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ ${lockResult.error}`,
            },
          ],
        };
      }
      
      // Create initial metadata
      const metadata = createInitialMetadata(agentId, sessionId);
      if (lockResult.lock) {
        metadata.session.lock_acquired = lockResult.lock.acquired_at;
        metadata.session.lock_expires = lockResult.lock.expires_at;
      }
      
      // Build workspace content
      const now = new Date().toISOString();
      let content = '---\n';
      content += `agent_id: "${agentId}"\n`;
      content += `session_id: "${sessionId}"\n`;
      content += `session_start: "${now}"\n`;
      content += `last_active: "${now}"\n`;
      content += `task: "${task}"\n`;
      
      if (tags) {
        content += 'tags:\n';
        Object.entries(tags).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            content += `  ${key}:\n`;
            value.forEach(v => content += `    - ${v}\n`);
          } else {
            content += `  ${key}: ${value}\n`;
          }
        });
      }
      
      content += '---\n\n';
      content += `# Current Workspace\n\n`;
      content += `## 🎯 Active Task\n${task}\n\n`;
      content += `## 📊 Session Info\n`;
      content += `- Agent: ${agentId}\n`;
      content += `- Session: ${sessionId}\n`;
      content += `- Started: ${now}\n`;
      content += `- Lock expires: ${new Date(metadata.session.lock_expires || now).toLocaleString()}\n\n`;
      content += `## 🚧 Progress\n\n`;
      content += `- [ ] Task started\n`;
      
      try {
        await fs.writeFile(workspace.path, content);
        
        // Add metadata to file
        await updateMetadata(workspace.path, metadata);
        
        // Enable tool tracking and heartbeat
        await enableToolTracking();
        await startHeartbeat(agentId);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Workspace claimed successfully\n\n` +
                    `Agent ID: ${agentId}\n` +
                    `Session: ${sessionId}\n` +
                    `Task: ${task}\n` +
                    `Lock expires: in 30 minutes\n\n` +
                    `💓 Tracking and heartbeat enabled.`,
            },
          ],
        };
      } catch (error) {
        // Release lock on failure
        await releaseLock(agentId);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to claim workspace: ${error}`,
            },
          ],
        };
      }
    }
  },
  
  {
    name: 'devlog_workspace_status',
    title: 'Workspace Status',
    description: 'Get current workspace status, lock info, and tracking data',
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      const workspace = await getCurrentWorkspace();
      
      if (!workspace.exists || !workspace.content) {
        // Check if there's a stale lock
        const lock = await checkLock();
        if (lock) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No active workspace, but found existing lock:\n\n${formatLockInfo(lock)}\n\nUse devlog_workspace_claim to start a new session.`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: '❌ No active workspace found. Use devlog_workspace_claim to create one.',
            },
          ],
        };
      }
      
      const { agentId, lastActive } = parseAgentFromContent(workspace.content);
      
      // Extract task from content
      const taskMatch = workspace.content.match(/task:\s*"([^"]+)"/);
      const task = taskMatch ? taskMatch[1] : 'Unknown';
      
      // Get lock info
      const lock = await checkLock();
      const lockInfo = lock ? `\n\n🔒 Lock Status:\n${formatLockInfo(lock)}` : '';
      
      // Get tracking metadata
      const metadata = await extractMetadata(workspace.path);
      let trackingInfo = '';
      
      if (metadata) {
        const activeTasks = metadata.tasks.filter(t => t.status === 'active').length;
        const completedTasks = metadata.tasks.filter(t => t.status === 'completed').length;
        const totalDuration = formatDuration(metadata.timing.total_minutes + metadata.timing.active_minutes);
        
        trackingInfo = `\n\n📊 Session Tracking:\n` +
          `Duration: ${totalDuration} (Active: ${formatDuration(metadata.timing.active_minutes)})\n` +
          `Tasks: ${activeTasks} active, ${completedTasks} completed\n` +
          `Tool calls: ${Object.values(metadata.tool_usage).reduce((a, b) => a + b, 0)} total\n` +
          `Pauses: ${metadata.timing.pauses.length}`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Workspace Status:\n\n` +
              `Agent ID: ${agentId || 'Not set'}\n` +
              `Task: ${task}\n` +
              `Last Active: ${lastActive || 'Unknown'}` +
              lockInfo +
              trackingInfo,
          },
        ],
      };
    }
  },
  
  {
    name: 'devlog_session_log',
    title: 'Session Log',
    description: 'Log progress or notes to current session',
    inputSchema: {
      entry: z.string().describe('Log entry or progress update'),
      type: z.enum(['progress', 'note', 'issue', 'decision']).optional().default('progress'),
    },
    handler: async ({ entry, type }): Promise<CallToolResult> => {
      const workspace = await getCurrentWorkspace();
      
      if (!workspace.exists || !workspace.content) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No active workspace. Use devlog_workspace_init first.',
            },
          ],
        };
      }
      
      const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
      const iconMap: Record<string, string> = {
        progress: '✅',
        note: '📝',
        issue: '⚠️',
        decision: '🎯'
      };
      const icon = iconMap[type];
      
      // Append to workspace
      const logEntry = `\n${icon} [${timestamp}] ${entry}\n`;
      const updatedContent = workspace.content + logEntry;
      
      try {
        await fs.writeFile(workspace.path, updatedContent);
        
        return {
          content: [
            {
              type: 'text',
              text: `${icon} Logged: ${entry}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to log entry: ${error}`,
            },
          ],
        };
      }
    }
  },
  
  {
    name: 'devlog_workspace_dump',
    title: 'Dump Workspace',
    description: 'Save current workspace to daily log with tracking analytics',
    inputSchema: {
      reason: z.string().describe('Reason for dumping workspace'),
      keepActive: z.boolean().optional().default(true).describe('Keep workspace active after dump'),
    },
    handler: async ({ reason, keepActive = true }): Promise<CallToolResult> => {
      const workspace = await getCurrentWorkspace();
      
      if (!workspace.exists || !workspace.content) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No active workspace to dump.',
            },
          ],
        };
      }
      
      const { agentId } = parseAgentFromContent(workspace.content);
      // const sessionIdMatch = workspace.content.match(/session_id:\s*"([^"]+)"/);
      // const _sessionId = sessionIdMatch ? sessionIdMatch[1] : 'unknown';
      
      // Flush any pending tool tracking
      await flushToolTracking();
      
      // Get metadata and finalize
      const metadata = await extractMetadata(workspace.path);
      if (metadata) {
        metadata.session.end = new Date().toISOString();
        metadata.timing.total_minutes = calculateDuration(
          metadata.session.start,
          metadata.session.end
        );
        
        // Update workspace with final metadata
        await updateMetadata(workspace.path, metadata);
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toISOString().slice(11, 16).replace(':', 'h');
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Extract focus from task
      const taskMatch = workspace.content.match(/task:\s*"([^"]+)"/);
      const task = taskMatch ? taskMatch[1] : 'session';
      const safeTopic = task.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30);
      
      // Create filename
      const filename = `${dateStr}-${timeStr}-${dayName}-session-${safeTopic}.md`;
      const dailyDir = path.join(DEVLOG_PATH, 'daily');
      const sessionFile = path.join(dailyDir, filename);
      
      // Prepare session content
      let sessionContent = '---\n';
      sessionContent += `title: "Session: ${task}"\n`;
      sessionContent += `date: "${now.toISOString()}"\n`;
      sessionContent += `agent_id: "${agentId || 'unknown'}"\n`;
      sessionContent += `dump_reason: "${reason}"\n`;
      
      // Add timing from metadata
      if (metadata) {
        sessionContent += `session_start: "${metadata.session.start}"\n`;
        sessionContent += `session_end: "${metadata.session.end}"\n`;
        sessionContent += `duration_minutes: ${metadata.timing.total_minutes}\n`;
        sessionContent += `duration_hours: ${(metadata.timing.total_minutes / 60).toFixed(1)}\n`;
      }
      
      sessionContent += 'tags:\n';
      sessionContent += '  type: session\n';
      sessionContent += '  scope: [' + (metadata ? Object.keys(metadata.activity_breakdown)
        .filter(k => metadata.activity_breakdown[k as keyof typeof metadata.activity_breakdown] > 0)
        .join(', ') : 'general') + ']\n';
      sessionContent += '  status: ' + (keepActive ? 'paused' : 'completed') + '\n';
      sessionContent += `  focus: "${task}"\n`;
      
      if (metadata && metadata.timing.total_minutes > 0) {
        sessionContent += `  duration: "${formatDuration(metadata.timing.total_minutes)}"\n`;
      }
      
      sessionContent += '---\n\n';
      sessionContent += `# Session: ${task}\n\n`;
      sessionContent += `**Date**: ${dateStr} (${dayName.charAt(0).toUpperCase() + dayName.slice(1)})\n`;
      sessionContent += `**Time**: ${timeStr.replace('h', ':')}\n`;
      sessionContent += `**Agent**: ${agentId}\n`;
      sessionContent += `**Reason**: ${reason}\n\n`;
      
      // Add summary section
      if (metadata && metadata.tasks.length > 0) {
        const completedTasks = metadata.tasks.filter(t => t.status === 'completed');
        const activeTasks = metadata.tasks.filter(t => t.status === 'active');
        
        sessionContent += `## Summary\n`;
        if (completedTasks.length > 0) {
          sessionContent += `### Completed\n`;
          completedTasks.forEach(t => {
            sessionContent += `- ✅ ${t.title} (${formatDuration(t.duration_minutes || 0)})\n`;
          });
        }
        if (activeTasks.length > 0) {
          sessionContent += `### In Progress\n`;
          activeTasks.forEach(t => {
            sessionContent += `- 🚧 ${t.title}\n`;
          });
        }
        sessionContent += '\n';
      }
      
      sessionContent += `## Workspace Content at Time of Dump\n\n`;
      sessionContent += workspace.content;
      
      // Add analytics summary if available
      if (metadata) {
        sessionContent += '\n\n' + generateSessionSummary(metadata);
      }
      
      try {
        // Create daily directory if needed
        await fs.mkdir(dailyDir, { recursive: true });
        
        // Save session log
        await fs.writeFile(sessionFile, sessionContent);
        
        // Handle workspace based on keepActive
        if (!keepActive) {
          // Release lock and clear workspace
          await releaseLock(agentId || '');
          await disableToolTracking();
          stopHeartbeat();
          await fs.unlink(workspace.path);
        } else {
          // Just update the workspace to show it was dumped
          const updatedContent = workspace.content.replace(
            /## 🚧 Progress/,
            `## 🚧 Progress\n\n📌 Session dumped to: [${filename}](daily/${filename})\n`
          );
          await fs.writeFile(workspace.path, updatedContent);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ **WORKSPACE DUMPED**\n\n` +
              `Session saved to: ${path.relative(DEVLOG_PATH, sessionFile)}\n` +
              `Reason: ${reason}\n` +
              (metadata ? `Duration: ${formatDuration(metadata.timing.total_minutes)} (Active: ${formatDuration(metadata.timing.active_minutes)})\n` : '') +
              (keepActive ? '\nWorkspace kept active for continuation.' : 'New clean workspace created.'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to dump workspace: ${error}`,
            },
          ],
        };
      }
    }
  }
];