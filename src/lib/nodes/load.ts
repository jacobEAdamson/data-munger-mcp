import { readFile } from 'node:fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { parseCsv } from '../parse-csv.js';
import type { NodeMeta } from '../engine.js';

export const nodeMeta: NodeMeta = {
  description: 'Load a file from disk (YAML, JSON, or CSV). Produces a parsed document.',
  inputSlots: [],
  config: {
    path: { type: 'string', required: true, description: 'Path to the file on disk' },
    format: { type: 'yaml | json | csv', required: false, description: 'Override format detection from extension' },
  },
};

export async function loadNode(
  config: Record<string, unknown>,
  _inputs: Record<string, unknown>,
): Promise<unknown> {
  const path = config.path as string;
  const format = (config.format as string | undefined) ?? guessFormat(path);
  const raw = await readFile(path, 'utf-8');

  switch (format) {
    case 'yaml':
      return yamlLoad(raw);
    case 'json':
      return JSON.parse(raw);
    case 'csv':
      return parseCsv(raw, 'file');
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function guessFormat(path: string): string {
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.csv')) return 'csv';
  throw new Error(`Cannot guess format from path: ${path}`);
}
