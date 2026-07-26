import jp from 'jsonpath';
import type { TransformFn } from './registry.js';

export const concatTransform: TransformFn = (_value, record, config) => {
  const { values } = config as { values: string[] };
  return values
    .map((v) => {
      if (v.startsWith('$.')) {
        const result = jp.value(record, v);
        return result === undefined || result === null ? '' : String(result);
      }
      return v;
    })
    .join('');
};
