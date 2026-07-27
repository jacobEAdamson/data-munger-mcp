import type { NodeMeta } from '../engine.js';

export const nodeMeta: NodeMeta = {
  description: 'Limit the number of records in an array.',
  inputSlots: [{ name: 'main', description: 'Array of records' }],
  config: {
    count: { type: 'number', required: true, description: 'Maximum number of records to keep' },
  },
};

export function limitNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): unknown[] {
  const records = inputs.main as unknown[];
  const count = config.count as number;
  return records.slice(0, count);
}
