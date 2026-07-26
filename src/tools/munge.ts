import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeInput } from '../lib/normalize.js';
import { runGraph } from '../lib/engine.js';

const ValueTransformSchema = z.union([z.string(), z.any()]);

const FieldDefSchema = z.object({
  label: z.string(),
  value: z.array(ValueTransformSchema),
});

const PipelineStepSchema = z.union([
  z.object({
    load: z.object({ path: z.string(), format: z.enum(['yaml', 'json', 'csv']).optional() }),
  }),
  z.object({
    load_string: z.object({ data: z.string(), format: z.enum(['yaml', 'json', 'csv']).optional() }),
  }),
  z.object({ records: z.object({ jsonpath: z.string() }) }),
  z.object({ map: z.object({ fields: z.array(FieldDefSchema) }) }),
  z.object({ sort: z.object({ by: z.string(), desc: z.boolean().optional() }) }),
  z.object({ limit: z.object({ count: z.number().int().positive() }) }),
  z.object({
    join: z.object({
      inputs: z.object({ left: z.string(), right: z.string() }),
      on: z.string(),
      type: z.enum(['inner', 'left', 'right']).optional(),
    }),
  }),
  z.object({
    group: z.object({
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
  z.object({ template: z.object({ template: z.string() }) }),
  z.object({ output: z.object({ format: z.enum(['markdown', 'json', 'yaml']).optional(), path: z.string().optional() }) }),
]);

const MungerInputSchema = z.object({
  pipeline: z.array(PipelineStepSchema).min(1),
});

export function registerMungeTool(server: McpServer): void {
  server.registerTool(
    'munge',
    {
      title: 'Munge',
      description:
        'Run a linear data munging pipeline: load → records → map/sort/limit → output. Auto-wires inputs.',
      inputSchema: MungerInputSchema,
    },
    async (input: unknown) => {
      const parsed = MungerInputSchema.safeParse(input);
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
