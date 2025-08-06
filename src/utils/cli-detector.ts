/**
 * CLI Detection and Adaptation
 * Detects which AI CLI is using the MCP server
 */

export interface CLIContext {
  name: string;
  version?: string;
  features: {
    supportsStreaming?: boolean;
    supportsOAuth?: boolean;
    supportsNotifications?: boolean;
  };
}

export function detectCLI(): CLIContext {
  // Check environment variables set by different CLIs
  if (process.env.CLAUDE_CLI_VERSION) {
    return {
      name: 'claude',
      version: process.env.CLAUDE_CLI_VERSION,
      features: {
        supportsStreaming: true,
        supportsOAuth: true,
        supportsNotifications: true
      }
    };
  }
  
  if (process.env.GEMINI_CLI_VERSION || process.env.GEMINI_API_KEY) {
    return {
      name: 'gemini',
      version: process.env.GEMINI_CLI_VERSION,
      features: {
        supportsStreaming: true,
        supportsOAuth: false,
        supportsNotifications: false
      }
    };
  }
  
  if (process.env.QWEN_CLI_VERSION || process.env.QWEN_API_KEY) {
    return {
      name: 'qwen3-coder',
      version: process.env.QWEN_CLI_VERSION,
      features: {
        supportsStreaming: false,
        supportsOAuth: false,
        supportsNotifications: false
      }
    };
  }

  // Check process arguments
  const parentProcess = process.argv[0] || '';
  if (parentProcess.includes('claude')) {
    return { name: 'claude', features: { supportsStreaming: true } };
  }
  if (parentProcess.includes('gemini')) {
    return { name: 'gemini', features: { supportsStreaming: true } };
  }
  if (parentProcess.includes('qwen')) {
    return { name: 'qwen3-coder', features: { supportsStreaming: false } };
  }

  // Default/unknown CLI
  return {
    name: 'unknown',
    features: {
      supportsStreaming: false,
      supportsOAuth: false,
      supportsNotifications: false
    }
  };
}

export function adaptForCLI(cli: CLIContext, response: unknown): unknown {
  // Adapt responses based on CLI capabilities
  if (!cli.features.supportsStreaming && 
      response && 
      typeof response === 'object' && 
      'stream' in response && 
      response.stream) {
    // Convert streaming response to batch
    return { ...response, stream: false };
  }
  
  // Add CLI-specific metadata
  if (cli.name === 'claude' && 
      response && 
      typeof response === 'object') {
    const typedResponse = response as { metadata?: Record<string, unknown> };
    return { 
      ...response, 
      metadata: { 
        ...typedResponse.metadata, 
        formatted: true 
      } 
    };
  }
  
  return response;
}