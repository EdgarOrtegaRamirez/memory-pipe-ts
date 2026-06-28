import { Memory, MemoryType, SearchResult, SearchParams } from '../types/index.js';

interface IdfMap {
  [term: string]: number;
}

export class SearchEngine {
  private docs: Map<string, Map<string, number>> = new Map();
  private idf: IdfMap = {};
  private tokenized: Map<string, string[]> = new Map();

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private computeIdf(docs: Map<string, Map<string, number>>): void {
    const n = docs.size;
    if (n === 0) return;

    const docFreq: Map<string, number> = new Map();

    for (const [, terms] of docs) {
      const uniqueTerms = new Set(terms.keys());
      for (const term of uniqueTerms) {
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }

    for (const [term, df] of docFreq) {
      this.idf[term] = Math.log((1 + n) / (1 + df)) + 1;
    }
  }

  indexMemory(memory: Memory): void {
    const content = `${memory.type} ${memory.content} ${(memory.metadata.tags || []).join(' ')} ${(memory.metadata.source || '').toLowerCase()}`;
    const terms = this.tokenize(content);

    const termCounts = new Map<string, number>();
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }

    this.docs.set(memory.id, termCounts);
    this.tokenized.set(memory.id, terms);
  }

  reindex(memories: Memory[]): void {
    this.docs.clear();
    this.tokenized.clear();
    this.idf = {};

    for (const mem of memories) {
      this.indexMemory(mem);
    }

    this.computeIdf(this.docs);
  }

  search(params: SearchParams): SearchResult[] {
    if (this.docs.size === 0) return [];

    const queryTerms = this.tokenize(params.query);
    if (queryTerms.length === 0) return [];

    const maxResults = params.maxResults || 10;

    const scores: { id: string; score: number }[] = [];

    for (const [docId, docTerms] of this.docs) {
      let score = 0;

      for (const qTerm of queryTerms) {
        const idf = this.idf[qTerm] ?? 1;
        const tf = docTerms.get(qTerm) ?? 0;

        if (tf > 0) {
          // TF-IDF score with BM25-like scaling
          score += (tf / (tf + 1.2)) * idf * Math.log(1 + docTerms.size);
        }
      }

      if (score > 0) {
        scores.push({ id: docId, score });
      }
    }

    // Filter by type if specified
    let results = scores;
    if (params.types && params.types.length > 0) {
      results = results.filter(r => {
        const mem = this.docs.get(r.id);
        return mem !== undefined;
      });
    }

    // Filter by minScore
    if (params.minScore) {
      results = results.filter(r => r.score >= params.minScore!);
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Return top N with memory data
    return results.slice(0, maxResults).map(r => {
      return {
        memory: {
          id: r.id,
          type: MemoryType.FACT,
          content: '',
          importance: 0.5,
          persistence: 0.5,
          metadata: {},
          createdAt: '',
          updatedAt: '',
        },
        score: Math.round(r.score * 1000) / 1000,
      };
    });
  }

  // Overload: full search with memory data
  searchWithMemories(params: SearchParams, memories: Memory[]): SearchResult[] {
    this.reindex(memories);

    const queryTerms = this.tokenize(params.query);
    if (queryTerms.length === 0) return [];

    const maxResults = params.maxResults || 10;
    const scores: { id: string; score: number; memory: Memory }[] = [];

    for (const memory of memories) {
      let score = 0;
      const content = `${memory.type} ${memory.content} ${(memory.metadata.tags || []).join(' ')} ${(memory.metadata.source || '').toLowerCase()}`;
      const docTerms = this.tokenize(content);

      for (const qTerm of queryTerms) {
        const idfVal = this.idf[qTerm] ?? 1;
        const tf = docTerms.filter(t => t === qTerm).length;

        if (tf > 0) {
          score += (tf / (tf + 1.2)) * idfVal * Math.log(1 + docTerms.length);
        }
      }

      if (score > 0) {
        scores.push({ id: memory.id, score, memory });
      }
    }

    // Filter by type
    let filtered = scores;
    if (params.types && params.types.length > 0) {
      filtered = filtered.filter(s => params.types!.includes(s.memory.type));
    }

    // Filter by minScore
    if (params.minScore) {
      filtered = filtered.filter(s => s.score >= params.minScore!);
    }

    // Sort descending
    filtered.sort((a, b) => b.score - a.score);

    return filtered.slice(0, maxResults).map(s => ({
      memory: s.memory,
      score: Math.round(s.score * 1000) / 1000,
    }));
  }
}
