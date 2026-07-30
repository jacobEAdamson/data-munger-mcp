import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { runValuePipeline } from '../lib/transforms/registry.js';

const TransformStepSchema = z.union([
  z.string(),
  z.record(z.string(), z.unknown()),
]);

const TransformValueSchema = z.object({
  value: z.unknown().describe('The input value to transform'),
  transforms: z
    .array(TransformStepSchema)
    .min(1)
    .describe('Value pipeline transforms to apply in order'),
});

export function registerTransformValueTool(server: McpServer): void {
  server.registerTool(
    'transform_value',
    {
      title: 'Transform Value',
      description:
        'Run a value through a pipeline of transforms. Useful for testing transform chains or cleaning single values.',
      inputSchema: TransformValueSchema,
    },
    (input: unknown) => {
      const parsed = TransformValueSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Invalid input: ${parsed.error.message}`,
            },
          ],
          isError: true,
        };
      }

      const { value, transforms } = parsed.data;

      try {
        const result = runValuePipeline(transforms, (value ?? {}) as Record<string, unknown>, value);
        return {
          content: [
            {
              type: 'text',
              text:
                result === undefined || result === null
                  ? ''
                  : typeof result === 'object'
                    ? JSON.stringify(result)
                    : String(result),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: err instanceof Error ? err.message : String(err),
            },
          ],
          isError: true,
        };
      }
    },
  );
}