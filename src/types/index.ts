// Types for MemoryPipe

export enum MemoryType {
  FACT = 'fact',
  CONVERSATION = 'conversation',
  PREFERENCE = 'preference',
  TASK = 'task',
}

export enum MemoryScoreType {
  IMPORTANCE = 'importance',
  PERSISTENCE = 'persistence',
}

export interface MemoryMetadata {
  source?: string;
  conversationId?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number;
  persistence: number;
  metadata: MemoryMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  type: MemoryType;
  content: string;
  metadata?: MemoryMetadata;
  conversationId?: string;
}

export interface SearchParams {
  query: string;
  maxResults?: number;
  types?: MemoryType[];
  minScore?: number;
}

export interface SearchResult {
  memory: Memory;
  score: number;
}

export interface ContextParams {
  query: string;
  maxEntries?: number;
  minScore?: number;
}

export interface ContextResult {
  memories: Memory[];
  totalScore: number;
}

export interface FactExtractionResult {
  facts: string[];
  metadata: MemoryMetadata;
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  avgImportance: number;
  avgPersistence: number;
}

export interface MemoryPipeConfig {
  dbPath?: string;
  maxMemories?: number;
  importanceThreshold?: number;
  persistenceThreshold?: number;
  openAiApiKey?: string;
}
