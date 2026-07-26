import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAllNodeMetas } from '../lib/engine.js';

const DescribePipelineSchema = z.object({
  filter: z.string().optional().describe('Optional partial node type filter to narrow results'),
});

export function registerDescribePipelineTool(server: McpServer): void {
  server.registerTool(
    'describe_pipeline',
    {
      title: 'Describe Pipeline Nodes',
      description:
        'List all available pipeline node types with descriptions, config shapes, and wiring info. Call this to understand what nodes can be used in munge or munge_graph pipelines.',
      inputSchema: DescribePipelineSchema,
    },
    (input: unknown) => {
      const parsed = DescribePipelineSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid input: ${parsed.error.message}` }],
          isError: true,
        };
      }

      const all = getAllNodeMetas();
      const filter = parsed.data.filter?.toLowerCase();
      const filtered = filter
        ? all.filter(({ name }) => name.includes(filter))
        : all;

      const lines = filtered.map(({ name, meta }) => {
        let entry = `## ${name}\n${meta.description}\n`;

        if (meta.inputSlots.length > 0) {
          entry += `\n**Input slots:**\n`;
          for (const slot of meta.inputSlots) {
            entry += `- \`${slot.name}\`: ${slot.description}\n`;
          }
        } else {
          entry += `\n**Input slots:** (none — source node)\n`;
        }

        entry += `\n**Config:**\n`;
        for (const [key, val] of Object.entries(meta.config)) {
          const req = val.required ? '**required**' : 'optional';
          entry += `- \`${key}\` (${val.type}, ${req}) — ${val.description}\n`;
        }

        if (meta.note) {
          entry += `\n> ${meta.note}\n`;
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
                : `No pipeline nodes matching '${parsed.data.filter}'`,
          },
        ],
      };
    },
  );
}