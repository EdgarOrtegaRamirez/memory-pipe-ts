import { MemoryEntry, MemoryType, MemoryMetadata, FactExtractionResult } from '../types/index.js';

// Pattern-based fact extraction rules
const PATTERN_RULES = [
  // Explicit preference statements
  {
    regex: /\b(?:I (?:prefer|like|love|hate|want|need|enjoy|dislike|avoid|prefer)\b|I'd rather\b|I'm (?:a|an)\b|(?:my|my own)\b.*?(?:language|framework|tool|editor|IDE|database|stack|tech|technology))\b/gi,
    type: MemoryType.PREFERENCE as MemoryType,
    weight: 0.8,
  },
  // Skill/knowledge assertions
  {
    regex: /\b(?:I can\b|I know how to\b|I'm good at\b|I'm proficient in\b|I have experience with\b|I've built\b|I've worked with\b|I specialize in\b|I'm experienced in\b)\b/gi,
    type: MemoryType.FACT as MemoryType,
    weight: 0.7,
  },
  // Work context
  {
    regex: /\b(?:I work on\b|I work at\b|I work as\b|I work with\b|I'm working on\b|my project\b|my app\b|I'm building\b)\b/gi,
    type: MemoryType.TASK as MemoryType,
    weight: 0.6,
  },
  // Technology mentions in context
  {
    regex: /\b(?:uses?\s+?(?:TypeScript|JavaScript|Python|Java|Go|Rust|Ruby|PHP|C\+\+|C#|Swift|Kotlin)\b|using\s+(?:TypeScript|JavaScript|Python|Java|Go|Rust|Ruby|PHP|C\+\+|C#|Swift|Kotlin))\b/gi,
    type: MemoryType.FACT as MemoryType,
    weight: 0.5,
  },
  // Requirement statements
  {
    regex: /\b(?:requires?\s+|needs?\s+|must\s+(?:use|have|be|support|include|contain|provide))\b/gi,
    type: MemoryType.TASK as MemoryType,
    weight: 0.6,
  },
];

// Sentences that likely contain facts/preferences
const FACT_INDICATORS = [
  'prefer', 'like', 'love', 'hate', 'want', 'need', 'enjoy', 'dislike',
  'avoid', 'can', 'know', 'good at', 'proficient', 'experience',
  'built', 'worked with', 'specialize', 'work on', 'work at',
  'building', 'project', 'app', 'uses', 'requires', 'needs',
];

function extractSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

function extractFactFromSentence(sentence: string): string | null {
  sentence = sentence.trim();
  if (sentence.length < 10) return null;

  for (const indicator of FACT_INDICATORS) {
    if (sentence.toLowerCase().includes(indicator.toLowerCase())) {
      return sentence;
    }
  }
  return null;
}

function classifyType(sentence: string): MemoryType {
  const lower = sentence.toLowerCase();

  for (const rule of PATTERN_RULES) {
    if (rule.regex.test(lower)) {
      return rule.type;
    }
  }

  // Default to fact for knowledge statements
  if (lower.includes('can') || lower.includes('know') || lower.includes('built')) {
    return MemoryType.FACT;
  }
  if (lower.includes('prefer') || lower.includes('like') || lower.includes('love')) {
    return MemoryType.PREFERENCE;
  }
  if (lower.includes('work') || lower.includes('building') || lower.includes('project')) {
    return MemoryType.TASK;
  }

  return MemoryType.FACT;
}

function calculateImportance(sentence: string, type: MemoryType): number {
  let importance = 0.5;

  // Strong indicators increase importance
  if (sentence.toLowerCase().includes('prefer') || sentence.toLowerCase().includes('hate')) {
    importance = 0.9;
  } else if (sentence.toLowerCase().includes('need') || sentence.toLowerCase().includes('must')) {
    importance = 0.8;
  } else if (sentence.toLowerCase().includes('specialize') || sentence.toLowerCase().includes('proficient')) {
    importance = 0.85;
  }

  // Longer statements tend to be more specific
  if (sentence.length > 100) importance += 0.1;
  if (sentence.length > 200) importance += 0.05;

  return Math.min(importance, 1.0);
}

function detectTags(sentence: string): string[] {
  const tags: string[] = [];
  const lower = sentence.toLowerCase();

  const techMap: Record<string, string[]> = {
    typescript: ['typescript', 'ts'],
    javascript: ['javascript', 'js'],
    python: ['python'],
    react: ['react', 'jsx', 'tsx'],
    node: ['node', 'nodejs', 'express'],
    database: ['database', 'sql', 'nosql', 'sqlite', 'postgres', 'mongodb'],
    backend: ['backend', 'api', 'server', 'rest', 'graphql'],
    frontend: ['frontend', 'ui', 'css', 'html', 'react'],
  };

  for (const [tag, keywords] of Object.entries(techMap)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        tags.push(tag);
        break;
      }
    }
  }

  return tags;
}

export class FactExtractor {
  extract(entries: MemoryEntry[]): FactExtractionResult {
    const facts: string[] = [];
    const metadata: MemoryMetadata = { tags: [] };

    for (const entry of entries) {
      const sentences = extractSentences(entry.content);
      for (const sentence of sentences) {
        const fact = extractFactFromSentence(sentence);
        if (fact) {
          facts.push(fact);
          const tags = detectTags(fact);
          for (const tag of tags) {
            if (!metadata.tags!.includes(tag)) {
              metadata.tags!.push(tag);
            }
          }
        }
      }
    }

    return { facts, metadata };
  }

  extractFromSingle(text: string): { fact: string | null; type: MemoryType; importance: number; tags: string[] } {
    const sentences = extractSentences(text);

    for (const sentence of sentences) {
      const fact = extractFactFromSentence(sentence);
      if (fact) {
        const type = classifyType(fact);
        const importance = calculateImportance(fact, type);
        const tags = detectTags(fact);
        return { fact, type, importance, tags };
      }
    }

    return { fact: null, type: MemoryType.FACT, importance: 0.3, tags: [] };
  }
}
