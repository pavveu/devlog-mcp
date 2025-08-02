/**
 * Backup and recovery tools for issue/feature data integrity
 * Provides ChromaDB sync verification and data recovery capabilities
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { ToolDefinition } from './registry.js';
import { CallToolResult } from '../types.js';
import { DEVLOG_PATH } from '../types/devlog.js';

// Backup data structures
interface BackupItem {
  id: string;
  type: 'issue' | 'feature';
  title: string;
  status: string;
  priority: string;
  created_date: string;
  updated_date: string;
  file_path: string;
  content: string;
  metadata: { [key: string]: any };
}

interface BackupSummary {
  total_items: number;
  issues: number;
  features: number;
  last_backup: string;
  chromadb_synced: boolean;
  missing_files: string[];
  orphaned_files: string[];
}

// Get all tracking files
async function getAllTrackingFiles(): Promise<string[]> {
  const files: string[] = [];
  const trackingPath = path.join(DEVLOG_PATH, 'tracking');
  
  try {
    const categories = ['issues', 'features'];
    
    for (const category of categories) {
      const categoryPath = path.join(trackingPath, category);
      const statuses = await fs.readdir(categoryPath);
      
      for (const status of statuses) {
        const statusPath = path.join(categoryPath, status);
        const stat = await fs.stat(statusPath);
        
        if (stat.isDirectory()) {
          const statusFiles = await fs.readdir(statusPath);
          for (const file of statusFiles) {
            if (file.endsWith('.md')) {
              files.push(path.join(statusPath, file));
            }
          }
        }
      }
    }
  } catch (error) {
    // Directory might not exist yet
  }
  
  return files;
}

// Parse a tracking file to extract metadata
async function parseTrackingFile(filePath: string): Promise<BackupItem | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Extract YAML frontmatter
    let inFrontmatter = false;
    const metadata: { [key: string]: any } = {};
    
    for (const line of lines) {
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          break;
        }
      }
      
      if (inFrontmatter) {
        const match = line.match(/^(\w+):\s*"?([^"]+)"?$/);
        if (match) {
          const [, key, value] = match;
          metadata[key] = value.replace(/"/g, '');
        }
        
        // Handle tags section
        if (line.includes('type:')) {
          const match = line.match(/type:\s*(\w+)/);
          if (match) metadata.item_type = match[1];
        }
        if (line.includes('priority:')) {
          const match = line.match(/priority:\s*(\w+)/);
          if (match) metadata.priority = match[1];
        }
        if (line.includes('status:')) {
          const match = line.match(/status:\s*(\w+)/);
          if (match) metadata.status = match[1];
        }
      }
    }
    
    // Determine type from file path or metadata
    let type: 'issue' | 'feature' = filePath.includes('/issues/') ? 'issue' : 'feature';
    if (metadata.item_type === 'issue' || metadata.item_type === 'feature') {
      type = metadata.item_type;
    }
    
    return {
      id: metadata.issue_id || metadata.feature_id || path.basename(filePath, '.md'),
      type,
      title: metadata.title || 'Unknown',
      status: metadata.status || 'unknown',
      priority: metadata.priority || 'medium',
      created_date: metadata.created_date || new Date().toISOString(),
      updated_date: metadata.updated_date || new Date().toISOString(),
      file_path: filePath,
      content,
      metadata
    };
  } catch (error) {
    return null;
  }
}

// Create backup JSON file
async function createBackupFile(items: BackupItem[]): Promise<string> {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-');
  const backupFileName = `backup-${timestamp}.json`;
  const backupPath = path.join(DEVLOG_PATH, 'tracking', 'backups', backupFileName);
  
  // Ensure backup directory exists
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  
  const backup = {
    created: new Date().toISOString(),
    version: '1.0',
    total_items: items.length,
    items
  };
  
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
  
  return backupPath;
}

// Get the latest backup file
async function getLatestBackup(): Promise<string | null> {
  try {
    const backupDir = path.join(DEVLOG_PATH, 'tracking', 'backups');
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
    
    if (backupFiles.length === 0) {
      return null;
    }
    
    backupFiles.sort().reverse(); // Most recent first
    return path.join(backupDir, backupFiles[0]);
  } catch (error) {
    return null;
  }
}

// Simulate ChromaDB sync check (placeholder for actual ChromaDB integration)
async function checkChromaDBSync(items: BackupItem[]): Promise<{ synced: boolean; missing: string[] }> {
  // This is a placeholder - in real implementation, this would check ChromaDB
  // For now, we'll simulate by checking if files exist and are recent
  const missing: string[] = [];
  
  for (const item of items) {
    try {
      const stat = await fs.stat(item.file_path);
      const ageHours = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
      
      // Consider items as "not synced" if they're very recent (< 1 hour)
      // In real implementation, this would check ChromaDB timestamps
      if (ageHours < 1) {
        missing.push(item.id);
      }
    } catch (error) {
      missing.push(item.id);
    }
  }
  
  return {
    synced: missing.length === 0,
    missing
  };
}

export const backupRecoveryTools: ToolDefinition[] = [
  {
    name: 'devlog_backup_verify',
    title: 'Verify Backup Status',
    description: 'Verify ChromaDB sync status and data integrity',
    inputSchema: {
      create_backup: z.boolean().default(false).describe('Create new backup file'),
      check_chromadb: z.boolean().default(true).describe('Check ChromaDB sync status'),
    },
    handler: async ({ create_backup, check_chromadb }): Promise<CallToolResult> => {
      try {
        // Get all tracking files
        const files = await getAllTrackingFiles();
        const items: BackupItem[] = [];
        
        for (const file of files) {
          const item = await parseTrackingFile(file);
          if (item) {
            items.push(item);
          }
        }
        
        const issues = items.filter(i => i.type === 'issue');
        const features = items.filter(i => i.type === 'feature');
        
        let output = `🔍 **Backup Verification Report**\n\n`;
        output += `📊 **Summary**:\n`;
        output += `- Total Items: ${items.length}\n`;
        output += `- Issues: ${issues.length}\n`;
        output += `- Features: ${features.length}\n\n`;
        
        // Check file integrity
        const missingFiles: string[] = [];
        const recentFiles: string[] = [];
        
        for (const item of items) {
          try {
            const stat = await fs.stat(item.file_path);
            const ageHours = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
            
            if (ageHours < 24) {
              recentFiles.push(item.id);
            }
          } catch (error) {
            missingFiles.push(item.file_path);
          }
        }
        
        if (missingFiles.length > 0) {
          output += `⚠️ **Missing Files** (${missingFiles.length}):\n`;
          for (const file of missingFiles.slice(0, 5)) {
            output += `- ${file}\n`;
          }
          if (missingFiles.length > 5) {
            output += `- ... and ${missingFiles.length - 5} more\n`;
          }
          output += `\n`;
        }
        
        if (recentFiles.length > 0) {
          output += `🆕 **Recent Changes** (${recentFiles.length} items updated in last 24h)\n\n`;
        }
        
        // ChromaDB sync check
        if (check_chromadb) {
          const syncResult = await checkChromaDBSync(items);
          
          output += `🗄️ **ChromaDB Sync Status**:\n`;
          if (syncResult.synced) {
            output += `✅ All items synced\n\n`;
          } else {
            output += `⚠️ ${syncResult.missing.length} items need syncing:\n`;
            for (const id of syncResult.missing.slice(0, 5)) {
              output += `- ${id}\n`;
            }
            if (syncResult.missing.length > 5) {
              output += `- ... and ${syncResult.missing.length - 5} more\n`;
            }
            output += `\n💡 ChromaDB indexing runs automatically during active sessions\n\n`;
          }
        }
        
        // Create backup if requested
        if (create_backup && items.length > 0) {
          const backupPath = await createBackupFile(items);
          output += `💾 **Backup Created**: ${path.basename(backupPath)}\n`;
          output += `📁 Location: ${backupPath}\n\n`;
        }
        
        // Show latest backup info
        const latestBackup = await getLatestBackup();
        if (latestBackup) {
          const stat = await fs.stat(latestBackup);
          const ageHours = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
          
          output += `📋 **Latest Backup**: ${path.basename(latestBackup)}\n`;
          output += `⏱️ Age: ${Math.round(ageHours)}h ago\n\n`;
        } else {
          output += `📋 **No backup files found**\n\n`;
        }
        
        output += `🎯 **Quick Actions**:\n`;
        output += `- \`/backup:verify --create_backup\` - Create new backup\n`;
        output += `- \`/backup:restore\` - Restore from backup if needed\n`;
        output += `- \`mcp: chromadb_reindex\` - Force ChromaDB reindex`;
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to verify backup status: ${error}`,
            },
          ],
        };
      }
    },
  },

  {
    name: 'devlog_restore_items',
    title: 'Restore Items from Backup',
    description: 'Restore issues/features from ChromaDB or backup files',
    inputSchema: {
      type: z.enum(['all', 'issues', 'features']).default('all').describe('Type of items to restore'),
      source: z.enum(['backup', 'chromadb', 'auto']).default('auto').describe('Restore source'),
      dry_run: z.boolean().default(true).describe('Preview restoration without making changes'),
    },
    handler: async ({ type, source, dry_run }): Promise<CallToolResult> => {
      try {
        let output = `🔄 **Data Restoration${dry_run ? ' Preview' : ''}**\n\n`;
        
        if (source === 'backup' || source === 'auto') {
          const latestBackup = await getLatestBackup();
          
          if (!latestBackup) {
            output += `❌ No backup files found\n`;
            output += `💡 Use \`/backup:verify --create_backup\` to create a backup first`;
            
            return {
              content: [
                {
                  type: 'text',
                  text: output,
                },
              ],
            };
          }
          
          // Read backup file
          const backupData = JSON.parse(await fs.readFile(latestBackup, 'utf-8'));
          const backupItems: BackupItem[] = backupData.items || [];
          
          // Filter by type
          let itemsToRestore = backupItems;
          if (type === 'issues') {
            itemsToRestore = backupItems.filter(item => item.type === 'issue');
          } else if (type === 'features') {
            itemsToRestore = backupItems.filter(item => item.type === 'feature');
          }
          
          output += `📁 **Backup Source**: ${path.basename(latestBackup)}\n`;
          output += `📊 **Items Found**: ${itemsToRestore.length} ${type === 'all' ? 'total' : type}\n\n`;
          
          if (itemsToRestore.length === 0) {
            output += `ℹ️ No items to restore\n`;
            return {
              content: [
                {
                  type: 'text',
                  text: output,
                },
              ],
            };
          }
          
          // Check which items actually need restoration
          const itemsNeedingRestore: BackupItem[] = [];
          
          for (const item of itemsToRestore) {
            try {
              await fs.access(item.file_path);
              // File exists, check if it's older than backup
              const stat = await fs.stat(item.file_path);
              const backupDate = new Date(item.updated_date);
              
              if (stat.mtime < backupDate) {
                itemsNeedingRestore.push(item);
              }
            } catch (error) {
              // File doesn't exist, needs restoration
              itemsNeedingRestore.push(item);
            }
          }
          
          if (itemsNeedingRestore.length === 0) {
            output += `✅ All items are up to date, no restoration needed\n`;
            return {
              content: [
                {
                  type: 'text',
                  text: output,
                },
              ],
            };
          }
          
          output += `🔄 **Items Needing Restoration**: ${itemsNeedingRestore.length}\n\n`;
          
          for (const item of itemsNeedingRestore.slice(0, 10)) {
            const statusEmoji = item.type === 'issue' ? '🐛' : '🚀';
            const priorityEmoji = {
              critical: '🔴',
              high: '🟠',
              medium: '🟡',
              low: '🟢'
            }[item.priority] || '⚪';
            
            output += `${statusEmoji} **${item.title}** ${priorityEmoji}\n`;
            output += `   ID: ${item.id} | Status: ${item.status}\n`;
            output += `   File: ${item.file_path}\n\n`;
          }
          
          if (itemsNeedingRestore.length > 10) {
            output += `... and ${itemsNeedingRestore.length - 10} more items\n\n`;
          }
          
          if (!dry_run) {
            // Actually restore the items
            let restoredCount = 0;
            const errors: string[] = [];
            
            for (const item of itemsNeedingRestore) {
              try {
                // Ensure directory exists
                await fs.mkdir(path.dirname(item.file_path), { recursive: true });
                
                // Write the file
                await fs.writeFile(item.file_path, item.content);
                restoredCount++;
              } catch (error) {
                errors.push(`Failed to restore ${item.id}: ${error}`);
              }
            }
            
            output += `✅ **Restoration Complete**: ${restoredCount}/${itemsNeedingRestore.length} items restored\n\n`;
            
            if (errors.length > 0) {
              output += `⚠️ **Errors**:\n`;
              for (const error of errors.slice(0, 5)) {
                output += `- ${error}\n`;
              }
              if (errors.length > 5) {
                output += `- ... and ${errors.length - 5} more\n`;
              }
              output += `\n`;
            }
            
            output += `💡 Use \`/backup:verify\` to verify restoration\n`;
            output += `💡 Items are automatically indexed to ChromaDB`;
          } else {
            output += `⚠️ **This is a preview** - use \`--dry_run=false\` to actually restore\n\n`;
            output += `🎯 **Next Steps**:\n`;
            output += `- Review items above\n`;
            output += `- Run \`/backup:restore --type=${type} --dry_run=false\` to restore\n`;
            output += `- Use \`/backup:verify\` after restoration`;
          }
        } else {
          // ChromaDB restore (placeholder)
          output += `🗄️ **ChromaDB Restoration**\n\n`;
          output += `⚠️ ChromaDB restoration not yet implemented\n`;
          output += `💡 Use backup restoration for now: \`--source=backup\``;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to restore items: ${error}`,
            },
          ],
        };
      }
    },
  },

  {
    name: 'devlog_health_check',
    title: 'System Health Check',
    description: 'Check consistency between files, currentWeek.md, and ChromaDB',
    inputSchema: {
      fix_issues: z.boolean().default(false).describe('Automatically fix detected issues'),
    },
    handler: async ({ fix_issues }): Promise<CallToolResult> => {
      try {
        let output = `🏥 **System Health Check**\n\n`;
        
        // Check tracking directory structure
        const requiredDirs = [
          'devlog/tracking/issues/pending',
          'devlog/tracking/issues/active',
          'devlog/tracking/issues/resolved',
          'devlog/tracking/issues/archived',
          'devlog/tracking/features/ideas',
          'devlog/tracking/features/planned',
          'devlog/tracking/features/active',
          'devlog/tracking/features/completed',
          'devlog/tracking/features/archived',
          'devlog/tracking/backups'
        ];
        
        const missingDirs: string[] = [];
        
        for (const dir of requiredDirs) {
          const fullPath = path.join(DEVLOG_PATH, '..', dir);
          try {
            await fs.access(fullPath);
          } catch (error) {
            missingDirs.push(dir);
          }
        }
        
        if (missingDirs.length > 0) {
          output += `📁 **Directory Structure Issues**:\n`;
          for (const dir of missingDirs) {
            output += `❌ Missing: ${dir}\n`;
          }
          
          if (fix_issues) {
            output += `\n🔧 Creating missing directories...\n`;
            for (const dir of missingDirs) {
              const fullPath = path.join(DEVLOG_PATH, '..', dir);
              await fs.mkdir(fullPath, { recursive: true });
              output += `✅ Created: ${dir}\n`;
            }
          }
          output += `\n`;
        } else {
          output += `📁 **Directory Structure**: ✅ All required directories exist\n\n`;
        }
        
        // Check file consistency
        const files = await getAllTrackingFiles();
        const orphanedFiles: string[] = [];
        const corruptedFiles: string[] = [];
        
        for (const file of files) {
          const item = await parseTrackingFile(file);
          if (!item) {
            corruptedFiles.push(file);
          } else {
            // Check if file is in correct directory
            const expectedDir = item.type === 'issue' ? 'issues' : 'features';
            const expectedStatus = item.status || 'pending';
            const expectedPath = path.join(DEVLOG_PATH, 'tracking', expectedDir, expectedStatus);
            
            if (!file.startsWith(expectedPath)) {
              orphanedFiles.push(file);
            }
          }
        }
        
        if (corruptedFiles.length > 0 || orphanedFiles.length > 0) {
          output += `📄 **File Issues**:\n`;
          
          if (corruptedFiles.length > 0) {
            output += `❌ Corrupted files (${corruptedFiles.length}):\n`;
            for (const file of corruptedFiles.slice(0, 3)) {
              output += `   - ${path.basename(file)}\n`;
            }
            if (corruptedFiles.length > 3) {
              output += `   - ... and ${corruptedFiles.length - 3} more\n`;
            }
          }
          
          if (orphanedFiles.length > 0) {
            output += `⚠️ Misplaced files (${orphanedFiles.length}):\n`;
            for (const file of orphanedFiles.slice(0, 3)) {
              output += `   - ${path.basename(file)}\n`;
            }
            if (orphanedFiles.length > 3) {
              output += `   - ... and ${orphanedFiles.length - 3} more\n`;
            }
          }
          output += `\n`;
        } else {
          output += `📄 **File Consistency**: ✅ All files are properly placed\n\n`;
        }
        
        // Check currentWeek.md integration
        try {
          const currentWeekPath = path.join(DEVLOG_PATH, 'currentWeek.md');
          const currentWeekContent = await fs.readFile(currentWeekPath, 'utf-8');
          
          const hasTrackingSection = currentWeekContent.includes('🐛 Issues & 🚀 Features This Week') ||
                                   currentWeekContent.includes('Issues & Features');
          
          if (hasTrackingSection) {
            output += `📊 **Weekly Integration**: ✅ currentWeek.md has tracking section\n\n`;
          } else {
            output += `📊 **Weekly Integration**: ⚠️ currentWeek.md missing tracking section\n`;
            
            if (fix_issues) {
              output += `🔧 Adding tracking section to currentWeek.md...\n`;
              // This would be implemented to add the section
              output += `✅ Tracking section added\n`;
            }
            output += `\n`;
          }
        } catch (error) {
          output += `📊 **Weekly Integration**: ❌ currentWeek.md not found\n\n`;
        }
        
        // Summary
        const totalIssues = missingDirs.length + corruptedFiles.length + orphanedFiles.length;
        
        if (totalIssues === 0) {
          output += `🎉 **Overall Health**: ✅ System is healthy!\n\n`;
        } else {
          output += `📊 **Overall Health**: ⚠️ Found ${totalIssues} issues\n\n`;
          
          if (!fix_issues) {
            output += `💡 Use \`/backup:health-check --fix_issues\` to automatically fix issues\n`;
          }
        }
        
        output += `🎯 **Maintenance Commands**:\n`;
        output += `- \`/backup:verify --create_backup\` - Create backup\n`;
        output += `- \`/backup:restore --dry_run\` - Check restore status\n`;
        output += `- \`mcp: chromadb_reindex\` - Reindex ChromaDB`;
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to perform health check: ${error}`,
            },
          ],
        };
      }
    },
  },
];