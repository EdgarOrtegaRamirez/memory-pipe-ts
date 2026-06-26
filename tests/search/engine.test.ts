import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPipe, MemoryType } from '../../src/index.js';

describe('SearchEngine', () => {
  let pipe: MemoryPipe;

  beforeEach(async () => {
    pipe = new MemoryPipe({ dbPath: ':memory:' });
  });

  afterEach(async () => {
    await pipe.close();
  });

  it('should search memories by keyword', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'User prefers TypeScript' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'User likes Python' });
    await pipe.addMemory({ type: MemoryType.PREFERENCE, content: 'I prefer React for frontend' });

    const results = await pipe.searchMemories('typescript');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].memory.content.toLowerCase()).toContain('typescript');
  });

  it('should return no results for non-matching query', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'User prefers TypeScript' });

    const results = await pipe.searchMemories('nonexistent_keyword_xyz');
    expect(results.length).toBe(0);
  });

  it('should limit results by maxResults', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact about TypeScript' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact about Python' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact about Java' });

    const results = await pipe.searchMemories('fact', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should search across multiple fields', async () => {
    await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'User works on a React project',
      metadata: { tags: ['frontend', 'react'] },
    });

    const results = await pipe.searchMemories('react');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should sort results by relevance score', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'User prefers TypeScript for type safety' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'TypeScript is a typed superset of JavaScript' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'I like building web apps' });

    const results = await pipe.searchMemories('typescript');
    expect(results.length).toBeGreaterThan(0);
    if (results.length > 1) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    }
  });

  it('should query memories with natural language', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'I prefer TypeScript over JavaScript' });
    await pipe.addMemory({ type: MemoryType.PREFERENCE, content: 'I like Python for data science' });

    const results = await pipe.queryMemories({ query: 'prefer typescript', maxResults: 5 });
    expect(results.length).toBeGreaterThan(0);
  });
});
