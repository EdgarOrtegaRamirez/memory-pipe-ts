import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryPipe } from '../src/index.js';
import { MemoryType } from '../src/types/index.js';

describe('MemoryPipe - Core Operations', () => {
  let pipe: MemoryPipe;

  beforeEach(async () => {
    pipe = new MemoryPipe({ dbPath: ':memory:' });
  });

  afterEach(async () => {
    await pipe.close();
  });

  it('should add a memory and retrieve it', async () => {
    const memory = await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'User prefers TypeScript over JavaScript',
      metadata: { source: 'test' },
    });

    expect(memory.id).toBeDefined();
    expect(memory.type).toBe(MemoryType.FACT);
    expect(memory.content).toBe('User prefers TypeScript over JavaScript');
    expect(memory.importance).toBe(0.5);
    expect(memory.persistence).toBe(0.5);

    const retrieved = await pipe.getMemory(memory.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe(memory.content);
  });

  it('should add multiple memories and retrieve all', async () => {
    await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'Fact one',
    });
    await pipe.addMemory({
      type: MemoryType.PREFERENCE,
      content: 'Prefers Python',
    });
    await pipe.addMemory({
      type: MemoryType.TASK,
      content: 'Working on API',
    });

    const all = await pipe.getAllMemories();
    expect(all).toHaveLength(3);
  });

  it('should get memories by type', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact 1' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact 2' });
    await pipe.addMemory({ type: MemoryType.PREFERENCE, content: 'Prefers JS' });

    const facts = await pipe.getMemoriesByType(MemoryType.FACT);
    expect(facts).toHaveLength(2);
    expect(facts.every(f => f.type === MemoryType.FACT)).toBe(true);

    const prefs = await pipe.getMemoriesByType(MemoryType.PREFERENCE);
    expect(prefs).toHaveLength(1);
  });

  it('should delete a memory', async () => {
    const memory = await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'To delete',
    });

    const deleted = await pipe.deleteMemory(memory.id);
    expect(deleted).toBe(true);

    const retrieved = await pipe.getMemory(memory.id);
    expect(retrieved).toBeUndefined();
  });

  it('should return false when deleting non-existent memory', async () => {
    const deleted = await pipe.deleteMemory('non-existent-id');
    expect(deleted).toBe(false);
  });

  it('should clear all memories', async () => {
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact 1' });
    await pipe.addMemory({ type: MemoryType.FACT, content: 'Fact 2' });

    await pipe.clearAll();

    const all = await pipe.getAllMemories();
    expect(all).toHaveLength(0);
  });

  it('should generate unique IDs for each memory', async () => {
    const m1 = await pipe.addMemory({ type: MemoryType.FACT, content: 'One' });
    const m2 = await pipe.addMemory({ type: MemoryType.FACT, content: 'Two' });
    expect(m1.id).not.toBe(m2.id);
  });

  it('should store metadata correctly', async () => {
    const memory = await pipe.addMemory({
      type: MemoryType.FACT,
      content: 'Test',
      metadata: { source: 'cli', tags: ['test', 'typescript'] },
    });

    const retrieved = await pipe.getMemory(memory.id);
    expect(retrieved?.metadata.source).toBe('cli');
    expect(retrieved?.metadata.tags).toEqual(['test', 'typescript']);
  });
});
