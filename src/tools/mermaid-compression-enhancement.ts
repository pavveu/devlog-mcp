/**
 * Mermaid MCP integration for compression tool
 * Generates visual diagrams using the Mermaid MCP server
 */

import { ActiveHoursData } from './compression-enhancements.js';

export interface MermaidGenerationOptions {
  outputFormat?: 'png' | 'svg';
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
  backgroundColor?: string;
  folder?: string;
}

export interface CompressionVisualData {
  weekNumber: number;
  year: number;
  taskDistribution: {
    features: number;
    bugs: number;
    research: number;
    planning: number;
    other: number;
  };
  activeHours: ActiveHoursData;
  productivityScore: 'HIGH' | 'MEDIUM' | 'LOW';
  velocity: number;
  decisions: string[];
  timeline: any[];
}

/**
 * Generate Mermaid code for compression analysis overview - ENHANCED
 */
export function generateCompressionOverviewDiagram(data: CompressionVisualData): string {
  const { taskDistribution, activeHours, productivityScore, velocity } = data;
  
  return `flowchart TB
    subgraph W["📊 Week ${data.weekNumber} Overview"]
        A[Week Analysis]
    end
    
    subgraph P["⏰ Productivity Metrics"]
        P1["${getWorkPatternLabel(activeHours.workPattern)}"]
        P2["Peak Hours<br/>${activeHours.peakHour}:00"]
        P3["Active Time<br/>${activeHours.totalHours} hours"]
        P4["Score: ${productivityScore}"]
    end
    
    subgraph T["📋 Task Breakdown"]
        T1["🚀 Features<br/>${taskDistribution.features}%"]
        T2["🐛 Bugs<br/>${taskDistribution.bugs}%"]
        T3["🔍 Research<br/>${taskDistribution.research}%"]
        T4["📝 Planning<br/>${taskDistribution.planning}%"]
    end
    
    subgraph V["📈 Velocity Analysis"]
        V1["${velocity} tasks/week"]
        V2["${data.decisions.length} decisions"]
        V3["Quality: ${productivityScore}"]
    end
    
    A --> P
    A --> T
    A --> V
    
    P --> P4
    T --> V1
    
    style W fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style P fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style T fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style V fill:${getProductivityColor(productivityScore)},stroke:#388e3c,stroke-width:2px
    style P4 fill:${getProductivityColor(productivityScore)}
    style V1 fill:#e8f5e8`;
}

/**
 * Generate Mermaid code for task distribution pie chart
 */
export function generateTaskDistributionPie(data: CompressionVisualData): string {
  const { taskDistribution } = data;
  
  return `pie title Task Distribution - Week ${data.weekNumber}
    "Features" : ${taskDistribution.features}
    "Bug Fixes" : ${taskDistribution.bugs}
    "Research" : ${taskDistribution.research}
    "Planning" : ${taskDistribution.planning}
    "Other" : ${taskDistribution.other}`;
}

/**
 * Generate Mermaid code for weekly timeline
 */
export function generateWeeklyTimelineGantt(data: CompressionVisualData): string {
  const { timeline, weekNumber } = data;
  
  let ganttCode = `gantt
    title Week ${weekNumber} Development Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %a %d
    
    section Morning (9-12)`;
  
  // Add timeline entries (simplified for demo)
  timeline.slice(0, 5).forEach((entry, index) => {
    const status = entry.completed ? 'done' : 'active';
    ganttCode += `\n        ${entry.task}    :${status}, day${index + 1}, 2025-01-${20 + index}, 3h`;
  });
  
  ganttCode += `\n    
    section Afternoon (13-17)`;
  
  timeline.slice(5, 10).forEach((entry, index) => {
    const status = entry.completed ? 'done' : 'active';
    ganttCode += `\n        ${entry.task}    :${status}, day${index + 6}, 2025-01-${20 + index}, 4h`;
  });
  
  return ganttCode;
}

/**
 * Generate Mermaid code for decision flow diagram - ENHANCED VERSION
 */
export function generateDecisionFlowDiagram(data: CompressionVisualData): string {
  const { decisions, weekNumber } = data;
  
  if (decisions.length === 0) {
    return `graph TD
      A[Week ${weekNumber}] --> B[No Major Decisions]
      B --> C[Steady Progress]
      
      style A fill:#e1f5fe
      style C fill:#c8e6c9`;
  }
  
  // Categorize decisions by type
  const categories = categorizeDecisions(decisions);
  
  if (categories.architecture.length > 0) {
    return generateArchitectureDecisionFlow(weekNumber, categories);
  } else {
    return generateGeneralDecisionFlow(weekNumber, decisions);
  }
}

/**
 * Categorize decisions by type for better visualization
 */
function categorizeDecisions(decisions: string[]) {
  return {
    architecture: decisions.filter(d => 
      d.toLowerCase().includes('mcp') ||
      d.toLowerCase().includes('architecture') ||
      d.toLowerCase().includes('server') ||
      d.toLowerCase().includes('integration')
    ),
    implementation: decisions.filter(d => 
      d.toLowerCase().includes('implement') ||
      d.toLowerCase().includes('feature') ||
      d.toLowerCase().includes('tool')
    ),
    process: decisions.filter(d => 
      d.toLowerCase().includes('workflow') ||
      d.toLowerCase().includes('process') ||
      d.toLowerCase().includes('strategy')
    ),
    technical: decisions.filter(d => 
      d.toLowerCase().includes('tech') ||
      d.toLowerCase().includes('solution') ||
      d.toLowerCase().includes('api')
    )
  };
}

/**
 * Generate architecture-focused decision flow
 */
function generateArchitectureDecisionFlow(weekNumber: number, categories: any): string {
  const arch = categories.architecture.slice(0, 3);
  const impl = categories.implementation.slice(0, 2);
  
  let flowCode = `flowchart TD
    A[Week ${weekNumber}<br/>Decisions] --> B{Architecture<br/>Focus}
    
    `;
  
  // Architecture decisions
  arch.forEach((decision: string, index: number) => {
    const cleanDecision = cleanDecisionText(decision);
    flowCode += `B --> A${index}["🏗️ ${cleanDecision}"]\n    `;
  });
  
  // Implementation decisions
  if (impl.length > 0) {
    flowCode += `B --> I{Implementation}\n    `;
    impl.forEach((decision: string, index: number) => {
      const cleanDecision = cleanDecisionText(decision);
      flowCode += `I --> I${index}["⚙️ ${cleanDecision}"]\n    `;
    });
  }
  
  // Add outcomes
  flowCode += `
    ${arch.map((_: string, i: number) => `A${i} --> O[System Enhanced]`).join('\n    ')}
    ${impl.length > 0 ? impl.map((_: string, i: number) => `I${i} --> O`).join('\n    ') : ''}
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style B fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style O fill:#e8f5e8,stroke:#388e3c,stroke-width:2px`;
  
  return flowCode;
}

/**
 * Generate general decision flow for non-architecture decisions
 */
function generateGeneralDecisionFlow(weekNumber: number, decisions: string[]): string {
  const topDecisions = decisions.slice(0, 4);
  
  let flowCode = `graph LR
    A[Week ${weekNumber}<br/>Decisions] --> B[Key Choices]
    
    `;
  
  topDecisions.forEach((decision, index) => {
    const cleanDecision = cleanDecisionText(decision);
    const icon = getDecisionIcon(decision);
    flowCode += `B --> D${index}["${icon} ${cleanDecision}"]\n    `;
  });
  
  flowCode += `
    ${topDecisions.map((_, i) => `D${i} --> E[Progress Made]`).join('\n    ')}
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style E fill:#e8f5e8,stroke:#388e3c,stroke-width:2px`;
  
  return flowCode;
}

/**
 * Clean decision text for better display
 */
function cleanDecisionText(decision: string): string {
  return decision
    .replace(/[^a-zA-Z0-9 ]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .split(' ')
    .slice(0, 6) // Limit to 6 words
    .join(' ');
}

/**
 * Get appropriate icon for decision type
 */
function getDecisionIcon(decision: string): string {
  const lower = decision.toLowerCase();
  if (lower.includes('mcp') || lower.includes('server')) return '🔌';
  if (lower.includes('implement') || lower.includes('feature')) return '🛠️';
  if (lower.includes('design') || lower.includes('ui')) return '🎨';
  if (lower.includes('test') || lower.includes('quality')) return '🧪';
  if (lower.includes('performance') || lower.includes('speed')) return '⚡';
  if (lower.includes('security') || lower.includes('auth')) return '🔒';
  return '📋';
}

/**
 * Generate Mermaid code for productivity flow diagram
 */
export function generateProductivityFlowDiagram(data: CompressionVisualData): string {
  const { activeHours, productivityScore, velocity } = data;
  
  return `flowchart TD
    A[Week ${data.weekNumber} Productivity] --> B[Time Analysis]
    A --> C[Output Analysis]
    
    B --> B1[Active Hours: ${activeHours.totalHours}h]
    B --> B2[Peak Time: ${activeHours.peakHour}:00]
    B --> B3[Pattern: ${activeHours.workPattern}]
    
    C --> C1[Tasks: ${velocity}]
    C --> C2[Decisions: ${data.decisions.length}]
    C --> C3[Quality: ${productivityScore}]
    
    B1 --> D[Overall Score]
    B2 --> D
    B3 --> D
    C1 --> D
    C2 --> D
    C3 --> D
    
    D --> E[${productivityScore} Productivity]
    
    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:${getProductivityColor(productivityScore)}`;
}

/**
 * Generate all Mermaid diagrams for compression analysis
 */
export function generateAllCompressionDiagrams(data: CompressionVisualData): {
  overview: string;
  taskDistribution: string;
  timeline: string;
  decisionFlow: string;
  productivityFlow: string;
} {
  return {
    overview: generateCompressionOverviewDiagram(data),
    taskDistribution: generateTaskDistributionPie(data),
    timeline: generateWeeklyTimelineGantt(data),
    decisionFlow: generateDecisionFlowDiagram(data),
    productivityFlow: generateProductivityFlowDiagram(data)
  };
}

/**
 * Helper function to get work pattern label
 */
function getWorkPatternLabel(pattern: ActiveHoursData['workPattern']): string {
  const labels = {
    'early-bird': '🌅 Early Bird',
    'normal': '☀️ Normal Hours',
    'night-owl': '🦉 Night Owl',
    'mixed': '🔄 Mixed Pattern'
  };
  return labels[pattern];
}

/**
 * Helper function to get productivity color
 */
function getProductivityColor(score: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  const colors = {
    'HIGH': '#c8e6c9',
    'MEDIUM': '#fff3e0',
    'LOW': '#ffcdd2'
  };
  return colors[score];
}

/**
 * Generate Mermaid code for architecture overview
 */
export function generateArchitectureOverview(data: CompressionVisualData): string {
  return `graph TB
    subgraph "Week ${data.weekNumber} Architecture"
        A[Development Focus]
        A --> B[Feature Development]
        A --> C[Technical Debt]
        A --> D[Infrastructure]
        
        B --> B1[${data.taskDistribution.features}% Features]
        C --> C1[${data.taskDistribution.bugs}% Bug Fixes]
        D --> D1[${data.taskDistribution.research}% Research]
        
        B1 --> E[Delivery Pipeline]
        C1 --> E
        D1 --> E
        
        E --> F[Quality Gates]
        F --> G[Production Ready]
    end
    
    style A fill:#e8f5e8
    style E fill:#fff3e0
    style G fill:#e1f5fe`;
}