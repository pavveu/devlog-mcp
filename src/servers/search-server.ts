#!/usr/bin/env node
/**
 * Search DevLog Server - ChromaDB powered search
 * Provides vector-based semantic search as default
 */

import { createDevlogServer, startServer } from './base-server.js';
import { chromadbTools } from '../tools/chromadb-tools.js';
import { basicTools } from '../tools/basic-tools.js';

// Get ChromaDB search and optionally file-based search as fallback
const searchTools = [
  // Primary: ChromaDB vector search (DEFAULT)
  chromadbTools.find(t => t.name === 'search_universal')!,
  
  // Secondary: Code-specific search (if needed)
  basicTools.find(t => t.name === 'search_devlogs')!
].filter(Boolean);

const config = {
  name: 'devlog-search',
  version: '1.0.0',
  description: 'ChromaDB-powered search for DevLog entries'
};

const server = createDevlogServer(config);

// Start the server
startServer(server, searchTools, config).catch(console.error);