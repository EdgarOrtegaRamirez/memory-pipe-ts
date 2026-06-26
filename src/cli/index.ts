import { Command } from 'commander';
import { MemoryPipe, MemoryType } from '../index.js';
import { MemoryEntry } from '../types/index.js';

const program = new Command();

program
  .name('memory-pipe')
  .description('AI Agent Memory & Context Persistence CLI')
  .version('1.0.0');

// Add command
program
  .command('add')
  .description('Add a new memory')
  .requiredOption('-t, --type <type>', 'Memory type (fact, conversation, preference, task)', 'fact')
  .requiredOption('-c, --content <content>', 'Memory content')
  .option('-m, --metadata <json>', 'Additional metadata as JSON string')
  .option('--conversation-id <id>', 'Associated conversation ID')
  .action(async (options) => {
    const pipe = new MemoryPipe();

    const entry: MemoryEntry = {
      type: options.type as MemoryType,
      content: options.content,
      conversationId: options.conversationId,
    };

    if (options.metadata) {
      try {
        entry.metadata = JSON.parse(options.metadata);
      } catch {
        console.error('Error: Invalid JSON in --metadata');
        process.exit(1);
      }
    }

    const memory = await pipe.addMemory(entry);
    console.log(JSON.stringify({
      id: memory.id,
      type: memory.type,
      content: memory.content,
      importance: memory.importance,
      persistence: memory.persistence,
    }, null, 2));

    await pipe.close();
  });

// Query command
program
  .command('query')
  .description('Search memories by natural language query')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-n, --max-results <number>', 'Maximum results', '10')
  .option('-t, --type <type>', 'Filter by memory type')
  .action(async (options) => {
    const pipe = new MemoryPipe();

    const types = options.type ? [options.type as MemoryType] : undefined;
    const results = await pipe.queryMemories({
      query: options.query,
      maxResults: parseInt(options.maxResults, 10),
      types,
    });

    if (results.length === 0) {
      console.log('No matching memories found.');
      await pipe.close();
      return;
    }

    for (const result of results) {
      console.log(`[${result.memory.type}] (score: ${result.score.toFixed(3)})`);
      console.log(result.memory.content);
      console.log('---');
    }

    await pipe.close();
  });

// Facts command
program
  .command('facts')
  .description('List all extracted facts')
  .option('-n, --max <number>', 'Maximum facts to show', '50')
  .action(async (options) => {
    const pipe = new MemoryPipe();
    const facts = await pipe.getFacts();

    const toShow = facts.slice(0, parseInt(options.max, 10));

    if (toShow.length === 0) {
      console.log('No facts extracted yet.');
      await pipe.close();
      return;
    }

    console.log(`Found ${facts.length} facts (showing ${toShow.length}):\n`);

    for (const fact of toShow) {
      console.log(`[${fact.importance.toFixed(2)}] ${fact.content}`);
      if (fact.metadata.tags && fact.metadata.tags.length > 0) {
        console.log(`  Tags: ${fact.metadata.tags.join(', ')}`);
      }
    }

    await pipe.close();
  });

// Search command
program
  .command('search')
  .description('Search memories by keyword')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('-n, --max-results <number>', 'Maximum results', '10')
  .action(async (options) => {
    const pipe = new MemoryPipe();
    const results = await pipe.searchMemories(options.query, parseInt(options.maxResults, 10));

    if (results.length === 0) {
      console.log('No matching memories found.');
      await pipe.close();
      return;
    }

    console.log(`Found ${results.length} results:\n`);

    for (const result of results) {
      console.log(`[score: ${result.score.toFixed(3)}] ${result.memory.content}`);
    }

    await pipe.close();
  });

// Context command
program
  .command('context')
  .description('Build context for AI sessions')
  .requiredOption('-q, --query <query>', 'Context query')
  .option('-n, --max-entries <number>', 'Maximum entries', '5')
  .action(async (options) => {
    const pipe = new MemoryPipe();
    const context = await pipe.buildContext({
      query: options.query,
      maxEntries: parseInt(options.maxEntries, 10),
    });

    console.log(`Context for: "${options.query}"`);
    console.log(`Total relevance score: ${context.totalScore.toFixed(3)}`);
    console.log(`Memories: ${context.memories.length}\n`);

    for (const memory of context.memories) {
      console.log(`[${memory.type}] ${memory.content}`);
    }

    await pipe.close();
  });

// History command
program
  .command('history')
  .description('View conversation history')
  .requiredOption('-i, --id <id>', 'Conversation ID')
  .action(async (options) => {
    const pipe = new MemoryPipe();
    const conv = await pipe.getConversation(options.id);

    if (!conv) {
      console.log('Conversation not found.');
      await pipe.close();
      return;
    }

    console.log(`Conversation: ${options.id}`);
    console.log(`Created: ${conv.createdAt}`);
    console.log('\nEntries:');

    const entries = conv.entries as Array<{ role: string; content: string }>;
    for (const entry of entries) {
      console.log(`  [${entry.role}] ${entry.content}`);
    }

    await pipe.close();
  });

// Scores command
program
  .command('scores')
  .description('View memory importance and persistence scores')
  .option('-t, --type <type>', 'Filter by memory type')
  .option('-n, --max <number>', 'Maximum memories to show', '20')
  .action(async (options) => {
    const pipe = new MemoryPipe();
    const memories = options.type
      ? await pipe.getMemoriesByType(options.type as MemoryType)
      : await pipe.getAllMemories();

    const toShow = memories.slice(0, parseInt(options.max, 10));

    if (toShow.length === 0) {
      console.log('No memories found.');
      await pipe.close();
      return;
    }

    console.log(`Memory scores (${memories.length} total):\n`);
    console.log('Type        | Importance | Persistence | Content');
    console.log('------------|------------|-------------|--------');

    for (const mem of toShow) {
      const truncated = mem.content.substring(0, 40) + (mem.content.length > 40 ? '...' : '');
      console.log(`${mem.type.padEnd(12)}| ${mem.importance.toFixed(2).padStart(10)} | ${mem.persistence.toFixed(2).padStart(11)} | ${truncated}`);
    }

    await pipe.close();
  });

// Clear command
program
  .command('clear')
  .description('Clear all memories')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log('This will delete ALL memories. Use --force to confirm.');
      process.exit(0);
    }

    const pipe = new MemoryPipe();
    await pipe.clearAll();
    console.log('All memories cleared.');
    await pipe.close();
  });

// Sample config command
program
  .command('sample-config')
  .description('Generate example configuration file')
  .action(() => {
    const config = {
      dbPath: './memories.db',
      maxMemories: 10000,
      importanceThreshold: 0.3,
      persistenceThreshold: 0.2,
    };

    console.log('// .memory-pipe.json');
    console.log(JSON.stringify(config, null, 2));
  });

// Version command
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log('memory-pipe v1.0.0');
  });

program.parse();
