# DevLog MCP - Developer Logging & Workspace Management

A modular MCP (Model Context Protocol) server for developer logging, workspace management, and AI-assisted development workflows. Built with TypeScript and designed for seamless integration with Claude.

> **Built on**: This project extends the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) by Anthropic with specialized tools for developer workflows.

## Features

### 🎯 Core Modules

- **Core Server** - Essential workspace management and time tracking
- **Analytics Server** - Development metrics and insights
- **Planning Server** - Task planning and project management
- **Search Server** - Semantic search across development logs

### 🛠️ Key Capabilities

- **Multi-Agent Support** - Handle concurrent development sessions
- **Smart Workspace Management** - Project-aware context switching
- **Time Tracking** - Automatic session duration tracking
- **AI-Powered Analysis** - Optional LLM integration for insights
- **Semantic Search** - ChromaDB integration for intelligent search
- **Conflict Resolution** - Built-in tools for merge conflicts

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devlog-mcp
   cd devlog-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys (optional)
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Add to Claude**
   ```bash
   # Add core server (essential features)
   claude mcp add devlog-core "node" "$(pwd)/dist/servers/core-server.js"
   
   # Or add with environment variables
   claude mcp add devlog-core "$(pwd)/../mcp-wrapper.sh" ".env.local" "node" "$(pwd)/dist/servers/core-server.js"
   ```

### Using the Management Script

For easier setup, use the included management script:

```bash
# Initialize configuration
../mcp-manager.sh init

# Add all DevLog servers
../mcp-manager.sh add-all

# Test your configuration
../mcp-manager.sh test
```

## Available Servers

### Core Server
Essential workspace management tools:
- `devlog_workspace_status` - Check workspace status
- `devlog_workspace_claim` - Claim workspace with lock
- `devlog_workspace_dump` - Export workspace data
- `devlog_session_log` - Log development sessions
- `devlog_current_update` - Update current.md file

### Analytics Server
Development metrics and insights:
- `devlog_analytics_summary` - Get development analytics
- `devlog_analytics_patterns` - Analyze work patterns
- `devlog_analytics_report` - Generate detailed reports

### Planning Server
Project planning and management:
- `devlog_plan_create` - Create development plans
- `devlog_plan_update` - Update existing plans
- `devlog_task_add` - Add new tasks
- `devlog_task_update` - Update task status

### Search Server
Semantic search capabilities:
- `devlog_search` - Search across all logs
- `devlog_search_semantic` - AI-powered semantic search
- `devlog_search_by_date` - Search within date ranges
- `devlog_search_by_tag` - Search by tags

## Configuration

### Environment Variables

```bash
# Optional LLM API Keys (for AI features)
OPENAI_API_KEY=your-key-here
GEMINI_API_KEY=your-key-here

# DevLog Settings
DEVLOG_WORKSPACE_ID=my-project
DEVLOG_LOG_LEVEL=info
DEVLOG_SESSION_TIMEOUT=3600

# Enable/Disable Features
DEVLOG_ENABLE_AI_PLANNING=false
DEVLOG_ENABLE_AI_ANALYSIS=false
```

### Per-Project Configuration

Create a `.env.project` file in your project root:

```bash
DEVLOG_WORKSPACE_ID=project-name
DEVLOG_TAGS=backend,api,typescript
```

## Usage Examples

### Basic Workflow

```typescript
// 1. Check workspace status
const status = await devlog_workspace_status();

// 2. Claim workspace for development
const claim = await devlog_workspace_claim({
  task: "Implement user authentication",
  tags: { feature: "auth", priority: "high" }
});

// 3. Log your session
const log = await devlog_session_log({
  entries: ["Added login endpoint", "Implemented JWT tokens"],
  tags: { completed: true }
});

// 4. Update current.md
const update = await devlog_current_update({
  content: "## Today's Progress\n- Completed auth implementation"
});
```

### Advanced Features

```typescript
// Semantic search across logs
const results = await devlog_search({
  query: "authentication implementation",
  useEmbeddings: true,
  limit: 10
});

// Generate analytics report
const report = await devlog_analytics_report({
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  groupBy: "tag"
});

// AI-powered planning (requires API keys)
const plan = await devlog_plan_create({
  goal: "Implement OAuth2 integration",
  context: "Existing JWT auth in place",
  useAI: true
});
```

## Multi-Project Setup

### Using Different Environments

1. Create environment files:
   ```bash
   # .env.personal
   OPENAI_API_KEY=personal-key
   DEVLOG_WORKSPACE_ID=personal-projects
   
   # .env.work
   OPENAI_API_KEY=work-key
   DEVLOG_WORKSPACE_ID=company-project
   ```

2. Add servers with specific environments:
   ```bash
   # Personal projects
   claude mcp add devlog-personal "../mcp-wrapper.sh" ".env.personal" "node" "dist/servers/core-server.js"
   
   # Work projects
   claude mcp add devlog-work "../mcp-wrapper.sh" ".env.work" "node" "dist/servers/core-server.js"
   ```

3. Switch between environments:
   ```bash
   ../mcp-manager.sh switch personal
   # or
   ../mcp-manager.sh switch work
   ```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Project Structure

```
devlog-mcp/
├── src/
│   ├── servers/          # MCP server implementations
│   ├── tools/            # Tool implementations
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript type definitions
├── examples/             # Usage examples
├── docs/                 # Additional documentation
└── tests/                # Test files
```

## API Documentation

See [docs/tools.md](docs/tools.md) for detailed API documentation of all available tools.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Guidelines

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Use conventional commits
5. Ensure all tests pass before submitting PR

## Troubleshooting

### Common Issues

1. **"API key not found" error**
   - Ensure your `.env.local` file exists and contains valid keys
   - Check that the wrapper script path is correct

2. **"Cannot find module" error**
   - Run `npm run build` to compile TypeScript files
   - Verify the dist/ directory exists

3. **"Workspace locked" error**
   - Another agent may have the lock
   - Use `force: true` parameter or wait for timeout

### Debug Mode

Enable debug logging:
```bash
DEVLOG_LOG_LEVEL=debug node dist/servers/core-server.js
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on top of the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) by Anthropic
- Original SDK Copyright (c) 2024 Anthropic, PBC - MIT License
- Thanks to the Anthropic team for creating the Model Context Protocol

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/devlog-mcp/issues)
- 💬 [Discussions](https://github.com/yourusername/devlog-mcp/discussions)

---

Made with ❤️ for developers who love organized workflows