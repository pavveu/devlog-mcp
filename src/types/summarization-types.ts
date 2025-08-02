/**
 * Type definitions for auto-summarization features
 */

export interface SummarizationOptions {
  maxLength?: number;        // Maximum summary length in words
  style?: 'bullets' | 'paragraph' | 'structured';
  extractive?: boolean;      // Use extractive (true) or abstractive (false) 
  includeMetadata?: boolean; // Include title, tags, dates
  focusOn?: string[];        // Keywords to prioritize
}

export interface Summary {
  text: string;
  style: 'bullets' | 'paragraph' | 'structured';
  metadata?: {
    title?: string;
    date?: string;
    tags?: string[];
    wordCount: number;
    compressionRatio: number;
  };
  keyPoints?: string[];
  keywords?: string[];
}

export interface ChunkSummary {
  chunkId: number;
  summary: string;
  importance: number;
  sentences: SentenceScore[];
}

export interface SentenceScore {
  text: string;
  score: number;
  position: number;
  features: {
    titleSimilarity: number;
    hasKeywords: boolean;
    isFirstOrLast: boolean;
    length: number;
    hasNumbers: boolean;
    hasActionWords: boolean;
  };
}

export interface BatchSummaryResult {
  file: string;
  summary: Summary;
  processingTime: number;
}

export interface TimelineSummary {
  period: string;
  entries: number;
  highlights: string[];
  themes: string[];
  progress: {
    completed: string[];
    inProgress: string[];
    planned: string[];
  };
}