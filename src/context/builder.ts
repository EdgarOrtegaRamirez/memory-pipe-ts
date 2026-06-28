import { Memory, ContextParams, ContextResult } from '../types/index.js';

export class ContextBuilder {
  build(params: ContextParams, memories: Memory[]): ContextResult {
    const { query, maxEntries = 5, minScore = 0 } = params;

    if (memories.length === 0) {
      return { memories: [], totalScore: 0 };
    }

    // Score each memory against the query
    const scored: { memory: Memory; relevanceScore: number; combinedScore: number }[] = [];

    for (const memory of memories) {
      const relevance = this.computeRelevance(memory, query);
      if (relevance < minScore) continue;

      // Combined score factors:
      // - Relevance to query (40%)
      // - Importance score (30%)
      // - Recency (15%)
      // - Persistence (15%)
      const recency = this.computeRecencyScore(memory.createdAt);

      const combinedScore =
        relevance * 0.4 +
        memory.importance * 0.3 +
        recency * 0.15 +
        memory.persistence * 0.15;

      scored.push({ memory, relevanceScore: relevance, combinedScore });
    }

    // Sort by combined score descending
    scored.sort((a, b) => b.combinedScore - a.combinedScore);

    // Take top N
    const selected = scored.slice(0, maxEntries);

    const totalScore = selected.reduce((sum, s) => sum + s.combinedScore, 0);

    return {
      memories: selected.map(s => s.memory),
      totalScore: Math.round(totalScore * 1000) / 1000,
    };
  }

  private computeRelevance(memory: Memory, query: string): number {
    const memoryText = `${memory.type} ${memory.content} ${(memory.metadata.tags || []).join(' ')} ${(memory.metadata.source || '').toLowerCase()}`.toLowerCase();
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    if (queryTerms.length === 0) return 0.5; // default relevance

    let matches = 0;

    for (const term of queryTerms) {
      if (memoryText.includes(term)) {
        matches += 1.0;
      } else {
        // Check if term is a prefix of any word in the memory
        const words = memoryText.split(/\s+/);
        for (const word of words) {
          if (word.startsWith(term)) {
            matches += 0.5;
            break;
          }
        }
      }
    }

    // Normalize to 0-1
    return Math.min(matches / queryTerms.length, 1.0);
  }

  private computeRecencyScore(createdAt: string): number {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const hoursAgo = (now - created) / (1000 * 60 * 60);

    // Exponential decay: recent memories score higher
    // 0 hours = 1.0, 24 hours = 0.7, 7 days = 0.4, 30 days = 0.2
    const decay = Math.exp(-hoursAgo / 168); // half-life ~7 days
    return decay;
  }
}
