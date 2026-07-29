import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { runValuePipeline } from '../lib/transforms/registry.js';

const EasyConvertSchema = z.object({
  value: z.unknown().optional().describe('The value to transform (inline). Use this for text/string values.'),
  path: z.string().optional().describe('Path to a file on disk. Its contents are read and used as the value to transform.'),
  transform: z.string().describe('Transform to apply. Common options: base64_encode, base64_decode, url_encode, url_decode, html_escape, html_unescape, html_to_md, upper, lower, trim, to_number, to_string.'),
  outputPath: z.string().optional().describe('Write the transformed result to a file on disk.'),
});

export { EasyConvertSchema };

/** Format a result value as a string for display. Exported for testing. */
export function formatResult(result: unknown): string {
  if (result === undefined || result === null) return '';
  if (typeof result === 'object') return JSON.stringify(result);
  return String(result);
}

/** Resolve the value to transform: read file if path given, else use inline value. Exported for testing. */
export async function resolveConvertValue(
  value: unknown,
  path?: string,
): Promise<unknown> {
  if (path) return readFile(path, 'utf-8');
  return value;
}

export function registerEasyConvertTool(server: McpServer): void {
  server.registerTool(
    'easy_convert',
    {
      title: 'Easy Convert',
      description:
        'Apply a single transform to a value or file contents. Simpler than transform_value — just one transform at a time, with optional file read/write.',
      inputSchema: EasyConvertSchema,
    },
    async (input: unknown) => {
      const parsed = EasyConvertSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid input: ${parsed.error.message}` }],
          isError: true,
        };
      }

      const { value, path, transform, outputPath } = parsed.data;

      if (value === undefined && !path) {
        return {
          content: [{ type: 'text', text: 'Provide either "value" (inline) or "path" (file to read).' }],
          isError: true,
        };
      }

      try {
        const resolvedValue = await resolveConvertValue(value, path);
        const result = runValuePipeline([transform], {}, resolvedValue);

        // Write to file if requested
        if (outputPath) {
          await writeFile(outputPath, formatResult(result), 'utf-8');
        }

        return {
          content: [{ type: 'text', text: formatResult(result) }],
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