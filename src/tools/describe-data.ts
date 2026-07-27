import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { load as yamlLoad } from 'js-yaml';

const DescribeDataSchema = z.object({
  data: z
    .unknown()
    .optional()
    .describe('The data to describe (pass inline)'),
  path: z
    .string()
    .optional()
    .describe('Path to a data file on disk (YAML, JSON, or CSV)'),
  format: z
    .enum(['yaml', 'json', 'csv'])
    .optional()
    .describe('File format (detected from extension if omitted)'),
});

export interface FieldShape {
  name: string;
  type: string;
  sample: unknown;
  nullCount: number;
  fields?: FieldShape[];
  itemType?: string;
  count?: number;
}

export interface SchemaResult {
  type: string;
  fields?: FieldShape[];
  fieldCount?: number;
  itemType?: string;
  count?: number;
  sample?: unknown;
  summary: string;
}

export function guessFormat(path: string): string {
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.csv')) return 'csv';
  throw new Error(`Cannot guess format from path: ${path}`);
}

export function loadFile(path: string, format?: string): unknown {
  const fmt = format ?? guessFormat(path);
  const raw = readFileSync(path, 'utf-8');

  switch (fmt) {
    case 'yaml':
      return yamlLoad(raw);
    case 'json':
      return JSON.parse(raw);
    case 'csv': {
      const lines = raw
        .trim()
        .split('\n')
        .map((l) => l.split(','));
      const header = lines[0];
      if (lines.length < 2) throw new Error('CSV file appears empty');
      return lines.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        header.forEach((h, i) => {
          obj[h] = r[i] ?? '';
        });
        return obj;
      });
    }
    default:
      throw new Error(`Unsupported format: ${fmt}`);
  }
}

function inferType(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function describePrimitive(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(val) && !isNaN(Date.parse(val))) return 'date (string)';
    return 'string';
  }
  return typeof val;
}

export function describeValue(val: unknown, depth = 0, maxDepth = 5): SchemaResult {
  if (depth > maxDepth) {
    return { type: '(max depth)', summary: '(max depth reached)' };
  }

  if (val === null) return { type: 'null', summary: 'null' };
  if (val === undefined) return { type: 'undefined', summary: 'undefined' };

  if (Array.isArray(val)) {
    const itemCount = val.length;
    if (itemCount === 0) return { type: 'array', count: 0, summary: 'empty array' };

    const sampleSize = Math.min(3, itemCount);
    const samples = val.slice(0, sampleSize);
    const itemTypes = new Set(samples.map((v) => inferType(v)));

    if (itemTypes.size === 1) {
      const firstItem = samples[0];
      if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
        const nested = describeValue(firstItem, depth + 1, maxDepth);
        return {
          type: `${nested.type}[]`,
          itemType: nested.type,
          fields: nested.fields,
          count: itemCount,
          sample: val.slice(0, 2),
          summary: `array of ${itemCount} ${nested.type}${itemCount !== 1 ? 's' : ''}`,
        };
      }
      const primType = describePrimitive(firstItem);
      return {
        type: `${primType}[]`,
        itemType: primType,
        count: itemCount,
        sample: val.slice(0, 3),
        summary: `array of ${itemCount} ${primType}${itemCount !== 1 ? 's' : ''}`,
      };
    }

    return {
      type: `(${[...itemTypes].join(' | ')})[]`,
      itemType: [...itemTypes].join(' | '),
      count: itemCount,
      sample: val.slice(0, 3),
      summary: `array of ${itemCount} items (mixed types)`,
    };
  }

  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    const fields: FieldShape[] = keys.map((key) => {
      const v = obj[key];

      if (Array.isArray(v)) {
        const arrSample = v.slice(0, 2);
        const arrTypes = new Set(v.map((item) => inferType(item)));

        if (v.length > 0 && arrTypes.size === 1) {
          const firstItem = v[0];
          if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
            const nested = describeValue(firstItem, depth + 1, maxDepth);
            return {
              name: key,
              type: `${nested.type}[]`,
              itemType: nested.type,
              fields: nested.fields,
              count: v.length,
              sample: arrSample,
              nullCount: 0,
            };
          }
          return {
            name: key,
            type: `${describePrimitive(firstItem)}[]`,
            itemType: describePrimitive(firstItem),
            count: v.length,
            sample: arrSample,
            nullCount: 0,
          };
        }

        return {
          name: key,
          type: 'array',
          count: v.length,
          sample: arrSample,
          nullCount: 0,
        };
      }

      if (typeof v === 'object' && v !== null) {
        const nested = describeValue(v, depth + 1, maxDepth);
        return {
          name: key,
          type: nested.type,
          fields: nested.fields,
          sample: null,
          nullCount: 0,
        };
      }

      return {
        name: key,
        type: describePrimitive(v),
        sample: v,
        nullCount: v === null ? 1 : 0,
      };
    });

    return {
      type: 'object',
      fields,
      fieldCount: keys.length,
      summary: `object with ${keys.length} field${keys.length !== 1 ? 's' : ''}: ${keys.map((k) => `${k} (${describePrimitive(obj[k])})`).join(', ')}`,
    };
  }

  return {
    type: describePrimitive(val),
    sample: val,
    summary: `${describePrimitive(val)}: ${JSON.stringify(val)}`,
  };
}

export function registerDescribeDataTool(server: McpServer): void {
  server.registerTool(
    'describe_data',
    {
      title: 'Describe Data',
      description:
        'Infer the schema/shape of a data value or file. Returns field names, types, sample values, and nesting structure. Call this before building munge pipelines to understand your data shape.',
      inputSchema: DescribeDataSchema,
    },
    (input: unknown) => {
      const parsed = DescribeDataSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid input: ${parsed.error.message}` }],
          isError: true,
        };
      }

      try {
        let data: unknown;

        if (parsed.data.path) {
          data = loadFile(parsed.data.path, parsed.data.format);
        } else if (parsed.data.data !== undefined) {
          data = parsed.data.data;
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'Provide either `data` (inline value) or `path` (+ optional `format`) to describe a file.',
              },
            ],
            isError: true,
          };
        }

        const result = describeValue(data);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [
            { type: 'text', text: err instanceof Error ? err.message : String(err) },
          ],
          isError: true,
        };
      }
    },
  );
}