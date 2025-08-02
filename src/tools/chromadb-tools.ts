import { z } from 'zod';
import { ToolDefinition } from './registry.js';
import { CallToolResult } from '../types.js';
import { spawn } from 'child_process';
import path from 'path';

// Path to the Python ChromaDB indexer
const INDEXER_PATH = path.join(process.cwd(), 'scripts', 'chromadb-smart-index.py');

/**
 * Execute Python ChromaDB script and return results
 */
async function runChromaCommand(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [INDEXER_PATH, ...args]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ChromaDB command failed: ${stderr}`));
      } else {
        // Parse the output to extract search results
        const lines = stdout.split('\n');
        const results = [];
        let inResults = false;
        
        for (const line of lines) {
          if (line.includes('Search results for:')) {
            inResults = true;
            continue;
          }
          if (inResults && line.trim() && !line.includes('===')) {
            // Parse result lines
            if (line.match(/^\d+\./)) {
              const result = {
                file: '',
                source: '',
                type: '',
                relevance: '',
                preview: ''
              };
              
              // Extract file path
              const fileMatch = line.match(/\d+\.\s+(.+)/);
              if (fileMatch) result.file = fileMatch[1];
              
              results.push(result);
            } else if (line.includes('Source:')) {
              const last = results[results.length - 1];
              if (last) last.source = line.replace('Source:', '').trim();
            } else if (line.includes('Type:')) {
              const last = results[results.length - 1];
              if (last) last.type = line.replace('Type:', '').trim();
            } else if (line.includes('Relevance:')) {
              const last = results[results.length - 1];
              if (last) last.relevance = line.replace('Relevance:', '').trim();
            } else if (line.includes('Preview:')) {
              const last = results[results.length - 1];
              if (last) last.preview = line.replace('Preview:', '').trim();
            }
          }
        }
        
        resolve({
          success: true,
          results: results,
          raw: stdout
        });
      }
    });
  });
}

export const chromadbTools: ToolDefinition[] = [
  {
    name: 'search_universal',
    title: 'Universal Search',
    description: 'Search across all indexed content using ChromaDB (devlog, Jira, Perplexity)',
    inputSchema: {
      query: z.string().describe('Search query'),
      source: z.enum(['all', 'devlog', 'jira', 'perplexity']).optional().describe('Filter by source'),
      limit: z.number().default(5).describe('Number of results')
    },
    handler: async ({ query, source, limit = 5 }): Promise<CallToolResult> => {
      try {
        const args = ['--search', query];
        if (source && source !== 'all') {
          args.push('--source', source);
        }
        
        const result = await runChromaCommand(args);
        
        return {
          content: [{
            type: 'text',
            text: `Found ${result.results.length} results for "${query}":\n\n` +
              result.results.map((r: any, i: number) => 
                `${i + 1}. ${r.file}\n   Source: ${r.source}\n   Type: ${r.type}\n   Relevance: ${r.relevance}\n   Preview: ${r.preview}`
              ).join('\n\n')
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error searching ChromaDB: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },
  
  {
    name: 'index_content',
    title: 'Index Content',
    description: 'Index new content into ChromaDB',
    inputSchema: {
      type: z.enum(['perplexity', 'jira']).describe('Type of content to index'),
      query: z.string().describe('Query (for Perplexity) or issue key (for Jira)'),
      content: z.string().describe('Content to index'),
      metadata: z.object({}).optional().describe('Additional metadata')
    },
    handler: async ({ type, query, content, metadata = {} }): Promise<CallToolResult> => {
      try {
        if (type === 'perplexity') {
          const args = ['--index-perplexity', query, content];
          await runChromaCommand(args);
          return {
            content: [{
              type: 'text',
              text: `Successfully indexed Perplexity search: "${query}"`
            }]
          };
        } else if (type === 'jira') {
          // Save Jira content to temp file then index
          const tempFile = `/tmp/jira-${Date.now()}.json`;
          const fs = await import('fs/promises');
          await fs.writeFile(tempFile, content);
          
          const args = ['--index-jira', tempFile];
          await runChromaCommand(args);
          
          // Clean up temp file
          await fs.unlink(tempFile);
          
          return {
            content: [{
              type: 'text',
              text: `Successfully indexed Jira issue: ${query}`
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Unknown content type: ${type}`
          }],
          isError: true
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error indexing content: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },
  
  {
    name: 'chromadb_reindex',
    title: 'Reindex ChromaDB',
    description: 'Reindex all devlog files (incremental by default)',
    inputSchema: {
      full: z.boolean().default(false).describe('Perform full reindex (delete and recreate)')
    },
    handler: async ({ full = false }): Promise<CallToolResult> => {
      try {
        const args = full ? ['--full'] : [];
        const result = await runChromaCommand(args);
        
        // Extract indexing stats from output
        const match = result.raw.match(/Total files: (\d+)\nIndexed: (\d+)\nCollection size: (\d+)/);
        if (match) {
          return {
            content: [{
              type: 'text',
              text: `Reindexing complete:\n- Total files: ${match[1]}\n- Indexed: ${match[2]}\n- Collection size: ${match[3]} documents`
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: 'Reindexing complete'
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error reindexing: ${error.message}`
          }],
          isError: true
        };
      }
    }
  }
];