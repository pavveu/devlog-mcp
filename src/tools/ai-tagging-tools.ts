/**
 * MCP Tool Definitions for AI Tagging
 * Integrates smart tagging into the DevLog MCP server
 */

import { ToolDefinition } from './registry.js';
import { smartTagger } from './ai-smart-tagger.js';
import { tagTaxonomy } from './tag-taxonomy.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

export const aiTaggingTools: ToolDefinition[] = [
  {
    name: 'devlog_auto_tag',
    title: 'Auto Tag Content',
    description: 'Automatically suggest tags for devlog content',
    inputSchema: {
      type: 'object',
      properties: {
        content: { 
          type: 'string', 
          description: 'Devlog content to analyze' 
        },
        threshold: { 
          type: 'number', 
          default: 0.6, 
          description: 'Confidence threshold (0-1)' 
        },
        categories: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Specific categories to focus on'
        },
        existingTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Current tags to improve upon'
        }
      },
      required: ['content']
    },
    handler: async ({ content, threshold = 0.6, categories, existingTags }: any) => {
      try {
        const result = await smartTagger.analyzeContent(content, {
          threshold,
          categories,
          maxSuggestions: 15
        });

        // If existing tags provided, also suggest improvements
        let improvements = null;
        if (existingTags && existingTags.length > 0) {
          improvements = await smartTagger.improveTags(existingTags, content);
        }

        return {
          suggestions: result.suggestions,
          metadata: result.metadata,
          improvements,
          summary: {
            totalSuggestions: result.suggestions.length,
            highConfidence: result.suggestions.filter((s: any) => s.confidence > 0.8).length,
            categories: [...new Set(result.suggestions.map((s: any) => s.category))]
          }
        };
      } catch (error) {
        return {
          error: `Failed to analyze content: ${(error as Error).message}`,
          suggestions: []
        };
      }
    }
  },

  {
    name: 'devlog_validate_tags',
    title: 'Validate Tags',
    description: 'Validate tags against the taxonomy',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to validate'
        }
      },
      required: ['tags']
    },
    handler: async ({ tags }: any) => {
      const validation = tagTaxonomy.validateTags(tags);
      
      return {
        valid: validation.valid,
        invalid: validation.invalid,
        conflicts: validation.conflicts,
        normalized: tags.map((tag: string) => ({
          original: tag,
          normalized: tagTaxonomy.normalizeTag(tag) || tag,
          isValid: tagTaxonomy.isValidTag(tag)
        })),
        suggestions: validation.invalid.map((tag: string) => ({
          invalid: tag,
          suggestions: tagTaxonomy.suggestTags(tag).slice(0, 3)
        }))
      };
    }
  },

  {
    name: 'devlog_tag_batch',
    title: 'Batch Tag Analysis',
    description: 'Analyze and tag multiple devlog entries',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Directory containing devlog files',
          default: 'devlog'
        },
        pattern: {
          type: 'string',
          description: 'File pattern to match (glob)',
          default: '**/*.md'
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview changes without applying',
          default: true
        },
        threshold: {
          type: 'number',
          description: 'Confidence threshold',
          default: 0.7
        }
      }
    },
    handler: async ({ directory = 'devlog', pattern = '**/*.md', dryRun = true, threshold = 0.7 }: any) => {
      const glob = (await import('glob')).glob;
      const files = await glob(pattern, { cwd: directory });
      
      const results = {
        processed: 0,
        updated: 0,
        errors: 0,
        files: [] as any[]
      };

      for (const file of files) {
        try {
          const filePath = path.join(directory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = matter(content);
          
          // Skip if no content
          if (!parsed.content.trim()) continue;

          // Get current tags
          const currentTags = Array.isArray(parsed.data.tags) 
            ? parsed.data.tags 
            : (parsed.data.tags ? [parsed.data.tags] : []);

          // Analyze content
          const result = await smartTagger.analyzeContent(parsed.content, { threshold });
          
          // Get tags to add
          const newTags = result.suggestions
            .filter((s: any) => !currentTags.includes(s.tag))
            .map((s: any) => s.tag);

          if (newTags.length > 0) {
            const updatedTags = [...new Set([...currentTags, ...newTags])];
            
            if (!dryRun) {
              // Update file
              parsed.data.tags = updatedTags;
              const updated = matter.stringify(parsed.content, parsed.data);
              await fs.writeFile(filePath, updated);
              results.updated++;
            }

            results.files.push({
              path: file,
              currentTags,
              suggestedTags: newTags,
              allTags: updatedTags,
              applied: !dryRun
            });
          }

          results.processed++;
        } catch (error) {
          results.errors++;
          results.files.push({
            path: file,
            error: (error as Error).message
          });
        }
      }

      return {
        ...results,
        summary: `Processed ${results.processed} files, ${results.updated} updated, ${results.errors} errors`,
        dryRun
      };
    }
  },

  {
    name: 'devlog_tag_stats',
    title: 'Tag Statistics',
    description: 'Get statistics about tag usage',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Directory to analyze',
          default: 'devlog'
        }
      }
    },
    handler: async ({ directory = 'devlog' }: any) => {
      const glob = (await import('glob')).glob;
      const files = await glob('**/*.md', { cwd: directory });
      
      const tagCounts = new Map<string, number>();
      const categoryCounts = new Map<string, number>();
      const coOccurrence = new Map<string, Map<string, number>>();
      
      let totalFiles = 0;
      let taggedFiles = 0;

      for (const file of files) {
        try {
          const filePath = path.join(directory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = matter(content);
          
          totalFiles++;
          
          const tags = Array.isArray(parsed.data.tags) 
            ? parsed.data.tags 
            : (parsed.data.tags ? [parsed.data.tags] : []);

          if (tags.length > 0) {
            taggedFiles++;
            
            // Count tags and categories
            tags.forEach(tag => {
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
              
              const tagDef = tagTaxonomy.getTag(tag);
              if (tagDef) {
                categoryCounts.set(tagDef.category, (categoryCounts.get(tagDef.category) || 0) + 1);
              }
            });

            // Track co-occurrence
            for (let i = 0; i < tags.length; i++) {
              for (let j = i + 1; j < tags.length; j++) {
                const tag1 = tags[i];
                const tag2 = tags[j];
                
                if (!coOccurrence.has(tag1)) {
                  coOccurrence.set(tag1, new Map());
                }
                const tag1Map = coOccurrence.get(tag1)!;
                tag1Map.set(tag2, (tag1Map.get(tag2) || 0) + 1);
              }
            }
          }
        } catch (error) {
          // Skip files with errors
        }
      }

      // Convert maps to sorted arrays
      const topTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count, percentage: (count / taggedFiles * 100).toFixed(1) }));

      const categoryStats = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));

      // Find most common tag pairs
      const tagPairs: Array<{ tags: string[], count: number }> = [];
      coOccurrence.forEach((map, tag1) => {
        map.forEach((count, tag2) => {
          tagPairs.push({ tags: [tag1, tag2], count });
        });
      });
      
      const topPairs = tagPairs
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        summary: {
          totalFiles,
          taggedFiles,
          coveragePercent: (taggedFiles / totalFiles * 100).toFixed(1),
          uniqueTags: tagCounts.size,
          avgTagsPerFile: (Array.from(tagCounts.values()).reduce((a, b) => a + b, 0) / taggedFiles).toFixed(1)
        },
        topTags,
        categoryStats,
        topTagPairs: topPairs,
        recommendations: generateTagRecommendations(tagCounts, taggedFiles)
      };
    }
  },

  {
    name: 'devlog_suggest_tags',
    title: 'Suggest Tags',
    description: 'Get real-time tag suggestions for partial content',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Partial content being written'
        },
        existingTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Already selected tags'
        }
      },
      required: ['content']
    },
    handler: async ({ content, existingTags = [] }: any) => {
      const suggestions = await smartTagger.getSuggestions(content, existingTags);
      
      // Get tag definitions for rich display
      const enrichedSuggestions = suggestions.map((tag: string) => {
        const def = tagTaxonomy.getTag(tag);
        return {
          tag,
          category: def?.category,
          description: def?.description,
          exclusive: def?.exclusive
        };
      });

      return {
        suggestions: enrichedSuggestions,
        hint: content.length < 50 ? 'Type more content for better suggestions' : null
      };
    }
  }
];

function generateTagRecommendations(tagCounts: Map<string, number>, totalFiles: number): string[] {
  const recommendations: string[] = [];
  
  // Check for underused important tags
  const importantTags = ['type:', 'priority:', 'status:'];
  importantTags.forEach(prefix => {
    const count = Array.from(tagCounts.keys())
      .filter(tag => tag.startsWith(prefix))
      .reduce((sum, tag) => sum + (tagCounts.get(tag) || 0), 0);
    
    const coverage = count / totalFiles;
    if (coverage < 0.5) {
      recommendations.push(`Consider adding more ${prefix} tags - only ${(coverage * 100).toFixed(0)}% coverage`);
    }
  });

  // Check for inconsistent tagging
  const typeVariants = ['bug', 'bugfix', 'fix', 'type:bugfix'];
  const variantCounts = typeVariants.map(v => tagCounts.get(v) || 0);
  if (variantCounts.filter(c => c > 0).length > 1) {
    recommendations.push('Inconsistent bug tagging detected - standardize on "type:bugfix"');
  }

  // Suggest effort tracking
  const effortTags = Array.from(tagCounts.keys()).filter(tag => tag.startsWith('effort:'));
  if (effortTags.length === 0) {
    recommendations.push('No effort tracking tags found - consider adding effort: tags for time tracking');
  }

  return recommendations;
}