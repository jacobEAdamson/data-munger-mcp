import { load as yamlLoad } from 'js-yaml';
import { parseCsv } from '../parse-csv.js';
import type { NodeMeta } from '../engine.js';

export const nodeMeta: NodeMeta = {
  description: 'Parse inline data string (YAML, JSON, or CSV). Produces a parsed document.',
  inputSlots: [],
  config: {
    data: { type: 'string', required: true, description: 'Inline data string' },
    format: { type: 'yaml | json | csv', required: false, description: 'Override format detection' },
  },
};

export function loadStringNode(
  config: Record<string, unknown>,
  _inputs: Record<string, unknown>,
): unknown {
  const data = config.data as string;
  const format = (config.format as string | undefined) ?? 'json';

  switch (format) {
    case 'yaml':
      return yamlLoad(data);
    case 'json':
      return JSON.parse(data);
    case 'csv':
      return parseCsv(data, 'data');
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
