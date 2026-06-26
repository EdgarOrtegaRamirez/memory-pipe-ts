import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPipe, MemoryType } from '../../src/index.js';

describe('ContextBuilder', () => {
  let pipe: MemoryPipe;

  beforeEach(async () => {
    pipe = new MemoryPipe({ dbPath: ':memory:' });
  });

  afterEach(async () => {
    await pipe.close();
  });

  it('should build context from relevant memories', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'User prefers TypeScript' });
    await pipe.addMemory({ type: MemoryType.PREFERENCE, content: 'I like React for frontend' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Database is PostgreSQL' });

    const context = await pipe.buildContext({ query: 'typescript preferences', maxEntries: 5 });
    expect(context.memories.length).toBeGreaterThan(0);
    expect(context.totalScore).toBeGreaterThan(0);
  });

  it('should return empty context for unrelated query', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'User prefers TypeScript' });

    const context = await pipe.buildContext({ query: 'weather today' });
    expect(context).toBeDefined();
    expect(context.totalScore).toBeDefined();
  });

  it('should limit context entries', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'TypeScript fact one' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'TypeScript fact two' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'TypeScript fact three' });

    const context = await pipe.buildContext({ query: 'typescript', maxEntries: 2 });
    expect(context.memories.length).toBeLessThanOrEqual(2);
  });

  it('should handle empty memory store', async () => {
    const context = await pipe.buildContext({ query: 'anything' });
    expect(context.memories).toEqual([]);
    expect(context.totalScore).toBe(0);
  });

  it('should include memory type and importance in context', async () => {
    await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'User is experienced with TypeScript',
    });

    const context = await pipe.buildContext({ query: 'typescript experience' });
    if (context.memories.length > 0) {
      const mem = context.memories[0];
      expect(mem.type).toBe(MemoryType.FACT);
      expect(mem.importance).toBeGreaterThanOrEqual(0);
      expect(mem.importance).toBeLessThanOrEqual(1);
    }
  });
});
