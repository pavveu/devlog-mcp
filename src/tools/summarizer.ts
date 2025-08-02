/**
 * Auto-Summarization Engine
 * Implements extractive summarization using sentence ranking
 */

import { 
  Summary, 
  SummarizationOptions, 
  SentenceScore,
  ChunkSummary 
} from '../types/summarization-types.js';
import { textProcessor } from './text-processor.js';

export class Summarizer {
  private readonly actionWords = new Set([
    'implement', 'create', 'build', 'develop', 'fix', 'add', 'update',
    'refactor', 'optimize', 'integrate', 'deploy', 'test', 'debug',
    'complete', 'finish', 'start', 'begin', 'plan', 'design', 'review'
  ]);

  /**
   * Generate a summary of the content
   */
  async summarize(
    content: string, 
    options: SummarizationOptions = {}
  ): Promise<Summary> {
    const {
      maxLength = 100,
      style = 'paragraph',
      extractive = true,
      includeMetadata = true,
      focusOn = []
    } = options;

    // For now, we only support extractive summarization
    if (!extractive) {
      throw new Error('Abstractive summarization not yet implemented');
    }

    // Extract sentences and score them
    const sentences = this.extractSentences(content);
    const scoredSentences = this.scoreSentences(sentences, content, focusOn);
    
    // Select top sentences
    const selectedSentences = this.selectTopSentences(scoredSentences, maxLength);
    
    // Format summary based on style
    const summaryText = this.formatSummary(selectedSentences, style);
    
    // Extract key points and keywords
    const keyPoints = this.extractKeyPoints(selectedSentences);
    const keywords = textProcessor.extractKeyPhrases(content, 10);
    
    // Calculate metrics
    const originalWords = content.split(/\s+/).length;
    const summaryWords = summaryText.split(/\s+/).length;
    const compressionRatio = summaryWords / originalWords;

    return {
      text: summaryText,
      style,
      metadata: includeMetadata ? {
        wordCount: summaryWords,
        compressionRatio
      } : undefined,
      keyPoints,
      keywords
    };
  }

  /**
   * Summarize content in chunks for long documents
   */
  async summarizeInChunks(
    content: string,
    chunkSize: number = 1000,
    options: SummarizationOptions = {}
  ): Promise<ChunkSummary[]> {
    const chunks = this.splitIntoChunks(content, chunkSize);
    const chunkSummaries: ChunkSummary[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const sentences = this.extractSentences(chunks[i]);
      const scoredSentences = this.scoreSentences(sentences, chunks[i], options.focusOn || []);
      
      // Take top 3-5 sentences per chunk
      const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(5, Math.ceil(sentences.length * 0.3)));

      chunkSummaries.push({
        chunkId: i,
        summary: topSentences.map(s => s.text).join(' '),
        importance: this.calculateChunkImportance(scoredSentences),
        sentences: topSentences
      });
    }

    return chunkSummaries;
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    // Simple sentence extraction - split by punctuation
    const sentences = text
      .replace(/\n+/g, ' ')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20); // Filter out very short sentences

    return sentences;
  }

  /**
   * Score sentences based on multiple features
   */
  private scoreSentences(
    sentences: string[], 
    fullText: string,
    focusKeywords: string[]
  ): SentenceScore[] {
    const titleWords = this.extractTitleWords(fullText);
    const docTokens = textProcessor.tokenize(fullText);
    const termFreq = textProcessor.calculateTermFrequency(docTokens);

    return sentences.map((sentence, index) => {
      const tokens = textProcessor.tokenize(sentence);
      
      // Feature extraction
      const features = {
        titleSimilarity: this.calculateTitleSimilarity(tokens, titleWords),
        hasKeywords: this.hasKeywords(sentence, focusKeywords),
        isFirstOrLast: index < 2 || index >= sentences.length - 2,
        length: tokens.length,
        hasNumbers: /\d+/.test(sentence),
        hasActionWords: this.hasActionWords(tokens)
      };

      // Calculate score
      let score = 0;
      
      // TF-IDF score for sentence
      const sentenceScore = this.calculateSentenceTfIdf(tokens, termFreq);
      score += sentenceScore * 0.3;

      // Feature-based scoring
      score += features.titleSimilarity * 0.2;
      score += features.hasKeywords ? 0.2 : 0;
      score += features.isFirstOrLast ? 0.1 : 0;
      score += features.hasNumbers ? 0.1 : 0;
      score += features.hasActionWords ? 0.1 : 0;

      // Length penalty (prefer medium-length sentences)
      if (features.length < 5 || features.length > 30) {
        score *= 0.8;
      }

      return {
        text: sentence,
        score,
        position: index,
        features
      };
    });
  }

  /**
   * Select top sentences while maintaining order
   */
  private selectTopSentences(
    scoredSentences: SentenceScore[], 
    maxWords: number
  ): SentenceScore[] {
    // Sort by score
    const sorted = [...scoredSentences].sort((a, b) => b.score - a.score);
    
    const selected: SentenceScore[] = [];
    let currentWords = 0;

    for (const sentence of sorted) {
      const words = sentence.text.split(/\s+/).length;
      if (currentWords + words <= maxWords) {
        selected.push(sentence);
        currentWords += words;
      }
    }

    // Re-sort by original position to maintain flow
    return selected.sort((a, b) => a.position - b.position);
  }

  /**
   * Format summary based on style
   */
  private formatSummary(
    sentences: SentenceScore[], 
    style: 'bullets' | 'paragraph' | 'structured'
  ): string {
    const texts = sentences.map(s => s.text);

    switch (style) {
      case 'bullets':
        return texts.map(t => `• ${t}`).join('\n');
      
      case 'structured':
        // Group by features
        const actionSentences = sentences.filter(s => s.features.hasActionWords);
        const keySentences = sentences.filter(s => s.features.titleSimilarity > 0.5);
        
        let structured = '';
        if (keySentences.length > 0) {
          structured += '**Key Points:**\n';
          structured += keySentences.map(s => `- ${s.text}`).join('\n');
        }
        if (actionSentences.length > 0) {
          structured += '\n\n**Actions:**\n';
          structured += actionSentences.map(s => `- ${s.text}`).join('\n');
        }
        return structured;
      
      case 'paragraph':
      default:
        return texts.join(' ');
    }
  }

  /**
   * Extract key points from selected sentences
   */
  private extractKeyPoints(sentences: SentenceScore[]): string[] {
    // Take sentences with highest individual feature scores
    const keyPoints: string[] = [];
    
    // Most relevant to title
    const titleRelevant = sentences
      .filter(s => s.features.titleSimilarity > 0.5)
      .sort((a, b) => b.features.titleSimilarity - a.features.titleSimilarity)
      .slice(0, 2);
    
    // Has action words
    const actionSentences = sentences
      .filter(s => s.features.hasActionWords)
      .slice(0, 2);
    
    // Combine and deduplicate
    [...titleRelevant, ...actionSentences].forEach(s => {
      if (!keyPoints.includes(s.text)) {
        keyPoints.push(s.text);
      }
    });
    
    return keyPoints.slice(0, 5);
  }

  /**
   * Calculate TF-IDF score for a sentence
   */
  private calculateSentenceTfIdf(
    sentenceTokens: string[], 
    docTermFreq: Map<string, number>
  ): number {
    let score = 0;
    let count = 0;

    sentenceTokens.forEach(token => {
      const tf = docTermFreq.get(textProcessor.stem(token)) || 0;
      score += tf;
      count++;
    });

    return count > 0 ? score / count : 0;
  }

  /**
   * Extract potential title words from beginning of text
   */
  private extractTitleWords(text: string): Set<string> {
    const firstLine = text.split('\n')[0] || '';
    const tokens = textProcessor.tokenize(firstLine);
    return new Set(tokens);
  }

  /**
   * Calculate similarity between sentence and title
   */
  private calculateTitleSimilarity(
    sentenceTokens: string[], 
    titleWords: Set<string>
  ): number {
    if (titleWords.size === 0) return 0;

    let matches = 0;
    sentenceTokens.forEach(token => {
      if (titleWords.has(token)) matches++;
    });

    return matches / Math.max(sentenceTokens.length, titleWords.size);
  }

  /**
   * Check if sentence contains focus keywords
   */
  private hasKeywords(sentence: string, keywords: string[]): boolean {
    const lower = sentence.toLowerCase();
    return keywords.some(keyword => lower.includes(keyword.toLowerCase()));
  }

  /**
   * Check if tokens contain action words
   */
  private hasActionWords(tokens: string[]): boolean {
    return tokens.some(token => this.actionWords.has(token.toLowerCase()));
  }

  /**
   * Split content into chunks
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const words = content.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  }

  /**
   * Calculate importance score for a chunk
   */
  private calculateChunkImportance(sentences: SentenceScore[]): number {
    if (sentences.length === 0) return 0;
    
    const avgScore = sentences.reduce((sum, s) => sum + s.score, 0) / sentences.length;
    const hasImportantFeatures = sentences.some(s => 
      s.features.hasActionWords || s.features.hasNumbers || s.features.hasKeywords
    );
    
    return avgScore * (hasImportantFeatures ? 1.2 : 1);
  }
}

// Export singleton instance
export const summarizer = new Summarizer();