import { spawn } from 'child_process';
import path from 'path';

const INDEXER_PATH = path.join(process.cwd(), 'scripts', 'chroma-indexer.py');

/**
 * Auto-capture and index Perplexity search results
 */
export async function capturePerplexitySearch(query: string, response: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      INDEXER_PATH,
      '--index-perplexity',
      query,
      response
    ]);

    let stderr = '';
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`[AutoCapture] Failed to index Perplexity search: ${stderr}`);
        // Don't reject - we don't want to break the main flow
        resolve();
      } else {
        console.error(`[AutoCapture] Indexed Perplexity search: "${query}"`);
        resolve();
      }
    });

    python.on('error', (err) => {
      console.error(`[AutoCapture] Error spawning indexer: ${err.message}`);
      resolve();
    });
  });
}

/**
 * Auto-capture and index Jira data
 */
export async function captureJiraData(issueKey: string, data: any): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      // Save to temp file
      const tempFile = `/tmp/jira-autocapture-${Date.now()}.json`;
      const fs = await import('fs/promises');
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));

      const python = spawn('python3', [
        INDEXER_PATH,
        '--index-jira',
        tempFile
      ]);

      python.on('close', async (code) => {
        // Clean up temp file
        try {
          await fs.unlink(tempFile);
        } catch {}
        
        if (code === 0) {
          console.error(`[AutoCapture] Indexed Jira issue: ${issueKey}`);
        }
        resolve();
      });

      python.on('error', () => {
        resolve();
      });
    } catch (err) {
      console.error(`[AutoCapture] Error capturing Jira data: ${err}`);
      resolve();
    }
  });
}

/**
 * Check if auto-capture is enabled (can be controlled via env var)
 */
export function isAutoCaptureEnabled(): boolean {
  return process.env.DISABLE_AUTO_CAPTURE !== 'true';
}