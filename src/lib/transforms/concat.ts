import jp from 'jsonpath';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  concat: {
    description: 'Concatenate values with $.field references',
    configShape: { values: { type: 'string[]', required: true, description: 'Array of literal strings and $.field refs' } },
    entryPoint: true,
  },
};

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
