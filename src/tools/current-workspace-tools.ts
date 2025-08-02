/**
 * Tools for managing current.md workspace file
 * Auto-generate and update current workspace status
 */

import { ToolDefinition } from './registry.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

const DEVLOG_PATH = process.env.DEVLOG_PATH || path.join(process.cwd(), 'devlog');

export const currentWorkspaceTools: ToolDefinition[] = [
  {
    name: 'devlog_regenerate_current',
    title: 'Regenerate Current Workspace',
    description: 'Auto-generate or update current.md based on recent activity',
    inputSchema: {
      type: 'object',
      properties: {
        includeDays: {
          type: 'number',
          default: 7,
          description: 'Days of history to analyze'
        },
        preserveSections: {
          type: 'array',
          items: { type: 'string' },
          description: 'Sections to preserve from existing current.md'
        }
      }
    },
    handler: async ({ includeDays = 7, preserveSections = [] }: any) => {
      try {
        const currentPath = path.join(DEVLOG_PATH, 'current.md');
        
        // Read existing current.md if it exists
        let existingContent = '';
        let existingData: any = {};
        try {
          existingContent = await fs.readFile(currentPath, 'utf-8');
          const parsed = matter(existingContent);
          existingData = parsed.data;
        } catch (err) {
          // File doesn't exist, will create new
        }

        // Analyze recent activity
        const analysis = await analyzeRecentActivity(includeDays);
        
        // Generate new content
        const newContent = await generateCurrentWorkspace(analysis, existingContent, preserveSections);
        
        // Write the file
        await fs.writeFile(currentPath, newContent);
        
        return {
          success: true,
          message: 'Current workspace regenerated successfully',
          stats: {
            inProgress: analysis.inProgress.length,
            recentlyCompleted: analysis.completed.length,
            upcomingTasks: analysis.upcoming.length,
            activeTags: analysis.topTags.length
          },
          path: currentPath
        };
      } catch (error) {
        return {
          error: `Failed to regenerate current.md: ${(error as Error).message}`,
          success: false
        };
      }
    }
  },

  {
    name: 'devlog_update_current_section',
    title: 'Update Current Section',
    description: 'Update a specific section in current.md',
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['focus', 'progress', 'achievements', 'priorities', 'inbox'],
          description: 'Section to update'
        },
        content: {
          type: 'string',
          description: 'New content for the section'
        },
        append: {
          type: 'boolean',
          default: false,
          description: 'Append to existing content instead of replacing'
        }
      },
      required: ['section', 'content']
    },
    handler: async ({ section, content, append = false }: any) => {
      try {
        const currentPath = path.join(DEVLOG_PATH, 'current.md');
        let existingContent = await fs.readFile(currentPath, 'utf-8');
        
        const sectionMap = {
          focus: '## 🎯 Current Focus',
          progress: '## 🚧 In Progress',
          achievements: '## 💭 Recent Achievements',
          priorities: '## ⏭️ Next Implementation Priorities',
          inbox: '## 📥 Inbox'
        };
        
        const sectionHeader = sectionMap[section as keyof typeof sectionMap];
        const updatedContent = updateSection(existingContent, sectionHeader, content, append);
        
        await fs.writeFile(currentPath, updatedContent);
        
        return {
          success: true,
          message: `Updated ${section} section`,
          section,
          action: append ? 'appended' : 'replaced'
        };
      } catch (error) {
        return {
          error: `Failed to update section: ${(error as Error).message}`,
          success: false
        };
      }
    }
  },

  {
    name: 'devlog_analyze_current_status',
    title: 'Analyze Current Status',
    description: 'Analyze current project status from devlog entries',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          default: false,
          description: 'Include detailed analysis'
        }
      }
    },
    handler: async ({ verbose = false }: any) => {
      try {
        const analysis = await analyzeRecentActivity(30);
        
        // Calculate velocity metrics
        const velocity = {
          completedPerWeek: Math.round(analysis.completed.length / 4),
          inProgressTime: calculateAverageInProgressTime(analysis.inProgress),
          blockersCount: analysis.blockers.length,
          momentum: calculateMomentum(analysis)
        };
        
        const summary = {
          overview: {
            totalActive: analysis.inProgress.length + analysis.upcoming.length,
            completed30Days: analysis.completed.length,
            blockedItems: analysis.blockers.length,
            staleItems: analysis.stale.length
          },
          velocity,
          topFocusAreas: analysis.topTags.slice(0, 5),
          recommendations: generateRecommendations(analysis, velocity)
        };
        
        if (verbose) {
          Object.assign(summary, {
            inProgress: analysis.inProgress.map(formatEntry),
            recentlyCompleted: analysis.completed.slice(0, 5).map(formatEntry),
            blockers: analysis.blockers.map(formatEntry),
            staleWork: analysis.stale.map(formatEntry)
          });
        }
        
        return summary;
      } catch (error) {
        return {
          error: `Failed to analyze status: ${(error as Error).message}`
        };
      }
    }
  }
];

// Helper functions
async function analyzeRecentActivity(days: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const files = await glob('**/*.md', { cwd: DEVLOG_PATH });
  const entries = [];
  
  for (const file of files) {
    if (file === 'current.md') continue;
    
    try {
      const filePath = path.join(DEVLOG_PATH, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);
      const stats = await fs.stat(filePath);
      
      entries.push({
        file,
        path: filePath,
        title: parsed.data.title || file,
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        date: parsed.data.date || stats.mtime,
        lastModified: stats.mtime,
        content: parsed.content,
        metadata: parsed.data
      });
    } catch (err) {
      // Skip files with errors
    }
  }
  
  // Categorize entries
  const completed = entries.filter(e => 
    e.tags.includes('status:completed') && new Date(e.lastModified) > cutoffDate
  );
  
  const inProgress = entries.filter(e => 
    e.tags.includes('status:in-progress') || 
    e.tags.includes('status:active')
  );
  
  const upcoming = entries.filter(e => 
    e.tags.includes('status:planned') || 
    e.tags.includes('status:todo')
  );
  
  const blockers = entries.filter(e => 
    e.tags.includes('status:blocked') || 
    e.content.toLowerCase().includes('blocked')
  );
  
  const stale = inProgress.filter(e => {
    const daysSince = (Date.now() - new Date(e.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 7;
  });
  
  // Count tags
  const tagCounts = new Map<string, number>();
  entries.forEach(e => {
    e.tags.forEach(tag => {
      if (!tag.startsWith('status:')) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    });
  });
  
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
  
  return {
    completed,
    inProgress,
    upcoming,
    blockers,
    stale,
    topTags,
    totalEntries: entries.length
  };
}

async function generateCurrentWorkspace(
  analysis: any, 
  existingContent: string, 
  preserveSections: string[]
) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Generate frontmatter
  const frontmatter = {
    title: "Current Workspace",
    date: timestamp,
    agent_id: `agent-${timestamp.replace(/[-:]/g, '')}`,
    last_active: timestamp,
    tags: {
      type: 'session',
      scope: ['active-work'],
      status: 'active'
    }
  };
  
  let content = matter.stringify('', frontmatter);
  content += '\n# Current Workspace\n\n';
  
  // Current Focus
  content += '## 🎯 Current Focus\n';
  if (shouldPreserveSection('focus', preserveSections, existingContent)) {
    content += extractSection(existingContent, '## 🎯 Current Focus', '## 🚧') + '\n\n';
  } else {
    // Auto-generate from in-progress items
    analysis.inProgress.slice(0, 3).forEach((item: any) => {
      content += `- [ ] ${item.title}\n`;
    });
    content += '\n';
  }
  
  // In Progress
  content += '## 🚧 In Progress\n';
  if (shouldPreserveSection('progress', preserveSections, existingContent)) {
    content += extractSection(existingContent, '## 🚧 In Progress', '## 💭') + '\n\n';
  } else {
    // Group by type
    const byType = groupByType(analysis.inProgress);
    Object.entries(byType).forEach(([type, items]: [string, any]) => {
      if (items.length > 0) {
        content += `- **${capitalizeFirst(type)}**: ${items[0].title}`;
        if (items.length > 1) {
          content += ` (+${items.length - 1} more)`;
        }
        content += '\n';
      }
    });
    content += '\n';
  }
  
  // Recent Achievements
  content += '## 💭 Recent Achievements\n';
  analysis.completed.slice(0, 5).forEach((item: any) => {
    const date = new Date(item.lastModified).toISOString().split('T')[0];
    content += `- ✅ ${item.title} (${date})\n`;
  });
  content += '\n';
  
  // Next Priorities
  content += '## ⏭️ Next Implementation Priorities\n';
  if (shouldPreserveSection('priorities', preserveSections, existingContent)) {
    content += extractSection(existingContent, '## ⏭️', '## 📥') + '\n\n';
  } else {
    // Auto-generate from upcoming
    analysis.upcoming.slice(0, 5).forEach((item: any) => {
      content += `- [ ] ${item.title}\n`;
    });
    content += '\n';
  }
  
  // Inbox
  content += '## 📥 Inbox\n';
  if (shouldPreserveSection('inbox', preserveSections, existingContent)) {
    content += extractSection(existingContent, '## 📥 Inbox', '---') + '\n\n';
  } else {
    // Add stale items and blockers
    if (analysis.stale.length > 0) {
      content += `- ${analysis.stale.length} items need attention (>7 days old)\n`;
    }
    if (analysis.blockers.length > 0) {
      content += `- ${analysis.blockers.length} blocked items need resolution\n`;
    }
    content += '\n';
  }
  
  // Stats section
  content += '## 📊 Activity Stats\n';
  content += `- **Completed (7d)**: ${analysis.completed.filter((e: any) => {
    const days = (Date.now() - new Date(e.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length}\n`;
  content += `- **In Progress**: ${analysis.inProgress.length}\n`;
  content += `- **Upcoming**: ${analysis.upcoming.length}\n`;
  content += `- **Top Focus**: ${analysis.topTags.slice(0, 3).map((t: any) => t.tag).join(', ')}\n\n`;
  
  content += '---\n';
  content += `*Last Update: ${timestamp} (auto-generated)*\n`;
  
  return content;
}

function updateSection(content: string, sectionHeader: string, newContent: string, append: boolean) {
  const sectionRegex = new RegExp(`(${sectionHeader}[\\s\\S]*?)(?=##|---)`, 'g');
  const match = content.match(sectionRegex);
  
  if (match) {
    if (append) {
      const updated = match[0].trimEnd() + '\n' + newContent + '\n\n';
      return content.replace(match[0], updated);
    } else {
      const updated = `${sectionHeader}\n${newContent}\n\n`;
      return content.replace(match[0], updated);
    }
  } else {
    // Section doesn't exist, add it
    const insertPoint = content.lastIndexOf('---');
    if (insertPoint > -1) {
      return content.slice(0, insertPoint) + 
             `${sectionHeader}\n${newContent}\n\n` + 
             content.slice(insertPoint);
    }
    return content + `\n${sectionHeader}\n${newContent}\n\n`;
  }
}

function shouldPreserveSection(section: string, preserveList: string[], existingContent: string): boolean {
  return preserveList.includes(section) && existingContent.includes('##');
}

function extractSection(content: string, startPattern: string, endPattern: string): string {
  const startIndex = content.indexOf(startPattern);
  if (startIndex === -1) return '';
  
  const fromStart = content.substring(startIndex + startPattern.length);
  const endMatch = fromStart.match(new RegExp(endPattern));
  
  if (endMatch && endMatch.index !== undefined) {
    return fromStart.substring(0, endMatch.index).trim();
  }
  
  return fromStart.trim();
}

function groupByType(entries: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  entries.forEach(entry => {
    const typeTag = entry.tags.find((t: string) => t.startsWith('type:'));
    const type = typeTag ? typeTag.split(':')[1] : 'other';
    
    if (!groups[type]) groups[type] = [];
    groups[type].push(entry);
  });
  
  return groups;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateAverageInProgressTime(entries: any[]): number {
  if (entries.length === 0) return 0;
  
  const times = entries.map(e => {
    const created = new Date(e.date);
    const now = new Date();
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });
  
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}

function calculateMomentum(analysis: any): string {
  const recentCompleted = analysis.completed.filter((e: any) => {
    const days = (Date.now() - new Date(e.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;
  
  if (recentCompleted > 5) return 'high';
  if (recentCompleted > 2) return 'medium';
  return 'low';
}

function generateRecommendations(analysis: any, velocity: any): string[] {
  const recommendations = [];
  
  if (analysis.blockers.length > 0) {
    recommendations.push(`Resolve ${analysis.blockers.length} blocked items to improve flow`);
  }
  
  if (analysis.stale.length > 3) {
    recommendations.push(`Review ${analysis.stale.length} stale items - archive or update`);
  }
  
  if (velocity.momentum === 'low') {
    recommendations.push('Momentum is low - consider breaking down large tasks');
  }
  
  if (analysis.inProgress.length > 10) {
    recommendations.push('Too many items in progress - consider focusing on fewer tasks');
  }
  
  return recommendations;
}

function formatEntry(entry: any): any {
  return {
    title: entry.title,
    file: entry.file,
    tags: entry.tags,
    lastModified: entry.lastModified,
    daysSince: Math.round((Date.now() - new Date(entry.lastModified).getTime()) / (1000 * 60 * 60 * 24))
  };
}