import { promises as fs } from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { parseDevlogContent } from './parsing.js';
import { SearchResult, DEVLOG_PATH } from '../types/devlog.js';

/**
 * Read a devlog file
 */
export async function readDevlogFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Search devlog entries with optional tag filtering
 */
export async function searchDevlogs(
  query: string, 
  type: string = 'all', 
  tagFilters?: Record<string, any>
): Promise<SearchResult[]> {
  const patterns: Record<string, string> = {
    posts: 'posts/**/*.md',
    ideas: 'ideas-to-verify/**/*.md',
    features: 'features/**/*.md',
    insights: 'insights/**/*.md',
    decisions: 'decisions/**/*.md',
    daily: 'daily/**/*.md',
    current: 'current.md',
    all: '**/*.md',
  };
  
  const pattern = patterns[type] || patterns.all;
  const files = globSync(pattern, { cwd: DEVLOG_PATH });
  
  const results: SearchResult[] = [];
  for (const file of files) {
    const content = await readDevlogFile(path.join(DEVLOG_PATH, file));
    if (!content) continue;
    
    const parsed = parseDevlogContent(content);
    
    // Check text content match
    const contentMatch = !query || 
      parsed.content.toLowerCase().includes(query.toLowerCase()) ||
      (parsed.title && parsed.title.toLowerCase().includes(query.toLowerCase()));
    
    // Check tag filters
    let tagMatch = true;
    if (tagFilters && Object.keys(tagFilters).length > 0) {
      for (const [tagKey, tagValue] of Object.entries(tagFilters)) {
        if (!parsed.tags[tagKey]) {
          tagMatch = false;
          break;
        }
        
        // Handle array values
        if (Array.isArray(parsed.tags[tagKey])) {
          if (Array.isArray(tagValue)) {
            tagMatch = tagValue.some(v => parsed.tags[tagKey].includes(v));
          } else {
            tagMatch = parsed.tags[tagKey].includes(tagValue);
          }
        } else {
          tagMatch = parsed.tags[tagKey] === tagValue;
        }
        
        if (!tagMatch) break;
      }
    }
    
    if (contentMatch && tagMatch) {
      results.push({
        file,
        excerpt: parsed.content.substring(0, 200) + '...',
        lastModified: (await fs.stat(path.join(DEVLOG_PATH, file))).mtime,
        fullContent: content,
        parsedContent: parsed.content,
        title: parsed.title,
        date: parsed.date,
        tags: parsed.tags,
        frontmatter: parsed.data
      });
    }
  }
  
  return results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}