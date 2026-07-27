import jp from 'jsonpath';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  jsonpath: {
    description: 'Extract a field from the current record using JSONPath',
    configShape: { path: { type: 'string', required: true, description: 'JSONPath expression, e.g. $.name' } },
    entryPoint: true,
  },
};

export const jsonpathTransform: TransformFn = (_value, record, config) => {
  const cfg = config as { jsonpath: string } | string;
  const path = typeof cfg === 'string' ? cfg : cfg.jsonpath;
  const result = jp.value(record, path);
  if (result === undefined || result === null) return '';
  return String(result);
};
