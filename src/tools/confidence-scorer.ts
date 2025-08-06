/**
 * Confidence Scoring System for Tag Suggestions
 * Calculates confidence based on multiple factors
 */

import { TagSuggestion } from '../types/ai-types.js';

interface ScoreFactors {
  patternMatchStrength: number;  // How well the pattern matched
  contextRelevance: number;      // How relevant the surrounding context is
  tagFrequency: number;          // How common this tag is in similar content
  contentQuality: number;        // Quality of the content being analyzed
  multipleIndicators: number;    // Bonus for multiple matching indicators
}

export class ConfidenceScorer {
  private readonly baseWeights = {
    patternMatchStrength: 0.35,
    contextRelevance: 0.25,
    tagFrequency: 0.15,
    contentQuality: 0.15,
    multipleIndicators: 0.10
  };

  calculateConfidence(
    suggestion: TagSuggestion,
    content: string,
    allSuggestions: TagSuggestion[]
  ): number {
    const factors = this.analyzeFactors(suggestion, content, allSuggestions);
    
    // Weighted average
    let confidence = 0;
    Object.entries(this.baseWeights).forEach(([factor, weight]) => {
      confidence += factors[factor as keyof ScoreFactors] * weight;
    });

    // Apply category-specific adjustments
    confidence = this.applyCategoryAdjustments(suggestion, confidence);

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  private analyzeFactors(
    suggestion: TagSuggestion,
    content: string,
    allSuggestions: TagSuggestion[]
  ): ScoreFactors {
    return {
      patternMatchStrength: this.calculatePatternStrength(suggestion, content),
      contextRelevance: this.calculateContextRelevance(suggestion, content),
      tagFrequency: this.calculateTagFrequency(suggestion),
      contentQuality: this.calculateContentQuality(content),
      multipleIndicators: this.calculateMultipleIndicators(suggestion, allSuggestions)
    };
  }

  private calculatePatternStrength(suggestion: TagSuggestion, content: string): number {
    // Extract the matched portion from the reason
    const matchedText = suggestion.reason.match(/Detected "(.+)" in content/)?.[1] || '';
    if (!matchedText) return 0.5;

    const contentLower = content.toLowerCase();
    const matchLower = matchedText.toLowerCase();
    
    let strength = 0.7; // Base strength for any match

    // Exact match bonus
    if (contentLower.includes(matchLower)) {
      strength += 0.1;
    }

    // Position bonus (earlier matches are stronger)
    const position = contentLower.indexOf(matchLower);
    if (position !== -1) {
      const relativePosition = position / content.length;
      if (relativePosition < 0.2) strength += 0.15; // In first 20%
      else if (relativePosition < 0.5) strength += 0.05; // In first half
    }

    // Match in title/header bonus
    const lines = content.split('\n');
    const firstFewLines = lines.slice(0, 5).join(' ').toLowerCase();
    if (firstFewLines.includes(matchLower)) {
      strength += 0.1;
    }

    return strength;
  }

  private calculateContextRelevance(suggestion: TagSuggestion, content: string): number {
    let relevance = 0.5; // Base relevance

    // Check for related keywords based on tag category
    const relatedKeywords = this.getRelatedKeywords(suggestion);
    const contentLower = content.toLowerCase();
    
    let matchCount = 0;
    relatedKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        matchCount++;
      }
    });

    // Increase relevance based on related keyword matches
    relevance += Math.min(0.4, matchCount * 0.1);

    // Check for conflicting indicators
    const conflictingKeywords = this.getConflictingKeywords(suggestion);
    let conflictCount = 0;
    conflictingKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        conflictCount++;
      }
    });

    // Decrease relevance for conflicts
    relevance -= Math.min(0.3, conflictCount * 0.1);

    return Math.max(0, relevance);
  }

  private calculateTagFrequency(suggestion: TagSuggestion): number {
    // In a real implementation, this would check historical data
    // For now, use common tag patterns
    const commonTags = [
      'type:feature', 'type:bugfix', 'status:completed', 
      'priority:medium', 'complexity:medium'
    ];
    
    const veryCommonTags = ['ui', 'api', 'documentation'];
    
    if (veryCommonTags.includes(suggestion.tag)) {
      return 0.9;
    } else if (commonTags.includes(suggestion.tag)) {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private calculateContentQuality(content: string): number {
    let quality = 0.5; // Base quality

    const wordCount = content.split(/\s+/).length;
    
    // Length indicators
    if (wordCount > 50) quality += 0.1;
    if (wordCount > 200) quality += 0.1;
    if (wordCount > 500) quality += 0.05;
    
    // Structure indicators
    if (content.includes('##')) quality += 0.1; // Has headers
    if (content.includes('- ') || content.includes('* ')) quality += 0.05; // Has lists
    if (content.includes('```')) quality += 0.1; // Has code blocks
    
    // Formatting indicators
    if (content.match(/^\d+\./m)) quality += 0.05; // Numbered lists
    if (content.includes('**') || content.includes('*')) quality += 0.05; // Emphasis
    
    return Math.min(1, quality);
  }

  private calculateMultipleIndicators(
    suggestion: TagSuggestion,
    allSuggestions: TagSuggestion[]
  ): number {
    // Check for supporting tags
    const supportingPatterns: Record<string, string[]> = {
      'type:feature': ['status:planning', 'status:active', 'complexity:high'],
      'type:bugfix': ['priority:high', 'status:active'],
      'status:completed': ['type:feature', 'type:bugfix'],
      'priority:high': ['type:bugfix', 'status:active'],
      'complexity:high': ['effort:1w', 'effort:2w+']
    };

    const supporting = supportingPatterns[suggestion.tag] || [];
    const otherTags = allSuggestions
      .filter(s => s.tag !== suggestion.tag)
      .map(s => s.tag);

    let matchCount = 0;
    supporting.forEach(supportTag => {
      if (otherTags.includes(supportTag)) {
        matchCount++;
      }
    });

    // Convert to 0-1 scale
    return Math.min(1, matchCount * 0.3);
  }

  private applyCategoryAdjustments(suggestion: TagSuggestion, baseConfidence: number): number {
    let adjusted = baseConfidence;

    // Category-specific adjustments
    switch (suggestion.category) {
      case 'type':
        // Type tags are usually more certain
        adjusted *= 1.1;
        break;
      case 'effort':
        // Effort is harder to determine accurately
        adjusted *= 0.85;
        break;
      case 'priority':
        // Priority can be subjective
        adjusted *= 0.9;
        break;
      case 'status':
        // Status is usually clear
        adjusted *= 1.05;
        break;
    }

    return adjusted;
  }

  private getRelatedKeywords(suggestion: TagSuggestion): string[] {
    const keywordMap: Record<string, string[]> = {
      'type:feature': ['implement', 'add', 'new', 'feature', 'functionality'],
      'type:bugfix': ['fix', 'bug', 'issue', 'problem', 'error', 'resolve'],
      'type:research': ['research', 'investigate', 'explore', 'analyze', 'study'],
      'priority:high': ['urgent', 'critical', 'important', 'asap', 'blocker'],
      'status:completed': ['done', 'finished', 'completed', 'merged', 'deployed'],
      'complexity:high': ['complex', 'difficult', 'challenging', 'intricate'],
      'ui': ['interface', 'frontend', 'component', 'design', 'layout'],
      'api': ['endpoint', 'service', 'backend', 'request', 'response']
    };

    return keywordMap[suggestion.tag] || [];
  }

  private getConflictingKeywords(suggestion: TagSuggestion): string[] {
    const conflictMap: Record<string, string[]> = {
      'type:feature': ['bug', 'fix', 'issue', 'problem'],
      'type:bugfix': ['new feature', 'implement', 'add new'],
      'status:completed': ['in progress', 'working on', 'started', 'planning'],
      'priority:high': ['low priority', 'nice to have', 'when possible'],
      'complexity:low': ['complex', 'difficult', 'challenging'],
      'complexity:high': ['simple', 'easy', 'trivial', 'straightforward']
    };

    return conflictMap[suggestion.tag] || [];
  }

  // Adjust confidence based on tag combinations
  adjustForCombinations(suggestions: TagSuggestion[]): TagSuggestion[] {
    return suggestions.map(suggestion => {
      let adjustedConfidence = suggestion.confidence;

      // Check for logical inconsistencies
      const hasConflict = this.detectConflicts(suggestion, suggestions);
      if (hasConflict) {
        adjustedConfidence *= 0.7;
      }

      // Check for reinforcing combinations
      const hasSupport = this.detectSupport(suggestion, suggestions);
      if (hasSupport) {
        adjustedConfidence *= 1.15;
      }

      return {
        ...suggestion,
        confidence: Math.max(0, Math.min(1, adjustedConfidence))
      };
    });
  }

  private detectConflicts(target: TagSuggestion, all: TagSuggestion[]): boolean {
    const conflicts: Record<string, string[]> = {
      'type:feature': ['type:bugfix', 'type:research'],
      'status:completed': ['status:active', 'status:planning', 'status:blocked'],
      'priority:high': ['priority:low', 'priority:medium'],
      'complexity:high': ['complexity:low', 'complexity:trivial']
    };

    const conflictingTags = conflicts[target.tag] || [];
    return all.some(s => conflictingTags.includes(s.tag) && s.confidence > 0.5);
  }

  private detectSupport(target: TagSuggestion, all: TagSuggestion[]): boolean {
    const supportMap: Record<string, string[]> = {
      'type:bugfix': ['priority:high', 'status:active'],
      'complexity:high': ['effort:1w', 'effort:2w+', 'type:feature'],
      'status:blocked': ['priority:high'],
      'type:research': ['complexity:high', 'effort:1w']
    };

    const supportingTags = supportMap[target.tag] || [];
    return all.some(s => supportingTags.includes(s.tag) && s.confidence > 0.6);
  }
}

// Export singleton instance
export const confidenceScorer = new ConfidenceScorer();