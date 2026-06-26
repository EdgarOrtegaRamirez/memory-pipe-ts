# AGENTS.md - Notes for AI Agents

## Project Overview
MemoryPipe is a TypeScript port of the Python MemoryPipe library. It provides local-first AI agent memory persistence with SQLite storage, fact extraction, TF-IDF semantic search, and context building.

## Architecture
- `src/types/` - TypeScript types and interfaces
- `src/storage/engine.ts` - SQLite storage engine using better-sqlite3
- `src/facts/extractor.ts` - Pattern-based fact extraction from conversations
- `src/search/engine.ts` - TF-IDF semantic search engine
- `src/context/builder.ts` - Context builder for assembling relevant memories
- `src/index.ts` - Main MemoryPipe class tying everything together
- `src/cli/index.ts` - Commander-based CLI
- `src/mcp/server.ts` - MCP server for AI agent integration

## Key Design Decisions
- SQLite WAL mode for concurrent read performance
- Pattern-based (not AI-based) fact extraction — no external API calls needed
- TF-IDF search with BM25-like scoring — no vector DB dependency
- In-memory mode available with `:memory:` db path for testing
- Memory scoring combines: relevance (40%), importance (30%), recency (15%), persistence (15%)

## CLI Commands
```
memory-pipe add --type fact --content "..." [--metadata '{"key":"value"}']
memory-pipe query --query "search term" [--max-results 10] [--type fact]
memory-pipe facts [--max 50]
memory-pipe search --query "keyword" [--max-results 10]
memory-pipe context --query "build context" [--max-entries 5]
memory-pipe history --id "conv-123"
memory-pipe scores [--type fact] [--max 20]
memory-pipe clear [--force]
memory-pipe sample-config
memory-pipe version
```

## Testing
- Uses vitest for unit testing
- Tests cover: storage engine, fact extraction, search, context building, CLI
- Run with: `npm test`

## Adding New Features
1. Add new types to `src/types/index.ts`
2. Implement feature in appropriate module
3. Add tests in `tests/`
4. Add CLI command in `src/cli/index.ts` if user-facing
5. Add MCP tool in `src/mcp/server.ts` if useful for AI agents
6. Update README.md

## Commit Convention
- `feat: add <feature>` — new feature
- `fix: <description>` — bug fix
- `docs: <description>` — documentation
- `test: <description>` — tests
- `refactor: <description>` — code change
- `chore: <description>` — maintenance
