import Database from 'better-sqlite3';
import path from 'path';
import { Memory, MemoryType, MemoryStats, MemoryPipeConfig } from '../types/index.js';

export class StorageEngine {
  private db: Database.Database;
  private dbPath: string;

  constructor(config: MemoryPipeConfig = {}) {
    this.dbPath = config.dbPath || path.join(process.cwd(), 'memories.db');
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('fact', 'conversation', 'preference', 'task')),
        content TEXT NOT NULL,
        importance REAL NOT NULL DEFAULT 0.5,
        persistence REAL NOT NULL DEFAULT 0.5,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        entries TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_persistence ON memories(persistence);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
    `);
  }

  generateId(): string {
    return crypto.randomUUID();
  }

  saveMemory(memory: Memory): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (id, type, content, importance, persistence, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.type,
      memory.content,
      memory.importance,
      memory.persistence,
      JSON.stringify(memory.metadata),
      memory.createdAt,
      memory.updatedAt
    );
  }

  getMemoryById(id: string): Memory | undefined {
    const row = this.db.prepare(`SELECT * FROM memories WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    return {
      id: row.id as string,
      type: row.type as MemoryType,
      content: row.content as string,
      importance: row.importance as number,
      persistence: row.persistence as number,
      metadata: JSON.parse(row.metadata as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  getAllMemories(): Memory[] {
    const rows = this.db.prepare(`SELECT * FROM memories ORDER BY created_at DESC`).all() as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      type: row.type as MemoryType,
      content: row.content as string,
      importance: row.importance as number,
      persistence: row.persistence as number,
      metadata: JSON.parse(row.metadata as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  }

  getMemoriesByType(type: MemoryType): Memory[] {
    const rows = this.db.prepare(`SELECT * FROM memories WHERE type = ? ORDER BY created_at DESC`).all(type) as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as string,
      type: row.type as MemoryType,
      content: row.content as string,
      importance: row.importance as number,
      persistence: row.persistence as number,
      metadata: JSON.parse(row.metadata as string),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  }

  deleteMemory(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  clearAll(): void {
    this.db.exec(`DELETE FROM memories; DELETE FROM conversations;`);
  }

  getStats(_config?: MemoryPipeConfig): MemoryStats {
    const total = this.db.prepare(`SELECT COUNT(*) as count FROM memories`).get() as { count: number };
    const avgImp = this.db.prepare(`SELECT AVG(importance) as avg FROM memories`).get() as { avg: number | null };
    const avgPer = this.db.prepare(`SELECT AVG(persistence) as avg FROM memories`).get() as { avg: number | null };

    const byType: Record<string, number> = {};
    const rows = this.db.prepare(`SELECT type, COUNT(*) as count FROM memories GROUP BY type`).all() as Record<string, unknown>[];
    for (const row of rows) {
      byType[row.type as string] = row.count as number;
    }

    return {
      totalMemories: total.count,
      byType: byType as Record<MemoryType, number>,
      avgImportance: avgImp.avg ?? 0,
      avgPersistence: avgPer.avg ?? 0,
    };
  }

  saveConversation(id: string, entries: unknown[]): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO conversations (id, entries, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, JSON.stringify(entries), now, now);
  }

  getConversation(id: string): { entries: unknown[]; createdAt: string } | undefined {
    const row = this.db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      entries: JSON.parse(row.entries as string),
      createdAt: row.created_at as string,
    };
  }

  close(): void {
    this.db.close();
  }
}
