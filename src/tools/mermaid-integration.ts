/**
 * Integration layer for Mermaid MCP server
 * Handles actual diagram generation and file management
 */

import { CompressionVisualData, MermaidGenerationOptions, generateAllCompressionDiagrams } from './mermaid-compression-enhancement.js';

export interface MermaidMCPClient {
  generate: (options: {
    code: string;
    outputFormat?: 'png' | 'svg';
    theme?: 'default' | 'forest' | 'dark' | 'neutral';
    backgroundColor?: string;
    folder?: string;
    name?: string;
  }) => Promise<{ success: boolean; path?: string; error?: string }>;
}

export interface GeneratedDiagrams {
  overview: { path: string; name: string };
  taskDistribution: { path: string; name: string };
  timeline: { path: string; name: string };
  decisionFlow: { path: string; name: string };
  productivityFlow: { path: string; name: string };
  architectureOverview: { path: string; name: string };
}

/**
 * Generate all compression diagrams using Mermaid MCP
 */
export async function generateCompressionDiagrams(
  data: CompressionVisualData,
  mcpClient: MermaidMCPClient,
  options: MermaidGenerationOptions = {}
): Promise<GeneratedDiagrams> {
  const diagrams = generateAllCompressionDiagrams(data);
  const baseOptions = {
    outputFormat: options.outputFormat || 'png' as const,
    theme: options.theme || 'default' as const,
    backgroundColor: options.backgroundColor || 'white',
    folder: options.folder || undefined
  };

  const results: Partial<GeneratedDiagrams> = {};

  // Generate overview diagram
  try {
    const overviewResult = await mcpClient.generate({
      ...baseOptions,
      code: diagrams.overview,
      name: `week-${data.weekNumber}-overview`
    });
    if (overviewResult.success && overviewResult.path) {
      results.overview = { 
        path: overviewResult.path, 
        name: `week-${data.weekNumber}-overview.${baseOptions.outputFormat}` 
      };
    }
  } catch (error) {
    console.warn('Failed to generate overview diagram:', error);
  }

  // Generate task distribution pie chart
  try {
    const taskResult = await mcpClient.generate({
      ...baseOptions,
      code: diagrams.taskDistribution,
      name: `week-${data.weekNumber}-task-distribution`
    });
    if (taskResult.success && taskResult.path) {
      results.taskDistribution = { 
        path: taskResult.path, 
        name: `week-${data.weekNumber}-task-distribution.${baseOptions.outputFormat}` 
      };
    }
  } catch (error) {
    console.warn('Failed to generate task distribution diagram:', error);
  }

  // Generate timeline
  try {
    const timelineResult = await mcpClient.generate({
      ...baseOptions,
      code: diagrams.timeline,
      name: `week-${data.weekNumber}-timeline`
    });
    if (timelineResult.success && timelineResult.path) {
      results.timeline = { 
        path: timelineResult.path, 
        name: `week-${data.weekNumber}-timeline.${baseOptions.outputFormat}` 
      };
    }
  } catch (error) {
    console.warn('Failed to generate timeline diagram:', error);
  }

  // Generate decision flow
  try {
    const decisionResult = await mcpClient.generate({
      ...baseOptions,
      code: diagrams.decisionFlow,
      name: `week-${data.weekNumber}-decisions`
    });
    if (decisionResult.success && decisionResult.path) {
      results.decisionFlow = { 
        path: decisionResult.path, 
        name: `week-${data.weekNumber}-decisions.${baseOptions.outputFormat}` 
      };
    }
  } catch (error) {
    console.warn('Failed to generate decision flow diagram:', error);
  }

  // Generate productivity flow
  try {
    const productivityResult = await mcpClient.generate({
      ...baseOptions,
      code: diagrams.productivityFlow,
      name: `week-${data.weekNumber}-productivity`
    });
    if (productivityResult.success && productivityResult.path) {
      results.productivityFlow = { 
        path: productivityResult.path, 
        name: `week-${data.weekNumber}-productivity.${baseOptions.outputFormat}` 
      };
    }
  } catch (error) {
    console.warn('Failed to generate productivity flow diagram:', error);
  }

  return results as GeneratedDiagrams;
}

/**
 * Generate markdown section with embedded diagrams
 */
export function generateDiagramMarkdownSection(
  diagrams: Partial<GeneratedDiagrams>,
  data: CompressionVisualData
): string {
  let markdown = `\n## 📊 Visual Analysis\n\n`;

  if (diagrams.overview) {
    markdown += `### Week Overview\n![Week ${data.weekNumber} Overview](${diagrams.overview.path})\n\n`;
  }

  if (diagrams.taskDistribution) {
    markdown += `### Task Distribution\n![Task Distribution](${diagrams.taskDistribution.path})\n\n`;
  }

  if (diagrams.timeline) {
    markdown += `### Development Timeline\n![Timeline](${diagrams.timeline.path})\n\n`;
  }

  if (diagrams.decisionFlow && data.decisions.length > 0) {
    markdown += `### Decision Flow\n![Decision Flow](${diagrams.decisionFlow.path})\n\n`;
  }

  if (diagrams.productivityFlow) {
    markdown += `### Productivity Analysis\n![Productivity Flow](${diagrams.productivityFlow.path})\n\n`;
  }

  // Add fallback Mermaid code blocks if images failed to generate
  if (!diagrams.overview || !diagrams.taskDistribution) {
    markdown += `\n### Diagram Code (Fallback)\n\n`;
    const allDiagrams = generateAllCompressionDiagrams(data);
    
    if (!diagrams.overview) {
      markdown += `\`\`\`mermaid\n${allDiagrams.overview}\n\`\`\`\n\n`;
    }
    
    if (!diagrams.taskDistribution) {
      markdown += `\`\`\`mermaid\n${allDiagrams.taskDistribution}\n\`\`\`\n\n`;
    }
  }

  return markdown;
}

/**
 * Create mock MCP client for testing
 */
export function createMockMermaidClient(): MermaidMCPClient {
  return {
    generate: async (options) => {
      // Mock implementation - in real usage, this would call the actual MCP server
      console.log(`Mock: Generating ${options.name} with theme ${options.theme}`);
      return {
        success: true,
        path: `/mock/path/${options.name}.${options.outputFormat || 'png'}`
      };
    }
  };
}

/**
 * Extract visual data from compression analysis
 */
export function extractVisualDataFromCompressionResult(
  compressionResult: any,
  weekNumber: number,
  year: number
): CompressionVisualData {
  const {
    completedTasks = [],
    decisions = [],
    timeline = [],
    activeHours = {},
    velocity = { tasksPerWeek: 0 }
  } = compressionResult;

  // Calculate task distribution
  const features = completedTasks.filter((task: string) => 
    task.toLowerCase().includes('feature') || 
    task.toLowerCase().includes('implement') ||
    task.toLowerCase().includes('add')
  ).length;

  const bugs = completedTasks.filter((task: string) => 
    task.toLowerCase().includes('bug') || 
    task.toLowerCase().includes('fix') ||
    task.toLowerCase().includes('error')
  ).length;

  const research = completedTasks.filter((task: string) => 
    task.toLowerCase().includes('research') || 
    task.toLowerCase().includes('investigate') ||
    task.toLowerCase().includes('explore')
  ).length;

  const planning = completedTasks.filter((task: string) => 
    task.toLowerCase().includes('plan') || 
    task.toLowerCase().includes('design') ||
    task.toLowerCase().includes('spec')
  ).length;

  const total = completedTasks.length || 1;
  const other = Math.max(0, total - features - bugs - research - planning);

  // Calculate percentages
  const taskDistribution = {
    features: Math.round((features / total) * 100),
    bugs: Math.round((bugs / total) * 100),
    research: Math.round((research / total) * 100),
    planning: Math.round((planning / total) * 100),
    other: Math.round((other / total) * 100)
  };

  // Determine productivity score
  const totalHours = activeHours.totalHours || 0;
  const tasksPerWeek = velocity.tasksPerWeek || completedTasks.length;
  let productivityScore: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

  if (totalHours > 25 && tasksPerWeek > 15) {
    productivityScore = 'HIGH';
  } else if (totalHours < 10 || tasksPerWeek < 5) {
    productivityScore = 'LOW';
  }

  return {
    weekNumber,
    year,
    taskDistribution,
    activeHours: {
      totalHours,
      dailyHours: activeHours.dailyHours || {},
      peakHour: activeHours.peakHour || 10,
      averageSessionLength: activeHours.averageSessionLength || 2.5,
      workPattern: activeHours.workPattern || 'normal',
      activeTimeSlots: activeHours.activeTimeSlots || 8
    },
    productivityScore,
    velocity: tasksPerWeek,
    decisions: decisions.slice(0, 10), // Limit for diagram readability
    timeline: timeline.slice(0, 15) // Limit for diagram readability
  };
}