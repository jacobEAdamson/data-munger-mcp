import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAllTransformMetas } from '../lib/transforms/registry.js';

const DescribeTransformsSchema = z.object({
  filter: z.string().optional().describe('Optional partial name filter to narrow results'),
});

export function registerDescribeTransformsTool(server: McpServer): void {
  server.registerTool(
    'describe_transforms',
    {
      title: 'Describe Transforms',
      description:
        'List all available value transforms with descriptions and config shapes. Call this to discover what transforms exist before using transform_value.',
      inputSchema: DescribeTransformsSchema,
    },
    (input: unknown) => {
      const parsed = DescribeTransformsSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid input: ${parsed.error.message}` }],
          isError: true,
        };
      }

      const all = getAllTransformMetas();
      const filter = parsed.data.filter?.toLowerCase();

      const filtered = filter
        ? all.filter(({ name }) => name.includes(filter))
        : all;

      const lines = filtered.map(({ name, meta }) => {
        let entry = `## ${name}\n${meta.description}\n`;
        if (meta.entryPoint) entry += `- entryPoint: true (accepts $.field references)\n`;
        if (meta.configShape) {
          entry += `\n**Config:**\n`;
          for (const [key, val] of Object.entries(meta.configShape)) {
            const req = val.required ? '**required**' : 'optional';
            entry += `- \`${key}\` (${val.type}, ${req}) — ${val.description}\n`;
          }
        }
        return entry;
      });

      return {
        content: [
          {
            type: 'text',
            text:
              lines.length > 0
                ? lines.join('\n')
                : `No transforms matching '${parsed.data.filter}'`,
          },
        ],
      };
    },
  );
}