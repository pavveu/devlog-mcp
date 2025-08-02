/**
 * AI Smart Tagger - Main entry point for intelligent tagging
 * Combines pattern matching, taxonomy, and confidence scoring
 */

import { TagSuggestion } from '../types/ai-types.js';
import { PatternMatcher } from './ai-pattern-matcher.js';
import { tagTaxonomy } from './tag-taxonomy.js';
import { confidenceScorer } from './confidence-scorer.js';

export class SmartTagger {
  private patternMatcher: PatternMatcher;

  constructor() {
    this.patternMatcher = new PatternMatcher();
  }

  async analyzeContent(
    content: string,
    options: {
      threshold?: number;
      categories?: string[];
      maxSuggestions?: number;
    } = {}
  ): Promise<{
    suggestions: TagSuggestion[];
    metadata: {
      wordCount: number;
      keyPhrases: string[];
      contentQuality: number;
      analyzedAt: string;
    };
  }> {
    const { 
      threshold = 0.6, 
      categories = [], 
      maxSuggestions = 10 
    } = options;

    // Step 1: Pattern matching
    let suggestions = this.patternMatcher.analyzeContent(content);

    // Step 2: Filter by categories if specified
    if (categories.length > 0) {
      suggestions = suggestions.filter((s: TagSuggestion) => categories.includes(s.category));
    }

    // Step 3: Validate tags against taxonomy
    suggestions = suggestions.filter((s: TagSuggestion) => tagTaxonomy.isValidTag(s.tag));

    // Step 4: Calculate enhanced confidence scores
    suggestions = suggestions.map((suggestion: TagSuggestion) => ({
      ...suggestion,
      confidence: confidenceScorer.calculateConfidence(suggestion, content, suggestions)
    }));

    // Step 5: Adjust for combinations
    suggestions = confidenceScorer.adjustForCombinations(suggestions);

    // Step 6: Filter by threshold and limit
    suggestions = suggestions
      .filter((s: TagSuggestion) => s.confidence >= threshold)
      .sort((a: TagSuggestion, b: TagSuggestion) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    // Step 7: Resolve exclusive conflicts
    suggestions = this.resolveExclusiveConflicts(suggestions);

    // Extract metadata
    const keyPhrases = this.patternMatcher.extractKeyPhrases(content);
    const contentQuality = this.patternMatcher.calculateContentConfidence(content);
    const wordCount = content.split(/\s+/).length;

    return {
      suggestions,
      metadata: {
        wordCount,
        keyPhrases,
        contentQuality,
        analyzedAt: new Date().toISOString()
      }
    };
  }

  private resolveExclusiveConflicts(suggestions: TagSuggestion[]): TagSuggestion[] {
    const resolved: TagSuggestion[] = [];
    const usedExclusiveCategories = new Set<string>();

    // Sort by confidence to prioritize higher confidence tags
    const sorted = [...suggestions].sort((a, b) => b.confidence - a.confidence);

    for (const suggestion of sorted) {
      const tagDef = tagTaxonomy.getTag(suggestion.tag);
      
      if (!tagDef) continue;

      // If it's exclusive and we already have a tag from this category, skip
      if (tagDef.exclusive && usedExclusiveCategories.has(suggestion.category)) {
        continue;
      }

      resolved.push(suggestion);

      if (tagDef.exclusive) {
        usedExclusiveCategories.add(suggestion.category);
      }
    }

    return resolved;
  }

  async improveTags(
    currentTags: string[],
    content: string
  ): Promise<{
    add: TagSuggestion[];
    remove: string[];
    replace: Array<{ old: string; new: TagSuggestion }>;
  }> {
    // Get new suggestions
    const { suggestions } = await this.analyzeContent(content);
    
    // Normalize current tags
    const normalizedCurrent = currentTags
      .map(tag => tagTaxonomy.normalizeTag(tag))
      .filter(Boolean) as string[];

    // Find tags to add (not in current)
    const add = suggestions.filter(
      s => !normalizedCurrent.includes(s.tag)
    );

    // Find tags to remove (low relevance or invalid)
    const remove: string[] = [];
    for (const tag of normalizedCurrent) {
      const stillRelevant = suggestions.some(s => s.tag === tag && s.confidence > 0.4);
      if (!stillRelevant) {
        remove.push(tag);
      }
    }

    // Find tags to replace (better alternatives)
    const replace: Array<{ old: string; new: TagSuggestion }> = [];
    for (const current of normalizedCurrent) {
      const tagDef = tagTaxonomy.getTag(current);
      if (!tagDef || !tagDef.exclusive) continue;

      // Find better alternative in same category
      const betterAlternative = suggestions.find(
        s => s.category === tagDef.category && 
             s.tag !== current && 
             s.confidence > 0.7
      );

      if (betterAlternative) {
        // Only suggest replacement if new tag is significantly better
        const currentSuggestion = suggestions.find(s => s.tag === current);
        if (!currentSuggestion || betterAlternative.confidence > currentSuggestion.confidence + 0.2) {
          replace.push({ old: current, new: betterAlternative });
        }
      }
    }

    return { add, remove, replace };
  }

  async batchAnalyze(
    entries: Array<{ id: string; content: string }>,
    options: {
      threshold?: number;
      progressCallback?: (progress: number) => void;
    } = {}
  ): Promise<Map<string, TagSuggestion[]>> {
    const results = new Map<string, TagSuggestion[]>();
    const total = entries.length;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { suggestions } = await this.analyzeContent(entry.content, options);
      results.set(entry.id, suggestions);

      if (options.progressCallback) {
        options.progressCallback((i + 1) / total);
      }
    }

    return results;
  }

  // Get suggested tags based on partial content (useful for real-time suggestions)
  async getSuggestions(
    partialContent: string,
    existingTags: string[] = []
  ): Promise<string[]> {
    const { suggestions } = await this.analyzeContent(partialContent, { 
      threshold: 0.5,
      maxSuggestions: 5 
    });

    // Filter out existing tags
    const existingSet = new Set(existingTags.map(t => tagTaxonomy.normalizeTag(t)).filter(Boolean));
    
    return suggestions
      .filter(s => !existingSet.has(s.tag))
      .map(s => s.tag);
  }
}

// Export singleton instance
export const smartTagger = new SmartTagger();