/**
 * Enhancement functions for compression tool
 * Adds ASCII visualizations and optional Mermaid conceptual diagrams
 */

export interface TimeSlot {
  morning: number;    // 6-12
  afternoon: number;  // 12-17
  evening: number;    // 17-22
  lateEvening: number; // 22-6
}

export interface WeekActivityMatrix {
  [day: string]: TimeSlot;
}

export interface ActiveHoursData {
  totalHours: number;
  dailyHours: Record<string, number>;
  peakHour: number;
  averageSessionLength: number;
  workPattern: 'early-bird' | 'normal' | 'night-owl' | 'mixed';
  activeTimeSlots: number; // count of time slots with activity
}

// Generate ASCII activity matrix with late evening
export function generateActivityMatrix(sessions: any[]): string {
  const matrix: WeekActivityMatrix = {
    Mon: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 },
    Tue: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 },
    Wed: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 },
    Thu: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 },
    Fri: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 },
    Sat: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 },
    Sun: { morning: 0, afternoon: 0, evening: 0, lateEvening: 0 }
  };
  
  // Analyze session times and duration
  sessions.forEach(session => {
    const dayName = session.date?.toLocaleDateString('en-US', { weekday: 'short' }) || 'Mon';
    const hour = extractSessionHour(session);
    const sessionHours = estimateSessionDuration(session);
    
    // Use session duration instead of just task count for better representation
    const activityWeight = Math.round(sessionHours * 2); // Convert to activity units
    
    if (hour >= 6 && hour < 12) matrix[dayName].morning += activityWeight;
    else if (hour >= 12 && hour < 17) matrix[dayName].afternoon += activityWeight;
    else if (hour >= 17 && hour < 22) matrix[dayName].evening += activityWeight;
    else matrix[dayName].lateEvening += activityWeight;
  });
  
  // Generate ASCII visualization with better scaling
  const getBar = (activityUnits: number): string => {
    if (activityUnits === 0) return '░░░';
    if (activityUnits <= 2) return '█░░';  // ~1 hour
    if (activityUnits <= 4) return '██░';  // ~2 hours
    return '███';  // 2+ hours
  };
  
  let output = '📊 Activity Heat Map\n';
  output += '            Mon Tue Wed Thu Fri Sat Sun\n';
  output += `Morning     ${Object.keys(matrix).map(day => getBar(matrix[day].morning)).join(' ')}\n`;
  output += `Afternoon   ${Object.keys(matrix).map(day => getBar(matrix[day].afternoon)).join(' ')}\n`;
  output += `Evening     ${Object.keys(matrix).map(day => getBar(matrix[day].evening)).join(' ')}\n`;
  output += `Late Night  ${Object.keys(matrix).map(day => getBar(matrix[day].lateEvening)).join(' ')}\n`;
  output += '\nLegend: ███ High (7+)  ██░ Medium (4-6)  █░░ Low (1-3)  ░░░ None\n';
  
  return output;
}

// Estimate session duration based on content and context
function estimateSessionDuration(session: any): number {
  // Base duration on task count and content complexity
  const tasks = session.completedTasks?.length || 0;
  const files = session.filesCreated || 0;
  
  // Estimate based on multiple factors:
  let estimatedHours = 0.5; // minimum 30 minutes
  
  // Add time based on completed tasks (15-30 min per task)
  estimatedHours += tasks * 0.25;
  
  // Add time based on files created (5-10 min per file)
  estimatedHours += files * 0.1;
  
  // Check if it's a dump session (usually shorter)
  if (session.file?.includes('dump') || session.dump_reason) {
    estimatedHours = Math.min(estimatedHours, 1.0);
  }
  
  // Reasonable bounds: 15 minutes to 4 hours
  return Math.max(0.25, Math.min(estimatedHours, 4.0));
}

// Calculate active hours from sessions
export function calculateActiveHours(sessions: any[]): ActiveHoursData {
  const hourActivity: Record<number, number> = {};
  const dailyHours: Record<string, number> = {};
  let totalMinutes = 0;
  
  // Track activity by hour and day
  sessions.forEach(session => {
    const hour = extractSessionHour(session);
    const dayKey = session.date?.toISOString().split('T')[0] || '2025-06-23';
    
    // Use smarter duration estimation
    const sessionHours = estimateSessionDuration(session);
    totalMinutes += sessionHours * 60;
    
    // Track hour distribution (activity intensity, not duration)
    const tasks = Math.max(session.completedTasks?.length || 1, 1);
    hourActivity[hour] = (hourActivity[hour] || 0) + tasks;
    
    // Track daily hours (actual estimated duration)
    dailyHours[dayKey] = (dailyHours[dayKey] || 0) + sessionHours;
  });
  
  // Find peak hour
  let peakHour = 2; // default to late night based on filenames
  let maxActivity = 0;
  Object.entries(hourActivity).forEach(([hour, activity]) => {
    if (activity > maxActivity) {
      maxActivity = activity;
      peakHour = parseInt(hour);
    }
  });
  
  // Determine work pattern
  const morningActivity = Object.entries(hourActivity)
    .filter(([h]) => parseInt(h) >= 6 && parseInt(h) < 12)
    .reduce((sum, [, count]) => sum + count, 0);
  
  const eveningActivity = Object.entries(hourActivity)
    .filter(([h]) => parseInt(h) >= 17 && parseInt(h) < 22)
    .reduce((sum, [, count]) => sum + count, 0);
    
  const lateNightActivity = Object.entries(hourActivity)
    .filter(([h]) => parseInt(h) >= 22 || parseInt(h) < 6)
    .reduce((sum, [, count]) => sum + count, 0);
  
  let workPattern: ActiveHoursData['workPattern'] = 'normal';
  if (morningActivity > eveningActivity * 1.5) workPattern = 'early-bird';
  else if (eveningActivity > morningActivity * 1.5) workPattern = 'night-owl';
  else if (lateNightActivity > morningActivity) workPattern = 'night-owl';
  else if (Object.keys(hourActivity).length > 6) workPattern = 'mixed';
  
  return {
    totalHours: Math.round(totalMinutes / 60),
    dailyHours,
    peakHour,
    averageSessionLength: sessions.length > 0 ? totalMinutes / sessions.length / 60 : 0,
    workPattern,
    activeTimeSlots: Object.keys(hourActivity).length
  };
}

// Generate active hours visualization
export function generateActiveHoursVisualization(activeHours: ActiveHoursData): string {
  let output = '⏰ Active Hours Analysis\n';
  
  // Total hours with visual bar
  const hoursBar = '█'.repeat(Math.min(Math.round(activeHours.totalHours / 2), 20));
  output += `Total Active Hours: ${hoursBar} ${activeHours.totalHours}h\n`;
  
  // Daily breakdown
  output += '\nDaily Distribution:\n';
  Object.entries(activeHours.dailyHours).forEach(([day, hours]) => {
    const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
    const bar = '█'.repeat(Math.round(hours));
    output += `${dayName}: ${bar} ${hours.toFixed(1)}h\n`;
  });
  
  // Work pattern
  const patternEmoji = {
    'early-bird': '🌅',
    'normal': '☀️',
    'night-owl': '🦉',
    'mixed': '🔄'
  };
  
  output += `\nWork Pattern: ${patternEmoji[activeHours.workPattern]} ${activeHours.workPattern}\n`;
  output += `Peak Productivity: ${activeHours.peakHour}:00\n`;
  output += `Avg Session Length: ${activeHours.averageSessionLength.toFixed(1)}h\n`;
  output += `Time Slot Coverage: ${activeHours.activeTimeSlots} different hours\n`;
  
  return output;
}

// Extract hour from session filename or date
function extractSessionHour(session: any): number {
  // Try to extract from filename first (e.g., "23h21")
  if (session.file) {
    const hourMatch = session.file.match(/(\d{2})h\d{2}/);
    if (hourMatch) {
      let hour = parseInt(hourMatch[1]);
      // Handle 24+ hour format (25h22 = 1:22 AM next day)
      if (hour >= 24) hour = hour - 24;
      return hour;
    }
  }
  
  // Fallback to date object if available
  if (session.date) {
    return session.date.getHours();
  }
  
  return 9; // default fallback
}

// Generate 24-hour activity clock
export function generateActivityClock(sessions: any[]): string {
  const hourCounts: number[] = new Array(24).fill(0);
  
  sessions.forEach(session => {
    const hour = extractSessionHour(session);
    // Weight by completed tasks, minimum 1 for any session
    const activity = Math.max(session.completedTasks?.length || 1, 1);
    hourCounts[hour] += activity;
  });
  
  const max = Math.max(...hourCounts);
  if (max === 0) {
    // No activity detected
    let output = '🕐 24-Hour Activity Pattern\n';
    output += '    00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23\n';
    output += '    ' + new Array(24).fill('·').join('  ') + '\n';
    output += '    └─ Night ─┘ └─ Morning ─┘ └─ Afternoon┘ └─ Evening ─┘ └─Late─┘\n';
    return output;
  }
  
  const normalize = (count: number) => {
    if (count === 0) return '·';
    if (count < max * 0.33) return '▁';
    if (count < max * 0.66) return '▄';
    return '█';
  };
  
  let output = '🕐 24-Hour Activity Pattern\n';
  output += '    00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23\n';
  output += '    ' + hourCounts.map(normalize).join('  ') + '\n';
  output += '    └─ Night ─┘ └─ Morning ─┘ └─ Afternoon┘ └─ Evening ─┘ └─Late─┘\n';
  
  return output;
}

// Generate productivity sparkline
export function generateSparkline(values: number[]): string {
  const sparks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  return values.map(v => {
    const normalized = ((v - min) / range) * 7;
    return sparks[Math.round(normalized)];
  }).join('');
}

// Generate completion rate progress bars
export function generateProgressBar(completed: number, total: number): string {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${percentage.toFixed(0)}%`;
}

// Generate conceptual Mermaid diagrams based on week's content
export function generateConceptualDiagrams(
  timeline: any,
  decisions: string[],
  features: string[]
): string[] {
  const diagrams: string[] = [];
  
  // Architecture decisions diagram
  if (decisions.length > 2) {
    const decisionFlow = `
\`\`\`mermaid
graph TD
    A[Week ${timeline.week} Decisions] --> B{Architecture}
    ${decisions.slice(0, 3).map((d, i) => 
      `B --> D${i}["${d.substring(0, 30)}..."]`
    ).join('\n    ')}
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
\`\`\``;
    diagrams.push(decisionFlow);
  }
  
  // Feature relationship diagram
  if (features.length > 1) {
    const featureMap = `
\`\`\`mermaid
mindmap
  root((Features))
    ${features.map(f => f.replace(/[^a-zA-Z0-9 ]/g, '')).join('\n    ')}
\`\`\``;
    diagrams.push(featureMap);
  }
  
  // Workflow changes
  const hasWorkflowChanges = decisions.some(d => 
    d.toLowerCase().includes('workflow') || 
    d.toLowerCase().includes('process') ||
    d.toLowerCase().includes('pipeline')
  );
  
  if (hasWorkflowChanges) {
    const workflow = `
\`\`\`mermaid
flowchart LR
    A[Previous Process] -->|Week ${timeline.week}| B[New Process]
    B --> C{Improvements}
    C -->|Speed| D[Faster Delivery]
    C -->|Quality| E[Better Output]
    C -->|DX| F[Developer Experience]
\`\`\``;
    diagrams.push(workflow);
  }
  
  return diagrams;
}

// Generate better filename for compressed files
export function generateCompressedFilename(
  year: number, 
  weekNumber: number,
  weekDates: { start: Date; end: Date }
): string {
  const monthStart = weekDates.start.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const monthEnd = weekDates.end.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const dayStart = weekDates.start.getDate();
  const dayEnd = weekDates.end.getDate();
  
  // Format: 2025-W25-jun23-29-weekly-analysis.md
  if (monthStart === monthEnd) {
    return `${year}-W${String(weekNumber).padStart(2, '0')}-${monthStart}${dayStart}-${dayEnd}-weekly-analysis.md`;
  } else {
    // Spans months: 2025-W26-jun29-jul5-weekly-analysis.md
    return `${year}-W${String(weekNumber).padStart(2, '0')}-${monthStart}${dayStart}-${monthEnd}${dayEnd}-weekly-analysis.md`;
  }
}

// Generate task distribution visualization
export function generateTaskDistribution(
  completed: string[],
  decisions: string[],
  bugs: number,
  features: number
): string {
  const total = completed.length;
  if (total === 0) return 'No tasks recorded';
  
  const categories = [
    { name: 'Features', count: features, char: '🚀' },
    { name: 'Bugs', count: bugs, char: '🐛' },
    { name: 'Decisions', count: decisions.length, char: '🤔' },
    { name: 'Other', count: total - features - bugs - decisions.length, char: '📋' }
  ];
  
  let output = '📊 Task Distribution\n';
  categories.forEach(cat => {
    const percentage = (cat.count / total) * 100;
    const bars = Math.round(percentage / 5);
    output += `${cat.char} ${cat.name.padEnd(10)} ${generateProgressBar(cat.count, total)} ${cat.count}\n`;
  });
  
  return output;
}

// Generate weekly trend indicators
export function generateTrendIndicators(
  currentWeek: any,
  previousWeek?: any
): string {
  let output = '📈 Week-over-Week Trends\n';
  
  if (!previousWeek) {
    output += 'No previous week data for comparison\n';
    return output;
  }
  
  const compare = (current: number, previous: number, metric: string) => {
    const change = ((current - previous) / previous * 100).toFixed(0);
    const arrow = current > previous ? '↑' : current < previous ? '↓' : '→';
    const color = current > previous ? '🟢' : current < previous ? '🔴' : '🟡';
    return `${color} ${metric}: ${current} ${arrow} (${change}%)`;
  };
  
  output += compare(currentWeek.tasks, previousWeek.tasks, 'Tasks') + '\n';
  output += compare(currentWeek.decisions, previousWeek.decisions, 'Decisions') + '\n';
  output += compare(currentWeek.files, previousWeek.files, 'Files') + '\n';
  
  return output;
}