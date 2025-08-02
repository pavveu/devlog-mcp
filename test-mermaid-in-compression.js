#!/usr/bin/env node

// Test Mermaid integration in compression
const mockCompressionData = {
  weekNumber: 26,
  year: 2025,
  taskDistribution: {
    features: 30,
    bugs: 40,
    research: 20,
    planning: 10,
    other: 0
  },
  activeHours: {
    totalHours: 8,
    dailyHours: { '2025-07-03': 8 },
    peakHour: 14,
    averageSessionLength: 8,
    workPattern: 'normal',
    activeTimeSlots: 4
  },
  productivityScore: 'HIGH',
  velocity: 5,
  decisions: [
    'Integrated Mermaid MCP for visual compression analysis',
    'Enhanced decision flow categorization architecture vs implementation', 
    'Added smart text cleaning for better diagram readability'
  ],
  timeline: []
};

// Import the functions (these would be ES modules in actual use)
function generateAllCompressionDiagrams(data) {
  return {
    decisionFlow: generateDecisionFlowDiagram(data),
    taskDistribution: generateTaskDistributionPie(data),
    overview: generateCompressionOverviewDiagram(data)
  };
}

function generateDecisionFlowDiagram(data) {
  const { decisions, weekNumber } = data;
  
  // Categorize decisions
  const architecture = decisions.filter(d => 
    d.toLowerCase().includes('mcp') ||
    d.toLowerCase().includes('architecture') ||
    d.toLowerCase().includes('integration')
  );
  
  if (architecture.length > 0) {
    const arch = architecture.slice(0, 3);
    
    let flowCode = `flowchart TD
    A[Week ${weekNumber}<br/>Decisions] --> B{Architecture<br/>Focus}
    
    `;
    
    arch.forEach((decision, index) => {
      const cleanDecision = decision.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(' ').slice(0, 6).join(' ');
      flowCode += `B --> A${index}["🏗️ ${cleanDecision}"]\n    `;
    });
    
    flowCode += `
    ${arch.map((_, i) => `A${i} --> O[System Enhanced]`).join('\n    ')}
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style B fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style O fill:#e8f5e8,stroke:#388e3c,stroke-width:2px`;
    
    return flowCode;
  }
  
  return 'graph TD\n    A[Week 26] --> B[No Decisions]';
}

function generateTaskDistributionPie(data) {
  const { taskDistribution } = data;
  
  return `pie title Task Distribution - Week ${data.weekNumber}
    "Features" : ${taskDistribution.features}
    "Bug Fixes" : ${taskDistribution.bugs}
    "Research" : ${taskDistribution.research}
    "Planning" : ${taskDistribution.planning}`;
}

function generateCompressionOverviewDiagram(data) {
  return `flowchart TB
    subgraph W["📊 Week ${data.weekNumber} Overview"]
        A[Week Analysis]
    end
    
    subgraph P["⏰ Productivity Metrics"]
        P1["☀️ Normal Hours"]
        P2["Peak Hours<br/>${data.activeHours.peakHour}:00"]
        P3["Active Time<br/>${data.activeHours.totalHours} hours"]
        P4["Score: ${data.productivityScore}"]
    end
    
    subgraph T["📋 Task Breakdown"]
        T1["🚀 Features<br/>${data.taskDistribution.features}%"]
        T2["🐛 Bugs<br/>${data.taskDistribution.bugs}%"]
        T3["🔍 Research<br/>${data.taskDistribution.research}%"]
        T4["📝 Planning<br/>${data.taskDistribution.planning}%"]
    end
    
    A --> P
    A --> T
    
    style W fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style P fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style T fill:#fff3e0,stroke:#f57c00,stroke-width:2px`;
}

// Test the generation
console.log('🧪 Testing Mermaid in Compression Context\n');

const diagrams = generateAllCompressionDiagrams(mockCompressionData);

console.log('### Decision Flow Analysis');
console.log('```mermaid');
console.log(diagrams.decisionFlow);
console.log('```\n');

console.log('### Task Distribution Overview');
console.log('```mermaid');
console.log(diagrams.taskDistribution);
console.log('```\n');

console.log('### Weekly Overview');
console.log('```mermaid');
console.log(diagrams.overview);
console.log('```\n');

console.log('✅ Mermaid diagrams generated successfully!');