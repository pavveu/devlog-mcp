import { z } from 'zod';
import { ToolDefinition } from './registry.js';
import { searchDevlogs } from '../utils/search.js';
import { CallToolResult } from '../types.js';

// Helper function for analyzing codebase
async function analyzeCodebaseForFeature(feature: string) {
  const results = await searchDevlogs(feature);
  
  return {
    checklist: [
      'Research existing patterns and conventions',
      'Create feature branch from main',
      'Implement core functionality',
      'Add comprehensive tests',
      'Update documentation'
    ],
    conflicts: [],
    components: results.slice(0, 3).map(r => r.file),
    testScenarios: [
      'Unit tests for core logic',
      'Integration tests',
      'Edge case handling',
      'Error scenarios'
    ]
  };
}

export const analysisTools: ToolDefinition[] = [
  {
    name: 'devlog_feature_status',
    title: 'Feature Status',
    description: 'Get current feature implementation status',
    inputSchema: {
      feature: z.string().describe('Feature name to check status'),
    },
    handler: async ({ feature }): Promise<CallToolResult> => {
      // Search for the feature in features directory
      const results = await searchDevlogs(feature, 'features');
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❓ No feature found matching: "${feature}"`,
            },
          ],
        };
      }
      
      // Analyze the most recent entry
      const latest = results[0];
      const content = latest.fullContent || '';
      
      // Determine status
      let status = 'unknown';
      const progress: Array<{ status: string; text: string }> = [];
      
      if (content.includes('✅') || content.includes('completed') || content.includes('implemented')) {
        status = 'completed';
      } else if (content.includes('🚧') || content.includes('in progress') || content.includes('working')) {
        status = 'in_progress';
      } else if (content.includes('📋') || content.includes('planned') || content.includes('todo')) {
        status = 'planned';
      }
      
      // Extract progress items
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.includes('✅')) progress.push({ status: 'done', text: line });
        else if (line.includes('🚧')) progress.push({ status: 'in_progress', text: line });
        else if (line.includes('📋')) progress.push({ status: 'todo', text: line });
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Feature: "${feature}"\nStatus: ${status}\nFile: ${latest.file}\nLast Updated: ${latest.lastModified.toISOString()}\n\n` +
              (progress.length > 0 ? 'Progress:\n' + progress.map(p => p.text).join('\n') : 'No detailed progress found'),
          },
        ],
      };
    }
  },
  
  {
    name: 'devlog_pending',
    title: 'Pending Items',
    description: 'Find stale or incomplete work items',
    inputSchema: {
      staleness: z.enum(['all', 'stale', 'very_stale']).optional().default('all'),
    },
    handler: async ({ staleness }): Promise<CallToolResult> => {
      const results = await searchDevlogs('');
      
      // Filter for incomplete items
      const pending = results.filter(r => {
        const content = r.fullContent?.toLowerCase() || '';
        return content.includes('todo') || 
               content.includes('in progress') ||
               content.includes('pending') ||
               content.includes('🚧') ||
               content.includes('📋');
      });
      
      // Apply staleness filter
      const now = new Date();
      const filtered = pending.filter(p => {
        const daysSinceUpdate = (now.getTime() - p.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        
        switch (staleness) {
          case 'stale':
            return daysSinceUpdate > 7;
          case 'very_stale':
            return daysSinceUpdate > 14;
          default:
            return true;
        }
      });
      
      if (filtered.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ No pending items found (staleness: ${staleness})`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${filtered.length} pending items:\n\n` +
              filtered.map(f => {
                const daysSince = Math.round((now.getTime() - f.lastModified.getTime()) / (1000 * 60 * 60 * 24));
                return `- ${f.file} (${daysSince} days old)\n  ${f.excerpt}`;
              }).join('\n\n'),
          },
        ],
      };
    }
  },
  
  {
    name: 'devlog_velocity_insights',
    title: 'Velocity Insights',
    description: 'Track development productivity patterns and metrics',
    inputSchema: {
      period: z.enum(['day', 'week', 'month']).optional().default('week'),
    },
    handler: async ({ period }): Promise<CallToolResult> => {
      const results = await searchDevlogs('');
      
      // Calculate cutoff date
      const now = new Date();
      const cutoffDate = new Date();
      switch (period) {
        case 'day':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      // Filter by period
      const periodResults = results.filter(r => r.lastModified > cutoffDate);
      
      // Analyze by type
      const byType: Record<string, number> = {};
      const byDay: Record<string, number> = {};
      const completedItems: string[] = [];
      
      periodResults.forEach(r => {
        // Count by type
        const type = r.file.split('/')[0];
        byType[type] = (byType[type] || 0) + 1;
        
        // Count by day
        const day = r.lastModified.toISOString().split('T')[0];
        byDay[day] = (byDay[day] || 0) + 1;
        
        // Track completed items
        const content = r.fullContent || '';
        if (content.includes('✅') || content.includes('completed') || content.includes('implemented')) {
          completedItems.push(r.file);
        }
      });
      
      // Calculate metrics
      const totalItems = periodResults.length;
      const avgPerDay = totalItems / (period === 'day' ? 1 : period === 'week' ? 7 : 30);
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Development Velocity (${period}):\n\n` +
              `Total Items: ${totalItems}\n` +
              `Completed: ${completedItems.length}\n` +
              `Average per day: ${avgPerDay.toFixed(1)}\n\n` +
              `By Type:\n${Object.entries(byType).map(([t, c]) => `  - ${t}: ${c}`).join('\n')}\n\n` +
              `By Day:\n${Object.entries(byDay).sort().map(([d, c]) => `  - ${d}: ${c}`).join('\n')}`,
          },
        ],
      };
    }
  },
  
  {
    name: 'devlog_timeline',
    title: 'Timeline',
    description: 'Generate chronological development history',
    inputSchema: {
      range: z.enum(['week', 'month', 'quarter', 'all']).optional().default('month'),
      format: z.enum(['text', 'json']).optional().default('text'),
    },
    handler: async ({ range, format }): Promise<CallToolResult> => {
      const results = await searchDevlogs('');
      
      // Calculate cutoff date
      const now = new Date();
      const cutoffDate = new Date();
      switch (range) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'all':
          cutoffDate.setFullYear(2000); // Effectively all
          break;
      }
      
      // Filter and sort chronologically
      const timeline = results
        .filter(r => r.lastModified > cutoffDate)
        .sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
      
      if (format === 'json') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(timeline.map(t => ({
                date: t.lastModified.toISOString(),
                file: t.file,
                title: t.title,
                tags: t.tags
              })), null, 2),
            },
          ],
        };
      }
      
      // Group by date
      const grouped: Record<string, typeof timeline> = {};
      timeline.forEach(t => {
        const date = t.lastModified.toISOString().split('T')[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `📅 Development Timeline (${range}):\n\n` +
              Object.entries(grouped).map(([date, items]) => 
                `${date}:\n${items.map(i => `  - ${i.file}${i.title ? ` - ${i.title}` : ''}`).join('\n')}`
              ).join('\n\n'),
          },
        ],
      };
    }
  },
  
  {
    name: 'devlog_test_checklist',
    title: 'Test Checklist',
    description: 'Generate automated test suggestions based on feature and regression history',
    inputSchema: {
      feature: z.string().describe('Feature name to generate test checklist for'),
      format: z.enum(['checklist', 'detailed', 'json']).optional().default('checklist'),
    },
    handler: async ({ feature, format }): Promise<CallToolResult> => {
      // Search for feature and related regressions
      const featureResults = await searchDevlogs(feature, 'features');
      const regressionResults = await searchDevlogs(feature);
      
      const regressions = regressionResults.filter(r => {
        const content = r.fullContent?.toLowerCase() || '';
        return content.includes('broke') || 
               content.includes('regression') || 
               content.includes('bug') ||
               content.includes('failed');
      });
      
      // Generate test checklist
      const checklist = [
        '✅ Unit tests for core functionality',
        '✅ Integration tests with dependent components',
        '✅ Edge case handling',
        '✅ Error scenarios',
        '✅ Performance under load',
      ];
      
      // Add specific tests based on regressions
      if (regressions.length > 0) {
        checklist.push('⚠️ Regression tests:');
        regressions.forEach(r => {
          const content = r.fullContent || '';
          if (content.includes('null')) checklist.push('  - Test null value handling');
          if (content.includes('undefined')) checklist.push('  - Test undefined value handling');
          if (content.includes('performance')) checklist.push('  - Test performance regression');
          if (content.includes('memory')) checklist.push('  - Test memory usage');
        });
      }
      
      if (format === 'json') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                feature,
                checklist,
                regressionCount: regressions.length,
                featureFiles: featureResults.map(f => f.file)
              }, null, 2),
            },
          ],
        };
      }
      
      if (format === 'detailed') {
        return {
          content: [
            {
              type: 'text',
              text: `Test Checklist for "${feature}":\n\n` +
                checklist.join('\n') + '\n\n' +
                `Found ${regressions.length} previous regressions to consider.\n\n` +
                'Detailed test scenarios:\n' +
                '1. Happy path: Normal operation with valid inputs\n' +
                '2. Error handling: Invalid inputs, missing data\n' +
                '3. Edge cases: Boundary values, empty sets\n' +
                '4. Integration: With other system components\n' +
                '5. Performance: Load testing, memory usage',
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Test Checklist for "${feature}":\n\n${checklist.join('\n')}`,
          },
        ],
      };
    }
  }
];