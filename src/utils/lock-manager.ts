/**
 * Lock manager for multi-agent workspace coordination
 * Prevents conflicts when multiple agents try to access workspace
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DEVLOG_PATH } from '../types/devlog.js';

export interface WorkspaceLock {
  agent_id: string;
  session_id: string;
  acquired_at: string;
  expires_at: string;
  last_heartbeat: string;
  pid?: number;
}

const LOCK_FILE = path.join(DEVLOG_PATH, '.mcp', 'workspace.lock');
const LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const STALE_THRESHOLD = 60 * 60 * 1000; // 1 hour - definitely stale

export async function checkLock(): Promise<WorkspaceLock | null> {
  try {
    const lockContent = await fs.readFile(LOCK_FILE, 'utf-8');
    return JSON.parse(lockContent);
  } catch (error) {
    // No lock file means no lock
    return null;
  }
}

export function isLockExpired(lock: WorkspaceLock): boolean {
  const now = Date.now();
  const expiresAt = new Date(lock.expires_at).getTime();
  const lastHeartbeat = new Date(lock.last_heartbeat).getTime();
  
  // Lock is expired if past expiration OR no heartbeat for too long
  return now > expiresAt || (now - lastHeartbeat) > STALE_THRESHOLD;
}

export async function acquireLock(agentId: string, sessionId: string, force = false): Promise<{ success: boolean; error?: string; lock?: WorkspaceLock }> {
  try {
    // Ensure lock directory exists
    await fs.mkdir(path.dirname(LOCK_FILE), { recursive: true });
    
    // Check existing lock
    const existingLock = await checkLock();
    
    if (existingLock && !isLockExpired(existingLock)) {
      if (!force && existingLock.agent_id !== agentId) {
        const minutesLeft = Math.round((new Date(existingLock.expires_at).getTime() - Date.now()) / 60000);
        return {
          success: false,
          error: `Workspace is locked by ${existingLock.agent_id}. Expires in ${minutesLeft} minutes. Use force=true to override.`
        };
      }
    }
    
    // Create new lock
    const now = new Date();
    const newLock: WorkspaceLock = {
      agent_id: agentId,
      session_id: sessionId,
      acquired_at: now.toISOString(),
      expires_at: new Date(now.getTime() + LOCK_TIMEOUT).toISOString(),
      last_heartbeat: now.toISOString(),
      pid: process.pid
    };
    
    // Write lock atomically
    const tempFile = `${LOCK_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(newLock, null, 2));
    await fs.rename(tempFile, LOCK_FILE);
    
    return { success: true, lock: newLock };
  } catch (error) {
    return {
      success: false,
      error: `Failed to acquire lock: ${error}`
    };
  }
}

export async function updateLockHeartbeat(agentId: string): Promise<boolean> {
  try {
    const lock = await checkLock();
    
    if (!lock || lock.agent_id !== agentId) {
      return false;
    }
    
    // Update heartbeat and expiration
    const now = new Date();
    lock.last_heartbeat = now.toISOString();
    lock.expires_at = new Date(now.getTime() + LOCK_TIMEOUT).toISOString();
    
    // Write atomically
    const tempFile = `${LOCK_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(lock, null, 2));
    await fs.rename(tempFile, LOCK_FILE);
    
    return true;
  } catch (error) {
    console.error('Failed to update lock heartbeat:', error);
    return false;
  }
}

export async function releaseLock(agentId: string): Promise<boolean> {
  try {
    const lock = await checkLock();
    
    // Only release if we own it
    if (!lock || lock.agent_id !== agentId) {
      return false;
    }
    
    await fs.unlink(LOCK_FILE);
    return true;
  } catch (error) {
    console.error('Failed to release lock:', error);
    return false;
  }
}

export function formatLockInfo(lock: WorkspaceLock): string {
  const now = Date.now();
  const expiresAt = new Date(lock.expires_at).getTime();
  const minutesLeft = Math.round((expiresAt - now) / 60000);
  const lastHeartbeatAge = Math.round((now - new Date(lock.last_heartbeat).getTime()) / 60000);
  
  return `Agent: ${lock.agent_id}
Session: ${lock.session_id}
Acquired: ${new Date(lock.acquired_at).toLocaleString()}
Expires: ${minutesLeft > 0 ? `in ${minutesLeft} minutes` : 'EXPIRED'}
Last active: ${lastHeartbeatAge} minutes ago
${isLockExpired(lock) ? '⚠️ Lock is stale and can be overridden' : '✅ Lock is active'}`;
}