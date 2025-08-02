# MCP DevLog Server - Modular Architecture

## Overview

The MCP DevLog server has been refactored from a single 2000+ line file into a clean, modular architecture that makes it easy to add new tools and maintain existing functionality.

## Directory Structure

```
src/
├── server.ts              # Main entry point for modular server
├── simple-devlog-server.ts # Original monolithic server (kept for compatibility)
├── types/
│   └── devlog.ts         # Shared types and interfaces
├── utils/
│   ├── parsing.ts        # YAML frontmatter parsing utilities
│   ├── search.ts         # Search and filtering functionality
│   └── workspace.ts      # Workspace and agent management
└── tools/
    ├── registry.ts       # Tool registration system
    ├── basic-tools.ts    # Core functionality (test, search, list)
    ├── conflict-tools.ts # Conflict detection and regression tracking
    ├── analysis-tools.ts # Feature status and velocity insights
    ├── tag-tools.ts      # Tag-based search and statistics
    ├── planning-tools.ts # Feature planning and research capture
    └── workspace-tools.ts # Session management and logging
```

## Building and Running

### Build the server
```bash
npm run build
```

### Run the modular server
```bash
node dist/esm/server.js
```

### Make it available to Claude Desktop
Update your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "devlog": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-devlog/dist/esm/server.js"],
      "env": {
        "DEVLOG_PATH": "/path/to/your/devlog"
      }
    }
  }
}
```

## Adding New Tools

1. Create a new file in `src/tools/` (e.g., `my-tools.ts`)
2. Import required dependencies:
```typescript
import { z } from 'zod';
import { ToolDefinition } from './registry.js';
import { CallToolResult } from '../types.js';
```

3. Define your tools:
```typescript
export const myTools: ToolDefinition[] = [
  {
    name: 'my_tool',
    title: 'My Tool',
    description: 'Description of what this tool does',
    inputSchema: {
      param: z.string().describe('Parameter description'),
    },
    handler: async ({ param }): Promise<CallToolResult> => {
      // Tool implementation
      return {
        content: [
          {
            type: 'text',
            text: `Result: ${param}`,
          },
        ],
      };
    }
  }
];
```

4. Import and register in `server.ts`:
```typescript
import { myTools } from './tools/my-tools.js';

const allTools = [
  ...basicTools,
  ...conflictTools,
  ...analysisTools,
  ...tagTools,
  ...planningTools,
  ...workspaceTools,
  ...myTools  // Add your tools here
];
```

## Tool Categories

### Basic Tools (3 tools)
- `test_connection` - Test MCP server connectivity
- `search_devlogs` - Search with text and tag filters
- `list_recent_devlogs` - List recently modified entries

### Conflict Tools (3 tools)
- `devlog_detect_conflicts` - Find potential feature conflicts
- `devlog_check_duplicate` - Check for duplicate implementations
- `devlog_regression_history` - Track previous failures

### Analysis Tools (5 tools)
- `devlog_feature_status` - Get implementation status
- `devlog_pending` - Find incomplete work items
- `devlog_velocity_insights` - Track productivity metrics
- `devlog_timeline` - Generate chronological history
- `devlog_test_checklist` - Generate test suggestions

### Tag Tools (3 tools)
- `devlog_query_by_tags` - Query by specific tags
- `devlog_tag_stats` - Get tag usage statistics
- `devlog_list_tag_values` - List values for a tag

### Planning Tools (3 tools)
- `devlog_plan_feature` - Create implementation plans
- `devlog_capture_research` - Save research findings
- `devlog_whats_next` - Get prioritized task suggestions

### Workspace Tools (4 tools)
- `devlog_workspace_init` - Initialize workspace session
- `devlog_workspace_status` - Get current status
- `devlog_session_log` - Log progress updates
- `devlog_session_complete` - Complete and archive session

## Benefits of Modular Architecture

1. **Easier to Add Tools** - Just create a new file and register
2. **Better Organization** - Tools grouped by functionality
3. **Improved Maintainability** - Each file focused on specific domain
4. **Type Safety** - Shared types ensure consistency
5. **Reusable Utilities** - Common functions in utils/
6. **Scalable** - Can grow without becoming unwieldy

## Migration from Simple Server

The original `simple-devlog-server.ts` is still available for compatibility. Both servers provide the same tools, but the modular version is recommended for future development.