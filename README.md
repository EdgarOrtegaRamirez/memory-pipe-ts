# MemoryPipe

> Lightweight, local-first AI agent memory library and CLI

SQLite-backed memory persistence for AI agents with automatic fact extraction, semantic search, and context building.

## Features

- **SQLite-backed storage** — persistent, fast, zero-config
- **Automatic fact extraction** — pattern-based extraction from conversations
- **Memory scoring** — importance and persistence scoring
- **Semantic search** — TF-IDF based retrieval
- **Context building** — assemble relevant memories for AI sessions
- **CLI** — 8 commands for full memory management
- **Library API** — type-safe TypeScript/JavaScript API
- **MCP server** — integrate with AI coding agents

## Quick Start

```bash
# Install
npm install memory-pipe

# CLI
npx memory-pipe add --type fact --content "User prefers TypeScript over JavaScript"
npx memory-pipe query "programming language preferences"
npx memory-pipe facts
npx memory-pipe search "typescript"
npx memory-pipe context --max-entries 5
```

## Library Usage

```typescript
import { MemoryPipe, MemoryType, MemoryScore } from 'memory-pipe';

const pipe = new MemoryPipe({ dbPath: './memories.db' });

// Add a memory
await pipe.addMemory({
  type: MemoryType.FACT,
  content: 'User prefers TypeScript',
  metadata: { source: 'conversation' }
});

// Query memories
const results = await pipe.queryMemories({
  query: 'programming preferences',
  maxResults: 10
});

// Get relevant context
const context = await pipe.buildContext({
  query: 'setup instructions',
  maxEntries: 5
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `add` | Add a new memory (fact, conversation, preference) |
| `query` | Search memories by natural language query |
| `facts` | List all extracted facts |
| `search` | Search memories by keyword |
| `context` | Build context for AI sessions |
| `history` | View conversation history |
| `scores` | View memory importance scores |
| `clear` | Clear all memories |
| `sample-config` | Generate example configuration |
| `version` | Show version information |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   CLI       │────▶│  Storage     │────▶│   SQLite    │
│  (Commander)│     │  Engine      │     │   Database  │
└─────────────┘     └──────────────┘     └─────────────┘
                          │
                    ┌─────▼──────┐
                    │ Fact       │
                    │ Extractor  │
                    └────────────┘
                          │
                    ┌─────▼──────┐
                    │ TF-IDF     │
                    │ Search     │
                    └────────────┘
```

## Configuration

Create a `.memory-pipe.json` in your project root:

```json
{
  "dbPath": "./memories.db",
  "maxMemories": 10000,
  "importanceThreshold": 0.3,
  "persistenceThreshold": 0.2
}
```

## Security

- All data stored locally in SQLite — no network calls by default
- Optional OpenAI embeddings require `OPENAI_API_KEY` environment variable
- Input validation on all CLI arguments and library methods
- No hardcoded secrets or tokens

## License

MIT
