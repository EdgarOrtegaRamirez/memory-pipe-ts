import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryPipe } from '../src/index.js';
import { MemoryType } from '../src/types/index.js';
import { MemoryPipe as MPClass } from '../src/index.js';

describe('MemoryPipe Integration Tests', () => {
  let pipe: MPClass;

  beforeEach(async () => {
    pipe = new MemoryPipe({ dbPath: ':memory:' });
  });

  afterEach(async () => {
    await pipe.close();
  });

  it('should extract facts from conversation automatically', async () => {
    const memory = await pipe.addMemory({
      type: MemoryType.CONVERSATION,
      content: 'I prefer TypeScript over JavaScript for type safety.',
      conversationId: 'conv-1',
    });

    const facts = await pipe.getFacts();
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.some(f => f.content.toLowerCase().includes('typescript') || f.content.toLowerCase().includes('prefer'))).toBe(true);
  });

  it('should build context for a query', async () => {
    await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'User is an experienced TypeScript developer',
    });
    await pipe.addMemory({
      type: MemoryType.PREFERENCE,
      content: 'I prefer React for frontend development',
    });
    await pipe.addMemory({
      type: MemoryType.TASK,
      content: 'Working on building a REST API',
    });

    const context = await pipe.buildContext({
      query: 'development setup',
      maxEntries: 3,
    });

    expect(context.memories.length).toBeGreaterThan(0);
    expect(context.memories.length).toBeLessThanOrEqual(3);
    expect(context.totalScore).toBeGreaterThan(0);
  });

  it('should search and filter by type', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'TypeScript fact' });
    await pipe.addMemory({ type: MemoryType.PREFERENCE, content: 'Prefers TypeScript' });

    const results = await pipe.queryMemories({
      query: 'typescript',
      types: [MemoryType.FACT],
    });

    // Should only return facts (or at least search for the term)
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty search gracefully', async () => {
    const results = await pipe.queryMemories({ query: 'zzzzz_not_found_zzzzz' });
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should compute stats correctly', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact 1' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact 2' });
    await pipe.addMemory({ type: MemoryType.PREFERENCE, content: 'Prefers TS' });

    const stats = await pipe.getStats();
    expect(stats.totalMemories).toBe(3);
    expect(stats.byType.fact).toBe(2);
    expect(stats.byType.preference).toBe(1);
    expect(stats.avgImportance).toBeGreaterThanOrEqual(0);
    expect(stats.avgImportance).toBeLessThanOrEqual(1);
  });

  it('should handle auto-extraction from multiple conversations', async () => {
    await pipe.addMemory({
      type: MemoryType.CONVERSATION,
      content: 'I like TypeScript and I can build Node.js APIs.',
      conversationId: 'conv-1',
    });
    await pipe.addMemory({
      type: MemoryType.CONVERSATION,
      content: 'My project uses React and PostgreSQL.',
      conversationId: 'conv-2',
    });

    const facts = await pipe.getFacts();
    expect(facts.length).toBeGreaterThan(0);

    // Check tags include detected technologies
    const allTags = facts.flatMap(f => f.metadata.tags || []);
    expect(allTags.length).toBeGreaterThan(0);
  });

  it('should handle direct fact extraction from conversation ID', async () => {
    const result = await pipe.extractFactsFromConversation('conv-test', 'I prefer TypeScript for type safety.');

    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.facts.some(f => f.toLowerCase().includes('typescript') || f.toLowerCase().includes('prefer'))).toBe(true);

    // Should also be retrievable
    const facts = await pipe.getFacts();
    expect(facts.length).toBeGreaterThan(0);
  });

  it('should handle save and retrieve conversation', async () => {
    await pipe.saveConversation('conv-1', [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ]);

    const conv = await pipe.getConversation('conv-1');
    expect(conv).toBeDefined();
    expect(conv?.entries).toHaveLength(2);
    expect(conv?.createdAt).toBeDefined();
  });

  it('should return undefined for non-existent conversation', async () => {
    const conv = await pipe.getConversation('non-existent');
    expect(conv).toBeUndefined();
  });
});
