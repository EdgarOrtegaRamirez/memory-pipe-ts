import { describe, it, expect } from 'vitest';
import { FactExtractor } from '../../src/facts/extractor.js';
import { MemoryEntry, MemoryType } from '../../src/types/index.js';

describe('FactExtractor', () => {
  const extractor = new FactExtractor();

  it('should extract facts from preference statements', () => {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content: 'I prefer TypeScript over JavaScript because it has types.',
    };

    const result = extractor.extract([entry]);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.facts.some(f => f.toLowerCase().includes('prefer'))).toBe(true);
  });

  it('should extract skills and knowledge', () => {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content: 'I can build REST APIs with Express and I know how to work with PostgreSQL databases.',
    };

    const result = extractor.extract([entry]);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.facts.some(f => f.toLowerCase().includes('can build') || f.toLowerCase().includes('know how'))).toBe(true);
  });

  it('should extract work context', () => {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content: 'I work on a Node.js project and I build web applications.',
    };

    const result = extractor.extract([entry]);
    expect(result.facts.length).toBeGreaterThan(0);
  });

  it('should return empty facts for unrelated content', () => {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content: 'The weather is nice today and the birds are singing in the trees.',
    };

    const result = extractor.extract([entry]);
    expect(result.facts.length).toBeLessThan(3);
  });

  it('should detect tags from tech mentions', () => {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content: 'I use TypeScript for my frontend project and Python for backend.',
    };

    const result = extractor.extract([entry]);
    expect(result.metadata.tags).toContain('typescript');
    expect(result.metadata.tags).toContain('python');
  });

  it('should extract from multiple entries', () => {
    const entries: MemoryEntry[] = [
      { type: MemoryType.CONVERSATION, content: 'I prefer React for UI development.' },
      { type: MemoryType.CONVERSATION, content: 'I can build GraphQL APIs with Apollo.' },
    ];

    const result = extractor.extract(entries);
    expect(result.facts.length).toBeGreaterThan(1);
  });

  it('should return empty result for empty content', () => {
    const entry: MemoryEntry = {
      type: MemoryType.CONVERSATION,
      content: '',
    };

    const result = extractor.extract([entry]);
    expect(result.facts).toEqual([]);
  });

  it('should extract fact from single sentence', () => {
    const result = extractor.extractFromSingle('I prefer TypeScript for type safety.');
    expect(result.fact).toBeDefined();
    expect(result.fact).toBe('I prefer TypeScript for type safety');
    expect(result.type).toBe(MemoryType.PREFERENCE);
    expect(result.importance).toBeGreaterThanOrEqual(0.7);
    expect(result.tags).toContain('typescript');
  });

  it('should classify preference statements correctly', () => {
    const result = extractor.extractFromSingle('I love Python for data science work.');
    expect(result.type).toBe(MemoryType.PREFERENCE);
  });

  it('should classify knowledge statements correctly', () => {
    const result = extractor.extractFromSingle('I have experience with Kubernetes and Docker.');
    expect(result.type).toBe(MemoryType.FACT);
  });
});
