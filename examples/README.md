# DevLog MCP Examples

This directory contains example configurations and usage patterns for DevLog MCP.

## Example Configurations

### Basic Setup (.mcp.json)

The included `.mcp.json` shows how to configure all DevLog servers with environment variable support.

### Environment Files

Create different environment files for different contexts:

```bash
# .env.personal
OPENAI_API_KEY=sk-personal-key-here
DEVLOG_WORKSPACE_ID=personal-projects
DEVLOG_LOG_LEVEL=info

# .env.work
OPENAI_API_KEY=sk-work-key-here
DEVLOG_WORKSPACE_ID=work-project
DEVLOG_LOG_LEVEL=debug
DEVLOG_ENABLE_AI_PLANNING=true
```

## Usage Patterns

### 1. Single Developer Setup

```bash
# Initialize
cp ../.env.example .env.local
# Add your API keys to .env.local

# Add to Claude
claude mcp add devlog "../mcp-wrapper.sh" ".env.local" "node" "../dist/servers/core-server.js"
```

### 2. Multi-Project Setup

Create project-specific configurations:

```bash
# Project A
mkdir ~/projects/project-a/.mcp
cp .mcp.json ~/projects/project-a/.mcp/
echo "DEVLOG_WORKSPACE_ID=project-a" > ~/projects/project-a/.env.project

# Project B
mkdir ~/projects/project-b/.mcp
cp .mcp.json ~/projects/project-b/.mcp/
echo "DEVLOG_WORKSPACE_ID=project-b" > ~/projects/project-b/.env.project
```

### 3. Team Setup

Share configuration without secrets:

```json
// team-config.json (committed to git)
{
  "mcpServers": {
    "devlog": {
      "command": "./mcp-wrapper.sh",
      "args": [".env.local", "node", "path/to/devlog/core-server.js"]
    }
  }
}
```

Team members create their own `.env.local` with their API keys.

## Common Workflows

### Daily Development

```typescript
// Start of day
await devlog_workspace_claim({
  task: "Working on feature X",
  tags: { sprint: "S24-3" }
});

// During development
await devlog_session_log({
  entries: ["Implemented component Y", "Fixed bug Z"],
  tags: { progress: "50%" }
});

// End of day
await devlog_workspace_dump({ format: "markdown" });
```

### Weekly Review

```typescript
// Get weekly analytics
const summary = await devlog_analytics_summary({ days: 7 });

// Search for specific work
const features = await devlog_search_by_tag({
  tags: ["feature"],
  matchAll: false
});

// Generate report
const report = await devlog_analytics_report({
  startDate: "2024-01-01",
  endDate: "2024-01-07",
  format: "markdown"
});
```

## Tips

1. **Use consistent tags** across your team for better analytics
2. **Log frequently** - small, regular entries are better than large dumps
3. **Leverage search** - use semantic search to find similar past solutions
4. **Automate with hooks** - integrate with git hooks for automatic logging
5. **Review analytics** - weekly reviews help identify productivity patterns