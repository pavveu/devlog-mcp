/**
 * Tool Configuration System
 * Allows enabling/disabling specific tools per environment
 */

export interface ToolConfig {
  [toolName: string]: {
    enabled: boolean;
    config?: Record<string, any>;
  };
}

export function loadToolConfig(): ToolConfig {
  // Default all tools enabled
  const defaultConfig: ToolConfig = {
    // Core tools (always enabled)
    devlog_workspace_status: { enabled: true },
    devlog_workspace_claim: { enabled: true },
    devlog_session_log: { enabled: true },
    
    // Analytics tools
    devlog_analytics_summary: { enabled: true },
    devlog_analytics_patterns: { enabled: true },
    devlog_analytics_report: { enabled: true },
    
    // AI-powered tools (can be disabled)
    devlog_ai_analysis: { 
      enabled: process.env.DEVLOG_ENABLE_AI_ANALYSIS === 'true',
      config: { model: process.env.DEVLOG_AI_MODEL || 'gpt-4.1-mini' }
    },
    devlog_ai_planning: { 
      enabled: process.env.DEVLOG_ENABLE_AI_PLANNING === 'true' 
    },
    
    // Search tools
    devlog_search: { enabled: true },
    devlog_search_semantic: { 
      enabled: process.env.DEVLOG_ENABLE_SEMANTIC_SEARCH === 'true' 
    }
  };

  // Load from environment variable
  const configOverride = process.env.DEVLOG_TOOL_CONFIG;
  if (configOverride) {
    try {
      const override = JSON.parse(configOverride);
      return { ...defaultConfig, ...override };
    } catch (e) {
      console.warn('Invalid DEVLOG_TOOL_CONFIG, using defaults');
    }
  }

  // Load from file if exists
  const configPath = process.env.DEVLOG_TOOL_CONFIG_PATH;
  if (configPath) {
    try {
      const fs = require('fs');
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaultConfig, ...fileConfig };
    } catch (e) {
      console.warn(`Could not load config from ${configPath}, using defaults`);
    }
  }

  return defaultConfig;
}

export function isToolEnabled(toolName: string, config?: ToolConfig): boolean {
  const toolConfig = config || loadToolConfig();
  return toolConfig[toolName]?.enabled !== false;
}