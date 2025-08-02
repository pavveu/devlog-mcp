#!/usr/bin/env node

// Direct test of compression functionality
import { promises as fs } from 'fs';
import path from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { 
  generateActivityMatrix,
  calculateActiveHours,
  generateActiveHoursVisualization,
  generateActivityClock,
  generateCompressedFilename
} from './dist/esm/tools/compression-enhancements.js';

const DEVLOG_PATH = '/Users/gravity/Documents/WORK/atlassian/bulk/Magic-Bulk-Ai/devlog';

async function testCompression() {
  console.log('🔍 Testing Enhanced Compression Preview\n');
  
  // Week 25: June 23-29, 2025
  const weekStart = new Date('2025-06-23');
  const weekEnd = new Date('2025-06-29');
  
  // Find daily files
  const dailyPattern = path.join(DEVLOG_PATH, 'daily', '*.md');
  const allDailyFiles = globSync(dailyPattern);
  
  const dailyFiles = allDailyFiles.filter(file => {
    const match = path.basename(file).match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) return false;
    
    const fileDate = new Date(match[1]);
    return fileDate >= weekStart && fileDate <= weekEnd;
  });
  
  console.log(`Found ${dailyFiles.length} files for Week 25:`);
  dailyFiles.forEach(f => console.log(`  - ${path.basename(f)}`));
  
  // Extract session data
  const sessions = [];
  for (const file of dailyFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const parsed = matter(content);
    const dateMatch = path.basename(file).match(/^(\d{4}-\d{2}-\d{2})/);
    
    if (dateMatch) {
      const session = {
        file,
        date: new Date(dateMatch[1] + 'T10:00:00'), // Assume 10am if no time
        content: parsed.content,
        frontmatter: parsed.data,
        completedTasks: (parsed.content.match(/- \[x\] .+/g) || []).map(m => m.replace(/- \[x\] /, ''))
      };
      
      // Extract time from filename if available
      const timeMatch = path.basename(file).match(/(\d{2})h(\d{2})/);
      if (timeMatch) {
        session.date.setHours(parseInt(timeMatch[1]));
        session.date.setMinutes(parseInt(timeMatch[2]));
      }
      
      sessions.push(session);
    }
  }
  
  console.log(`\nExtracted ${sessions.length} sessions with ${sessions.reduce((sum, s) => sum + s.completedTasks.length, 0)} total tasks\n`);
  
  // Generate visualizations
  console.log('📊 VISUAL ANALYTICS PREVIEW\n');
  
  console.log(generateActivityClock(sessions));
  console.log(generateActivityMatrix(sessions));
  
  const activeHours = calculateActiveHours(sessions);
  console.log(generateActiveHoursVisualization(activeHours));
  
  // Show new filename format
  const filename = generateCompressedFilename(2025, 25, { start: weekStart, end: weekEnd });
  console.log(`\n📁 New Filename Format: ${filename}`);
  console.log('   (includes month names and date range)\n');
}

testCompression().catch(console.error);