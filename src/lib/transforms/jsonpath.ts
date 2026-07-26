import jp from 'jsonpath';
import type { TransformFn } from './registry.js';

export const jsonpathTransform: TransformFn = (_value, record, config) => {
  const cfg = config as { jsonpath: string } | string;
  const path = typeof cfg === 'string' ? cfg : cfg.jsonpath;
  const result = jp.value(record, path);
  if (result === undefined || result === null) return '';
  return String(result);
};
