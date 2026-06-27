import { Memory, MemoryEntry, MemoryType, SearchParams, SearchResult, ContextParams, ContextResult, MemoryStats, MemoryPipeConfig } from './types/index.js';
import { StorageEngine } from './storage/engine.js';
import { FactExtractor } from './facts/extractor.js';
import { SearchEngine } from './search/engine.js';
import { ContextBuilder } from './context/builder.js';

export { MemoryType } from './types/index.js';

export class MemoryPipe {
  private storage: StorageEngine;
  private factExtractor: FactExtractor;
  private searchEngine: SearchEngine;
  private contextBuilder: ContextBuilder;
  private config: Required<MemoryPipeConfig>;

  constructor(config: MemoryPipeConfig = {}) {
    this.config = {
      dbPath: config.dbPath || ':memory:',
      maxMemories: config.maxMemories || 10000,
      importanceThreshold: config.importanceThreshold ?? 0.3,
      persistenceThreshold: config.persistenceThreshold ?? 0.2,
      openAiApiKey: config.openAiApiKey ?? '',
    };

    this.storage = new StorageEngine({ dbPath: this.config.dbPath });
    this.factExtractor = new FactExtractor();
    this.searchEngine = new SearchEngine();
    this.contextBuilder = new ContextBuilder();
  }

  // ---- Core Memory Operations ----

  async addMemory(entry: MemoryEntry): Promise<Memory> {
    const now = new Date().toISOString();
    const id = this.storage.generateId();

    const memory: Memory = {
      id,
      type: entry.type,
      content: entry.content,
      importance: 0.5,
      persistence: 0.5,
      metadata: entry.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    if (entry.conversationId) {
      memory.metadata.conversationId = entry.conversationId;
    }

    // Extract facts from the content
    if (entry.type === MemoryType.CONVERSATION) {
      const extraction = this.factExtractor.extract([entry]);
      if (extraction.facts.length > 0) {
        for (const fact of extraction.facts) {
          const factMemory: Memory = {
            id: this.storage.generateId(),
            type: MemoryType.FACT,
            content: fact,
            importance: 0.7,
            persistence: 0.6,
            metadata: {
              ...extraction.metadata,
              source: 'auto-extracted',
              conversationId: entry.conversationId,
            },
            createdAt: now,
            updatedAt: now,
          };
          this.storage.saveMemory(factMemory);
        }
      }
    }

    this.storage.saveMemory(memory);
    return memory;
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    return this.storage.getMemoryById(id);
  }

  async getAllMemories(): Promise<Memory[]> {
    return this.storage.getAllMemories();
  }

  async getMemoriesByType(type: MemoryType): Promise<Memory[]> {
    return this.storage.getMemoriesByType(type);
  }

  async deleteMemory(id: string): Promise<boolean> {
    return this.storage.deleteMemory(id);
  }

  async clearAll(): Promise<void> {
    this.storage.clearAll();
  }

  // ---- Search ----

  async queryMemories(params: SearchParams): Promise<SearchResult[]> {
    const memories = this.storage.getAllMemories();
    return this.searchEngine.searchWithMemories(params, memories);
  }

  async searchMemories(query: string, maxResults = 10): Promise<SearchResult[]> {
    return this.queryMemories({ query, maxResults });
  }

  // ---- Context Building ----

  async buildContext(params: ContextParams): Promise<ContextResult> {
    const memories = this.storage.getAllMemories();
    return this.contextBuilder.build(params, memories);
  }

  // ---- Facts ----

  async getFacts(): Promise<Memory[]> {
    return this.storage.getMemoriesByType(MemoryType.FACT);
  }

  async extractFactsFromConversation(conversationId: string, content: string): Promise<{ facts: string[] }> {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content,
      conversationId,
    };

    const extraction = this.factExtractor.extract([entry]);

    // Save extracted facts
    const now = new Date().toISOString();
    for (const fact of extraction.facts) {
      const factMemory: Memory = {
        id: this.storage.generateId(),
        type: MemoryType.FACT,
        content: fact,
        importance: 0.7,
        persistence: 0.6,
        metadata: {
          ...extraction.metadata,
          source: 'auto-extracted',
          conversationId,
        },
        createdAt: now,
        updatedAt: now,
      };
      this.storage.saveMemory(factMemory);
    }

    return { facts: extraction.facts };
  }

  // ---- Conversations ----

  async saveConversation(id: string, entries: unknown[]): Promise<void> {
    this.storage.saveConversation(id, entries);
  }

  async getConversation(id: string): Promise<{ entries: unknown[]; createdAt: string } | undefined> {
    return this.storage.getConversation(id);
  }

  // ---- Stats ----

  async getStats(): Promise<MemoryStats> {
    return this.storage.getStats(this.config);
  }

  // ---- Cleanup ----

  async cleanup(): Promise<void> {
    // Remove low-importance, low-persistence memories if over limit
    const memories = this.storage.getAllMemories();
    if (memories.length > this.config.maxMemories) {
      const toRemove = memories
        .filter(m => m.importance < this.config.importanceThreshold && m.persistence < this.config.persistenceThreshold)
        .sort((a, b) => a.importance + a.persistence - (b.importance + b.persistence))
        .slice(0, memories.length - this.config.maxMemories);

      for (const mem of toRemove) {
        this.storage.deleteMemory(mem.id);
      }
    }
  }

  async close(): Promise<void> {
    this.storage.close();
  }
}
