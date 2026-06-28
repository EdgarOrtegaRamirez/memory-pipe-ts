import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageEngine } from '../../src/storage/engine.js';
import { MemoryType } from '../../src/types/index.js';

describe('StorageEngine', () => {
  let engine: StorageEngine;

  beforeEach(() => {
    engine = new StorageEngine({ dbPath: ':memory:' });
  });

  afterEach(() => {
    engine.close();
  });

  it('should generate unique IDs', () => {
    const id1 = engine.generateId();
    const id2 = engine.generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toBeDefined();
    expect(id1.length).toBeGreaterThan(0);
  });

  it('should save and retrieve a memory', () => {
    const memory = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Test content',
      importance: 0.8,
      persistence: 0.7,
      metadata: { source: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    engine.saveMemory(memory);
    const retrieved = engine.getMemoryById(memory.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe('Test content');
    expect(retrieved?.importance).toBe(0.8);
  });

  it('should retrieve undefined for non-existent memory', () => {
    const result = engine.getMemoryById('non-existent-id');
    expect(result).toBeUndefined();
  });

  it('should get all memories', () => {
    const m1 = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Fact one',
      importance: 0.5,
      persistence: 0.5,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(m1);

    const m2 = {
      id: engine.generateId(),
      type: MemoryType.PREFERENCE,
      content: 'Prefers JS',
      importance: 0.6,
      persistence: 0.4,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(m2);

    const all = engine.getAllMemories();
    expect(all).toHaveLength(2);
  });

  it('should filter memories by type', () => {
    const fact1 = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Fact 1',
      importance: 0.5,
      persistence: 0.5,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(fact1);

    const pref = {
      id: engine.generateId(),
      type: MemoryType.PREFERENCE,
      content: 'Prefers Python',
      importance: 0.7,
      persistence: 0.6,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(pref);

    const facts = engine.getMemoriesByType(MemoryType.FACT);
    expect(facts).toHaveLength(1);
    expect(facts[0].content).toBe('Fact 1');
  });

  it('should delete a memory', () => {
    const memory = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Delete me',
      importance: 0.5,
      persistence: 0.5,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(memory);

    const deleted = engine.deleteMemory(memory.id);
    expect(deleted).toBe(true);
    expect(engine.getMemoryById(memory.id)).toBeUndefined();
  });

  it('should clear all memories', () => {
    const m1 = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Content 1',
      importance: 0.5,
      persistence: 0.5,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(m1);

    const m2 = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Content 2',
      importance: 0.5,
      persistence: 0.5,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(m2);

    engine.clearAll();
    const all = engine.getAllMemories();
    expect(all).toHaveLength(0);
  });

  it('should get stats correctly', () => {
    const m1 = {
      id: engine.generateId(),
      type: MemoryType.FACT,
      content: 'Content 1',
      importance: 0.8,
      persistence: 0.6,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    engine.saveMemory(m1);

    const stats = engine.getStats({});
    expect(stats.totalMemories).toBe(1);
    expect(stats.byType.fact).toBe(1);
    expect(stats.avgImportance).toBe(0.8);
    expect(stats.avgPersistence).toBe(0.6);
  });

  it('should save and retrieve a conversation', () => {
    const convId = engine.generateId();
    const entries = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    engine.saveConversation(convId, entries);

    const conv = engine.getConversation(convId);
    expect(conv).toBeDefined();
    expect(conv?.entries).toHaveLength(2);
    expect(conv?.entries[0].role).toBe('user');
    expect(conv?.entries[1].content).toBe('Hi there!');
  });
});
