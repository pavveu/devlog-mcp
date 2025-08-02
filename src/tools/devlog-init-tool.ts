/**
 * Devlog initialization tool
 * Creates devlog structure in a project
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { ToolDefinition } from './registry.js';
import { CallToolResult } from '../types.js';

export const devlogInitTool: ToolDefinition = {
  name: 'devlog_init',
  title: 'Initialize DevLog',
  description: 'Initialize devlog structure in a project (creates directories and initial files)',
  inputSchema: {
    projectPath: z.string().optional().describe('Project path (defaults to current directory)'),
    skipIfExists: z.boolean().optional().default(true).describe('Skip initialization if devlog already exists'),
  },
  handler: async ({ projectPath = process.cwd(), skipIfExists = true }): Promise<CallToolResult> => {
    const devlogPath = path.join(projectPath, 'devlog');
    
    // Check if devlog already exists
    try {
      await fs.access(devlogPath);
      if (skipIfExists) {
        return {
          content: [
            {
              type: 'text',
              text: `ℹ️ DevLog already exists at: ${devlogPath}\nUse skipIfExists=false to reinitialize.`,
            },
          ],
        };
      }
    } catch {
      // Directory doesn't exist, good to proceed
    }
    
    try {
      // Create directory structure
      const directories = [
        'devlog',
        'devlog/daily',
        'devlog/features',
        'devlog/decisions',
        'devlog/insights',
        'devlog/research',
        'devlog/retrospective',
        'devlog/retrospective/weekly',
        'devlog/retrospective/monthly',
        'devlog/archive',
        'devlog/.mcp',
        'devlog/.config',
        'devlog/.tags',
      ];
      
      for (const dir of directories) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }
      
      // Create initial files
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Create README.md
      const readmeContent = `# DevLog

This is the development log for tracking project progress, decisions, and insights.

## Structure

- **daily/** - Daily work sessions and progress
- **features/** - Feature planning and implementation tracking
- **decisions/** - Architectural and design decisions
- **insights/** - Research findings and analysis
- **research/** - Deep dives and explorations
- **retrospective/** - Weekly/monthly reviews and learnings
- **archive/** - Old content for reference

## Getting Started

1. Use \`devlog_workspace_claim\` to start a new session
2. Track progress with \`devlog_session_log\`
3. End sessions with \`devlog_workspace_dump\`

## Conventions

### Filename Format
\`YYYY-MM-DD-HHhMM-dayname-type-topic.md\`

Examples:
- 2025-06-26-09h33-wednesday-session-state-management.md
- 2025-06-26-14h22-wednesday-feature-api-integration.md
- 2025-06-27-10h00-thursday-decision-architecture.md

### Tags
Use frontmatter tags for better organization:
\`\`\`yaml
tags:
  type: [session, feature, decision, research]
  scope: [api, ui, backend, infrastructure]
  status: [planned, in-progress, completed, blocked]
\`\`\`

---
*Initialized: ${dateStr}*
`;
      
      await fs.writeFile(path.join(devlogPath, 'README.md'), readmeContent);
      
      // Create current.md
      const currentContent = `---
title: "Current Workspace"
date: "${timestamp}"
agent_id: "agent-initial"
last_active: "${now.toISOString()}"
tags:
  type: session
  scope: [active-work]
  status: active
---

# Current Workspace

## 🎯 Today's Focus
- [ ] Set up development environment
- [ ] Review project requirements

## 🚧 In Progress
- [ ] DevLog initialization

## 💭 Quick Notes & Ideas
- DevLog initialized successfully

## ⏭️ Next Session
- [ ] Start feature planning

## 📥 Inbox (to process)
- Project setup tasks

---
*DevLog initialized: ${dateStr}*
`;
      
      await fs.writeFile(path.join(devlogPath, 'current.md'), currentContent);
      
      // Create .gitignore
      const gitignoreContent = `# MCP metadata
.mcp/
.config/

# Temporary files
*.tmp
*.swp
.DS_Store

# Personal notes (if any)
personal/
private/
`;
      
      await fs.writeFile(path.join(devlogPath, '.gitignore'), gitignoreContent);
      
      // Create search mode config
      await fs.writeFile(path.join(devlogPath, '.config', 'search-mode'), 'auto');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ **DevLog Initialized Successfully!**

Created at: ${devlogPath}

Structure:
${directories.map(d => `  📁 ${d.replace('devlog/', '')}/`).join('\n')}

Files created:
  📄 README.md - Documentation and conventions
  📄 current.md - Active workspace
  📄 .gitignore - Git ignore rules
  📄 .config/search-mode - Search preferences

Next steps:
1. Run \`devlog_workspace_claim\` to start working
2. Use \`devlog_session_log\` to track progress
3. End with \`devlog_workspace_dump reason="session complete"\`

Happy coding! 🚀`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to initialize devlog: ${error}`,
          },
        ],
      };
    }
  }
};