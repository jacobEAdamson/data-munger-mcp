import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  regex: {
    description: 'Replace text matching a regex pattern',
    configShape: {
      pattern: { type: 'string', required: true, description: 'Regex pattern' },
      replace: { type: 'string', required: true, description: 'Replacement string' },
    },
  },
};

export const regexTransform: TransformFn = (value, _record, config) => {
  const { pattern, replace } = config as { pattern: string; replace: string };
  return String(value).replace(new RegExp(pattern, 'g'), replace);
};
