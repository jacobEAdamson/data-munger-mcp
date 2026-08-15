import jp from 'jsonpath';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  jsonpath: {
    description: 'Extract a field from the current record using JSONPath. Accepts a bare string path or { path } object.',
    configShape: {
      path: { type: 'string', required: false, description: 'JSONPath expression, e.g. $.name. When config is a bare string, it is used as the path directly.' },
    },
    entryPoint: true,
    example: '{ "jsonpath": "$.name" }',
  },
};

export const jsonpathTransform: TransformFn = (_value, record, config) => {
  const cfg = config as { path?: string; jsonpath?: string } | string;
  const path = typeof cfg === 'string' ? cfg : (cfg.path ?? cfg.jsonpath);
  if (!path) throw new Error('jsonpath transform: config must be a string or { path } object');
  const result = jp.value(record, path);
  if (result === undefined || result === null) return '';
  // Preserve arrays/objects for downstream template iteration
  if (typeof result === 'object') return result;
  return String(result);
};
