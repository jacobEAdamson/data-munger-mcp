import jp from 'jsonpath';
import type { NodeMeta } from '../engine.js';

export const nodeMeta: NodeMeta = {
  description: 'Extract an array of records from a document using JSONPath. Takes output of load or load_string.',
  inputSlots: [{ name: 'main', description: 'Parsed document from load or load_string' }],
  config: {
    jsonpath: { type: 'string', required: true, description: 'JSONPath query, e.g. $.users[*]' },
  },
};

export function recordsNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): unknown[] {
  const jsonpath = config.jsonpath as string;
  const document = inputs.main;

  const result = jp.query(document, jsonpath);

  const records = Array.isArray(result) ? result : [result];
  return records;
}
