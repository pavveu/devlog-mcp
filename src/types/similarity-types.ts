/**
 * Type definitions for similarity detection features
 */

export interface SimilarityResult {
  file: string;
  score: number;  // 0-1, where 1 is identical
  type: 'semantic' | 'structural' | 'tag-based';
  excerpt: string;
  metadata: {
    title?: string;
    date?: string;
    tags?: string[];
    wordCount?: number;
  };
}

export interface SimilarityOptions {
  threshold?: number;        // Minimum similarity score (default: 0.3)
  maxResults?: number;       // Maximum results to return (default: 10)
  includeTypes?: ('semantic' | 'structural' | 'tag-based')[];
  excludeFiles?: string[];   // Files to exclude from results
  boostRecent?: boolean;     // Boost recent files in scoring
}

export interface TextVector {
  terms: Map<string, number>;  // term -> TF-IDF score
  magnitude: number;           // Vector magnitude for cosine similarity
}

export interface SimilarityIndex {
  documents: Map<string, DocumentIndex>;
  idf: Map<string, number>;    // Inverse document frequency
  lastUpdated: Date;
}

export interface DocumentIndex {
  file: string;
  vector: TextVector;
  tags: string[];
  metadata: {
    title?: string;
    date?: string;
    wordCount: number;
    lastModified: Date;
  };
}

export interface ClusterResult {
  clusterId: string;
  theme: string;
  files: string[];
  commonTags: string[];
  keywords: string[];
}