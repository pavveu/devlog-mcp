#!/usr/bin/env node

/**
 * Test script for Mermaid compression integration
 */

// Mock data for testing - with realistic MCP decisions
const mockCompressionData = {
  weekNumber: 26,
  year: 2025,
  taskDistribution: {
    features: 45,
    bugs: 25,
    research: 20,
    planning: 10,
    other: 0
  },
  activeHours: {
    totalHours: 32,
    dailyHours: {
      '2025-06-23': 6,
      '2025-06-24': 8,
      '2025-06-25': 7,
      '2025-06-26': 6,
      '2025-06-27': 5
    },
    peakHour: 14,
    averageSessionLength: 3.2,
    workPattern: 'normal',
    activeTimeSlots: 8
  },
  productivityScore: 'HIGH',
  velocity: 12,
  decisions: [
    'MCP OpenAPI Server Selection for API integration',
    'MCP Architecture Simplification to reduce complexity',
    'OpenAPI MCP Solutions verification and testing',
    'Implemented Mermaid MCP for diagram generation',
    'Enhanced compression tool with visual analytics'
  ],
  timeline: [
    { task: 'Setup MCP devlog server', completed: true },
    { task: 'Implement compression logic', completed: true },
    { task: 'Add visual analytics', completed: true },
    { task: 'Integrate Mermaid diagrams', completed: false },
    { task: 'Test compression workflow', completed: false }
  ]
};

// Import the diagram generation functions
function generateCompressionOverviewDiagram(data) {
  const { taskDistribution, activeHours, productivityScore, velocity } = data;
  
  return `graph TD
    A[Week ${data.weekNumber}-${data.year} Analysis] --> B[Activity Patterns]
    A --> C[Task Distribution]
    A --> D[Decision Flow]
    
    B --> B1[${getWorkPatternLabel(activeHours.workPattern)}]
    B --> B2[Peak: ${activeHours.peakHour}:00]
    B --> B3[Total: ${activeHours.totalHours}h]
    
    C --> C1[Features: ${taskDistribution.features}%]
    C --> C2[Bugs: ${taskDistribution.bugs}%]
    C --> C3[Research: ${taskDistribution.research}%]
    C --> C4[Planning: ${taskDistribution.planning}%]
    
    D --> D1[Architecture Decisions]
    D --> D2[Technical Choices]
    D --> D3[Process Changes]
    
    B1 --> E[Productivity: ${productivityScore}]
    B2 --> E
    B3 --> E
    
    C1 --> F[Velocity: ${velocity} tasks/week]
    C2 --> F
    C3 --> F
    C4 --> F
    
    D1 --> G[Impact Assessment]
    D2 --> G
    D3 --> G
    
    style A fill:#e1f5fe
    style E fill:${getProductivityColor(productivityScore)}
    style F fill:#fff3e0
    style G fill:#f3e5f5`;
}

function generateTaskDistributionPie(data) {
  const { taskDistribution } = data;
  
  return `pie title Task Distribution - Week ${data.weekNumber}
    "Features" : ${taskDistribution.features}
    "Bug Fixes" : ${taskDistribution.bugs}
    "Research" : ${taskDistribution.research}
    "Planning" : ${taskDistribution.planning}`;
}

function generateDecisionFlowDiagram(data) {
  const { decisions, weekNumber } = data;
  
  // Categorize decisions
  const architecture = decisions.filter(d => 
    d.toLowerCase().includes('mcp') ||
    d.toLowerCase().includes('architecture') ||
    d.toLowerCase().includes('server') ||
    d.toLowerCase().includes('integration')
  );
  
  const implementation = decisions.filter(d => 
    d.toLowerCase().includes('implement') ||
    d.toLowerCase().includes('feature') ||
    d.toLowerCase().includes('tool')
  );
  
  if (architecture.length > 0) {
    const arch = architecture.slice(0, 3);
    const impl = implementation.slice(0, 2);
    
    let flowCode = `flowchart TD
    A[Week ${weekNumber}<br/>Decisions] --> B{Architecture<br/>Focus}
    
    `;
    
    // Architecture decisions
    arch.forEach((decision, index) => {
      const cleanDecision = decision.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(' ').slice(0, 6).join(' ');
      flowCode += `B --> A${index}["🏗️ ${cleanDecision}"]\n    `;
    });
    
    // Implementation decisions
    if (impl.length > 0) {
      flowCode += `B --> I{Implementation}\n    `;
      impl.forEach((decision, index) => {
        const cleanDecision = decision.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(' ').slice(0, 6).join(' ');
        flowCode += `I --> I${index}["⚙️ ${cleanDecision}"]\n    `;
      });
    }
    
    // Add outcomes
    flowCode += `
    ${arch.map((_, i) => `A${i} --> O[System Enhanced]`).join('\n    ')}
    ${impl.length > 0 ? impl.map((_, i) => `I${i} --> O`).join('\n    ') : ''}
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style B fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style O fill:#e8f5e8,stroke:#388e3c,stroke-width:2px`;
    
    return flowCode;
  }
  
  return `graph TD
    A[Week ${weekNumber}] --> B[Steady Progress]
    style A fill:#e1f5fe
    style B fill:#c8e6c9`;
}

function getWorkPatternLabel(pattern) {
  const labels = {
    'early-bird': '🌅 Early Bird',
    'normal': '☀️ Normal Hours',
    'night-owl': '🦉 Night Owl',
    'mixed': '🔄 Mixed Pattern'
  };
  return labels[pattern];
}

function getProductivityColor(score) {
  const colors = {
    'HIGH': '#c8e6c9',
    'MEDIUM': '#fff3e0',
    'LOW': '#ffcdd2'
  };
  return colors[score];
}

// Test the diagram generation
console.log('🧪 Testing Mermaid Compression Integration\n');

console.log('📊 Overview Diagram:');
console.log('```mermaid');
console.log(generateCompressionOverviewDiagram(mockCompressionData));
console.log('```\n');

console.log('🥧 Task Distribution Pie Chart:');
console.log('```mermaid');
console.log(generateTaskDistributionPie(mockCompressionData));
console.log('```\n');

console.log('🔄 Decision Flow Diagram (Enhanced):');
console.log('```mermaid');
console.log(generateDecisionFlowDiagram(mockCompressionData));
console.log('```\n');

console.log('✅ Mermaid diagram generation test completed!');
console.log('📝 Next steps:');
console.log('1. Integrate with actual MCP server');
console.log('2. Add to compression workflow');
console.log('3. Test with real devlog data');