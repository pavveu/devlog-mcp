/**
 * Text Processing Utilities for Similarity Detection
 * Handles tokenization, stopword removal, and stemming
 */

export class TextProcessor {
  private readonly stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
    'i', 'you', 'we', 'my', 'your', 'their', 'our', 'just', 'now',
    'only', 'very', 'can', 'could', 'would', 'should', 'may', 'might',
    'must', 'shall', 'will', 'do', 'does', 'did', 'done', 'been'
  ]);

  /**
   * Extract meaningful tokens from text
   */
  tokenize(text: string): string[] {
    // Convert to lowercase and extract words
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove stopwords
    return words.filter(word => !this.stopwords.has(word));
  }

  /**
   * Extract n-grams from tokens
   */
  extractNgrams(tokens: string[], n: number = 2): string[] {
    const ngrams: string[] = [];
    
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  /**
   * Simple stemming - just removes common suffixes
   */
  stem(word: string): string {
    // Remove common suffixes
    const suffixes = ['ing', 'ed', 'es', 's', 'ly', 'er', 'est', 'tion', 'ment'];
    
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }
    
    return word;
  }

  /**
   * Extract key phrases using simple heuristics
   */
  extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
    const sentences = text.split(/[.!?]+/);
    const phraseScores = new Map<string, number>();
    
    for (const sentence of sentences) {
      const tokens = this.tokenize(sentence);
      
      // Extract 2-grams and 3-grams
      const bigrams = this.extractNgrams(tokens, 2);
      const trigrams = this.extractNgrams(tokens, 3);
      
      // Score phrases based on frequency
      [...bigrams, ...trigrams].forEach(phrase => {
        phraseScores.set(phrase, (phraseScores.get(phrase) || 0) + 1);
      });
    }
    
    // Return top phrases
    return Array.from(phraseScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([phrase]) => phrase);
  }

  /**
   * Calculate term frequency for tokens
   */
  calculateTermFrequency(tokens: string[]): Map<string, number> {
    const termFreq = new Map<string, number>();
    
    tokens.forEach(token => {
      const stemmed = this.stem(token);
      termFreq.set(stemmed, (termFreq.get(stemmed) || 0) + 1);
    });
    
    // Normalize by total tokens
    const totalTokens = tokens.length;
    termFreq.forEach((count, term) => {
      termFreq.set(term, count / totalTokens);
    });
    
    return termFreq;
  }
}

export const textProcessor = new TextProcessor();