import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MemoryPipe } from '../index.js';
import { MemoryType } from '../types/index.js';

const ADD_SCHEMA = z.object({
  type: z.enum(['fact', 'conversation', 'preference', 'task']),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().optional(),
});

const QUERY_SCHEMA = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().optional(),
  type: z.enum(['fact', 'conversation', 'preference', 'task']).optional(),
});

const CONTEXT_SCHEMA = z.object({
  query: z.string().min(1),
  maxEntries: z.number().int().positive().optional(),
});

const FACTS_SCHEMA = z.object({});

const SEARCH_SCHEMA = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().optional(),
});

const CLEAR_SCHEMA = z.object({
  force: z.boolean().optional(),
});

export class McpToolServer {
  private server: McpServer;
  private pipe: MemoryPipe;

  constructor() {
    this.pipe = new MemoryPipe();
    this.server = new McpServer({
      name: 'memory-pipe',
      version: '1.0.0',
    });

    this.registerTools();
  }

  private registerTools(): void {
    // Add memory tool
    this.server.registerTool(
      'add_memory',
      {
        description: 'Add a new memory to the knowledge base',
        inputSchema: ADD_SCHEMA.shape,
      },
      async (args: Record<string, unknown>) => {
        try {
          const memory = await this.pipe.addMemory({
            type: args.type as MemoryType,
            content: args.content as string,
            metadata: (args.metadata as Record<string, unknown>) || undefined,
            conversationId: (args.conversationId as string) || undefined,
          });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                id: memory.id,
                type: memory.type,
                content: memory.content,
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }, null, 2),
            }],
            isError: true,
          };
        }
      }
    );

    // Query tool
    this.server.registerTool(
      'query_memories',
      {
        description: 'Search memories using natural language',
        inputSchema: QUERY_SCHEMA.shape,
      },
      async (args: Record<string, unknown>) => {
        try {
          const results = await this.pipe.queryMemories({
            query: args.query as string,
            maxResults: (args.maxResults as number) || 10,
            types: (args.type as MemoryType[]) || undefined,
          });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                results: results.map(r => ({
                  id: r.memory.id,
                  type: r.memory.type,
                  content: r.memory.content,
                  score: r.score,
                })),
                total: results.length,
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }, null, 2),
            }],
            isError: true,
          };
        }
      }
    );

    // Get facts tool
    this.server.registerTool(
      'get_facts',
      {
        description: 'Get all extracted facts from conversations',
        inputSchema: FACTS_SCHEMA.shape,
      },
      async () => {
        try {
          const facts = await this.pipe.getFacts();
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                facts: facts.map(f => ({
                  id: f.id,
                  content: f.content,
                  importance: f.importance,
                  tags: f.metadata.tags,
                })),
                total: facts.length,
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }, null, 2),
            }],
            isError: true,
          };
        }
      }
    );

    // Build context tool
    this.server.registerTool(
      'build_context',
      {
        description: 'Build context from relevant memories for AI sessions',
        inputSchema: CONTEXT_SCHEMA.shape,
      },
      async (args: Record<string, unknown>) => {
        try {
          const context = await this.pipe.buildContext({
            query: args.query as string,
            maxEntries: (args.maxEntries as number) || 5,
          });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                memories: context.memories.map(m => ({
                  id: m.id,
                  type: m.type,
                  content: m.content,
                  importance: m.importance,
                })),
                totalScore: context.totalScore,
                memoryCount: context.memories.length,
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }, null, 2),
            }],
            isError: true,
          };
        }
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MemoryPipe MCP Server running on stdio');
  }

  async stop(): Promise<void> {
    await this.pipe.close();
  }
}
