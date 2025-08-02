/**
 * Task tracking tools for granular time tracking
 * Tracks individual tasks, iterations, and tool usage
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import { ToolDefinition } from './registry.js';
import { CallToolResult } from '../types.js';
import { getCurrentWorkspace } from '../utils/workspace.js';
import { extractMetadata, updateMetadata, formatDuration, calculateDuration } from '../utils/session-metadata.js';

export const taskTrackingTools: ToolDefinition[] = [
  {
    name: 'devlog_task_track',
    title: 'Track Task',
    description: 'Start, pause, resume, iterate, or complete a task',
    inputSchema: {
      action: z.enum(['start', 'pause', 'resume', 'iterate', 'complete', 'abandon']).describe('Task action'),
      title: z.string().optional().describe('Task title (required for start)'),
      reason: z.string().optional().describe('Reason for pause/abandon'),
    },
    handler: async ({ action, title, reason }): Promise<CallToolResult> => {
      const workspace = await getCurrentWorkspace();
      
      if (!workspace.exists) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No active workspace. Use devlog_workspace_claim first.',
            },
          ],
        };
      }
      
      const metadata = await extractMetadata(workspace.path);
      if (!metadata) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No tracking metadata found. Workspace may be corrupted.',
            },
          ],
        };
      }
      
      const now = new Date().toISOString();
      const timeStr = now.slice(11, 19); // HH:MM:SS
      
      switch (action) {
        case 'start': {
          if (!title) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ Task title is required when starting a new task.',
                },
              ],
            };
          }
          
          // Pause any active task
          const activeTask = metadata.tasks.find(t => t.status === 'active');
          if (activeTask) {
            activeTask.status = 'paused';
          }
          
          // Create new task
          const taskId = `task-${Date.now()}`;
          metadata.tasks.push({
            id: taskId,
            title,
            start: now,
            iterations: 1,
            status: 'active',
            tool_usage: {}
          });
          metadata.active_task = taskId;
          
          // Update workspace content
          const updatedContent = workspace.content + 
            `\n🎯 [${timeStr}] Started task: ${title}\n`;
          await fs.writeFile(workspace.path, updatedContent);
          await updateMetadata(workspace.path, metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `🎯 Task started: ${title}\nID: ${taskId}`,
              },
            ],
          };
        }
        
        case 'pause': {
          const activeTask = metadata.tasks.find(t => t.status === 'active');
          if (!activeTask) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ No active task to pause.',
                },
              ],
            };
          }
          
          activeTask.status = 'paused';
          metadata.active_task = undefined;
          
          // Add pause to timing
          metadata.timing.pauses.push({
            start: now,
            end: now, // Will be updated on resume
            reason: reason || 'manual_pause'
          });
          
          const updatedContent = workspace.content + 
            `\n⏸️ [${timeStr}] Paused: ${activeTask.title}${reason ? ` (${reason})` : ''}\n`;
          await fs.writeFile(workspace.path, updatedContent);
          await updateMetadata(workspace.path, metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `⏸️ Task paused: ${activeTask.title}`,
              },
            ],
          };
        }
        
        case 'resume': {
          const pausedTask = metadata.tasks.find(t => t.status === 'paused');
          if (!pausedTask) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ No paused task to resume.',
                },
              ],
            };
          }
          
          pausedTask.status = 'active';
          metadata.active_task = pausedTask.id;
          
          // Update last pause end time
          const lastPause = metadata.timing.pauses[metadata.timing.pauses.length - 1];
          if (lastPause && !lastPause.end) {
            lastPause.end = now;
            const pauseDuration = calculateDuration(lastPause.start, lastPause.end);
            metadata.timing.pause_minutes += pauseDuration;
          }
          
          const updatedContent = workspace.content + 
            `\n▶️ [${timeStr}] Resumed: ${pausedTask.title}\n`;
          await fs.writeFile(workspace.path, updatedContent);
          await updateMetadata(workspace.path, metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `▶️ Task resumed: ${pausedTask.title}`,
              },
            ],
          };
        }
        
        case 'iterate': {
          const activeTask = metadata.tasks.find(t => t.status === 'active');
          if (!activeTask) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ No active task to iterate.',
                },
              ],
            };
          }
          
          activeTask.iterations++;
          
          const updatedContent = workspace.content + 
            `\n🔄 [${timeStr}] Iteration ${activeTask.iterations} on: ${activeTask.title}\n`;
          await fs.writeFile(workspace.path, updatedContent);
          await updateMetadata(workspace.path, metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `🔄 Iteration ${activeTask.iterations} on: ${activeTask.title}`,
              },
            ],
          };
        }
        
        case 'complete': {
          const activeTask = metadata.tasks.find(t => t.status === 'active');
          if (!activeTask) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ No active task to complete.',
                },
              ],
            };
          }
          
          activeTask.status = 'completed';
          activeTask.end = now;
          activeTask.duration_minutes = calculateDuration(activeTask.start, activeTask.end);
          metadata.active_task = undefined;
          
          const updatedContent = workspace.content + 
            `\n✅ [${timeStr}] Completed: ${activeTask.title} (${formatDuration(activeTask.duration_minutes)}, ${activeTask.iterations} iterations)\n`;
          await fs.writeFile(workspace.path, updatedContent);
          await updateMetadata(workspace.path, metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `✅ Task completed: ${activeTask.title}\n` +
                      `Duration: ${formatDuration(activeTask.duration_minutes)}\n` +
                      `Iterations: ${activeTask.iterations}`,
              },
            ],
          };
        }
        
        case 'abandon': {
          const activeTask = metadata.tasks.find(t => t.status === 'active' || t.status === 'paused');
          if (!activeTask) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ No task to abandon.',
                },
              ],
            };
          }
          
          activeTask.status = 'abandoned';
          activeTask.end = now;
          activeTask.duration_minutes = calculateDuration(activeTask.start, activeTask.end);
          metadata.active_task = undefined;
          
          const updatedContent = workspace.content + 
            `\n❌ [${timeStr}] Abandoned: ${activeTask.title}${reason ? ` (${reason})` : ''}\n`;
          await fs.writeFile(workspace.path, updatedContent);
          await updateMetadata(workspace.path, metadata);
          
          return {
            content: [
              {
                type: 'text',
                text: `❌ Task abandoned: ${activeTask.title}`,
              },
            ],
          };
        }
        
        default:
          return {
            content: [
              {
                type: 'text',
                text: '❌ Invalid action',
              },
            ],
          };
      }
    }
  },
  
  {
    name: 'devlog_task_list',
    title: 'List Tasks',
    description: 'List all tasks in current session',
    inputSchema: {},
    handler: async (): Promise<CallToolResult> => {
      const workspace = await getCurrentWorkspace();
      
      if (!workspace.exists) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No active workspace.',
            },
          ],
        };
      }
      
      const metadata = await extractMetadata(workspace.path);
      if (!metadata || metadata.tasks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📋 No tasks tracked in this session yet.',
            },
          ],
        };
      }
      
      let output = '📋 **Session Tasks**\n\n';
      
      // Group by status
      const active = metadata.tasks.filter(t => t.status === 'active');
      const paused = metadata.tasks.filter(t => t.status === 'paused');
      const completed = metadata.tasks.filter(t => t.status === 'completed');
      const abandoned = metadata.tasks.filter(t => t.status === 'abandoned');
      
      if (active.length > 0) {
        output += '### 🟢 Active\n';
        active.forEach(t => {
          const duration = calculateDuration(t.start, new Date().toISOString());
          output += `- ${t.title} (${formatDuration(duration)}, iteration ${t.iterations})\n`;
        });
        output += '\n';
      }
      
      if (paused.length > 0) {
        output += '### 🟡 Paused\n';
        paused.forEach(t => {
          output += `- ${t.title} (iteration ${t.iterations})\n`;
        });
        output += '\n';
      }
      
      if (completed.length > 0) {
        output += '### ✅ Completed\n';
        completed.forEach(t => {
          output += `- ${t.title} (${formatDuration(t.duration_minutes || 0)}, ${t.iterations} iterations)\n`;
        });
        output += '\n';
      }
      
      if (abandoned.length > 0) {
        output += '### ❌ Abandoned\n';
        abandoned.forEach(t => {
          output += `- ${t.title}\n`;
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: output.trim(),
          },
        ],
      };
    }
  }
];

