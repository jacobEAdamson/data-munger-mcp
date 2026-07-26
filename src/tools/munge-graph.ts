import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeInput } from '../lib/normalize.js';
import { runGraph } from '../lib/engine.js';

const ValueTransformSchema = z.union([z.string(), z.any()]);

const FieldDefSchema = z.object({
  label: z.string(),
  value: z.array(ValueTransformSchema),
});

const GraphNodeSchema = z.union([
  z.object({
    id: z.string(),
    load: z.object({ path: z.string(), format: z.enum(['yaml', 'json', 'csv']).optional() }),
  }),
  z.object({
    id: z.string(),
    load_string: z.object({ data: z.string(), format: z.enum(['yaml', 'json', 'csv']).optional() }),
  }),
  z.object({
    id: z.string(),
    records: z.object({ from: z.string().optional(), jsonpath: z.string() }),
  }),
  z.object({
    id: z.string(),
    map: z.object({ from: z.string().optional(), fields: z.array(FieldDefSchema) }),
  }),
  z.object({
    id: z.string(),
    sort: z.object({ from: z.string().optional(), by: z.string(), desc: z.boolean().optional() }),
  }),
  z.object({
    id: z.string(),
    limit: z.object({ from: z.string().optional(), count: z.number().int().positive() }),
  }),
  z.object({
    id: z.string(),
    join: z.object({
      inputs: z.object({ left: z.string(), right: z.string() }),
      on: z.string(),
      type: z.enum(['inner', 'left', 'right']).optional(),
    }),
  }),
  z.object({
    id: z.string(),
    group: z.object({
      from: z.string().optional(),
      by: z.string(),
      agg: z.array(
        z.object({
          field: z.string(),
          op: z.enum(['sum', 'count', 'avg', 'min', 'max']),
          as: z.string().optional(),
        }),
      ),
    }),
  }),
  z.object({
    id: z.string(),
    template: z.object({ from: z.string().optional(), template: z.string() }),
  }),
  z.object({
    id: z.string(),
    output: z.object({ from: z.string().optional(), format: z.enum(['markdown', 'json', 'yaml']).optional(), path: z.string().optional() }),
  }),
]);

const MungerGraphInputSchema = z.object({
  nodes: z.array(GraphNodeSchema).min(1),
});

export function registerMungeGraphTool(server: McpServer): void {
  server.registerTool(
    'munge_graph',
    {
      title: 'Munge Graph DAG',
      description:
        'Run a DAG data munging pipeline with explicit node wiring. Supports multi-source, joins, branching.',
      inputSchema: MungerGraphInputSchema,
    },
    async (input: unknown) => {
      const parsed = MungerGraphInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid input: ${parsed.error.message}` }],
          isError: true,
        };
      }

      try {
        const nodes = normalizeInput(parsed.data);
        const result = await runGraph(nodes);
        return {
          content: [{ type: 'text', text: result.text }],
          isError: result.isError,
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
          isError: true,
        };
      }
    },
  );
}
