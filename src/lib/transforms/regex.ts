import type { TransformFn } from './registry.js';

export const regexTransform: TransformFn = (value, _record, config) => {
  const { pattern, replace } = config as { pattern: string; replace: string };
  return String(value).replace(new RegExp(pattern, 'g'), replace);
};
