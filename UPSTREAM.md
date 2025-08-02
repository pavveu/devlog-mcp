# Upstream Relationship

## Origin

DevLog MCP is built on top of the [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) by Anthropic.

## License

The original MCP TypeScript SDK is licensed under the MIT License.
Copyright (c) 2024 Anthropic, PBC

## Modifications

This project extends the original SDK with:
- DevLog-specific MCP servers for developer logging
- Multi-CLI support (Claude, Gemini, Qwen3)
- Workspace management and time tracking tools
- Tool enable/disable configuration system
- Additional utilities for project management

## Keeping Up-to-Date

To incorporate updates from the upstream SDK:

```bash
# Fetch latest changes
git fetch upstream

# Create update branch
git checkout -b update-sdk-$(date +%Y%m%d)

# Merge upstream changes
git merge upstream/main --no-ff

# Resolve conflicts if any
# Test thoroughly
# Merge to main when ready
```

## Contributing Back

Improvements to the core SDK functionality should be contributed back to the upstream project:
https://github.com/modelcontextprotocol/typescript-sdk

## Acknowledgments

Special thanks to the Anthropic team for creating and open-sourcing the Model Context Protocol and its TypeScript SDK, which makes projects like DevLog MCP possible.