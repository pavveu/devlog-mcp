/**
 * Type definitions for AI-powered features
 */

export type TagCategory = 'type' | 'scope' | 'priority' | 'status' | 'technical' | 'effort' | 'complexity';

export interface TagSuggestion {
  tag: string;
  category: TagCategory;
  confidence: number; // 0-1
  reason: string;
}

export interface Tag {
  category: TagCategory;
  value: string;
  score: number;
}

export interface AnalysisResult {
  keyPhrases: string[];
  entities: string[];
  sentiment: number;
  wordCount: number;
  codeBlockCount: number;
}

export interface ProcessedText {
  tokens: string[];
  features: TextFeatures;
  original: string;
}

export interface TextFeatures {
  ngrams: string[];
  entities: string[];
  techTerms: string[];
  codeSignatures: string[];
}

export interface SimilarEntry {
  id: string;
  path: string;
  title: string;
  similarity: number; // 0-1
  matchedSections: MatchedSection[];
  reason: string;
}

export interface MatchedSection {
  original: string;
  match: string;
  score: number;
  type: 'exact' | 'semantic' | 'structural';
}

export interface DuplicateResult {
  isDuplicate: boolean;
  similarity: number;
  confidence: number;
  match?: SimilarEntry;
  suggestion?: string;
}

export interface SummarySection {
  title: string;
  content: string;
  bulletPoints: string[];
  importance: 'critical' | 'high' | 'medium' | 'low';
  relatedEntries: string[];
}

export interface Summary {
  id: string;
  period: string;
  generatedAt: Date;
  sections: SummarySection[];
  executive?: string;
  highlights: string[];
  concerns: string[];
  metrics?: SummaryMetrics;
}

export interface SummaryMetrics {
  featuresCompleted: number;
  featuresInProgress: number;
  blockers: number;
  decisions: number;
  velocity: {
    current: number;
    average: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
}