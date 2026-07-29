import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeInput } from '../lib/normalize.js';
import { runGraph } from '../lib/engine.js';

const EasyMungeSchema = z.object({
  path: z.string().describe('Path to the data file on disk (YAML, JSON, or CSV)'),
  format: z.enum(['yaml', 'json', 'csv']).optional().describe('Override file format detection (guessed from extension if omitted)'),
  jsonpath: z.string().describe('JSONPath expression to extract records from the loaded data (e.g. "$.items[*]")'),
  fields: z.array(z.string()).min(1).describe('Field names to extract from each record. Generates a jsonpath transform "$.<fieldName>" for each.'),
  fieldMapping: z.record(z.string(), z.string()).optional().describe('Override auto-generated jsonpaths: { label: jsonpath }. Merged with fields — matching keys override the jsonpath, new keys add extra fields.'),
  template: z.string().optional().describe('Optional Liquid template to render each record. Context is { records: [...] }. Omit to get a formatted table.'),
  output: z.enum(['markdown', 'json', 'yaml']).optional().default('markdown').describe('Output format (default: markdown)'),
  outputPath: z.string().optional().describe('Write output to a file on disk'),
});

export { EasyMungeSchema };

/** Build a pipeline from easy_munge params. Exported for testing. */
export function buildEasyMungePipeline(params: {
  path: string;
  format?: string;
  jsonpath: string;
  fields: string[];
  fieldMapping?: Record<string, string>;
  template?: string;
  output: string;
  outputPath?: string;
}): unknown[] {
  const { path, format, jsonpath, fields, fieldMapping, template, output, outputPath } = params;

  // Build field definitions: merge fields[] with fieldMapping
  const seen = new Set<string>();
  const fieldDefs = fields.map((f) => {
    seen.add(f);
    const jp = fieldMapping?.[f] ?? `$.${f}`;
    return { label: f, value: [{ jsonpath: jp }] as unknown[] };
  });

  // Add fieldMapping entries not already covered by fields
  if (fieldMapping) {
    for (const [label, jp] of Object.entries(fieldMapping)) {
      if (!seen.has(label)) {
        fieldDefs.push({ label, value: [{ jsonpath: jp }] as unknown[] });
      }
    }
  }

  // Build pipeline
  const pipeline: unknown[] = [
    { load: { path, ...(format ? { format } : {}) } },
    { records: { jsonpath } },
    { map: { fields: fieldDefs } },
  ];

  // Optional template step
  if (template) {
    pipeline.push({ template: { template } });
  }

  // Output step
  pipeline.push({ output: { format: output, ...(outputPath ? { path: outputPath } : {}) } });

  return pipeline;
}

export function registerEasyMungeTool(server: McpServer): void {
  server.registerTool(
    'easy_munge',
    {
      title: 'Easy Munge',
      description:
        'Load a file, extract records, pick fields, and output a table. A simplified wrapper around the full munge pipeline — no pipeline syntax needed.',
      inputSchema: EasyMungeSchema,
    },
    async (input: unknown) => {
      const parsed = EasyMungeSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid input: ${parsed.error.message}` }],
          isError: true,
        };
      }

      try {
        const pipeline = buildEasyMungePipeline(parsed.data);
        const nodes = normalizeInput({ pipeline });
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