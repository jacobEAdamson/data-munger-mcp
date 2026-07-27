import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  upper: { description: 'Convert string to uppercase' },
  lower: { description: 'Convert string to lowercase' },
  trim: { description: 'Trim whitespace from string' },
};

export const upperTransform: TransformFn = (value) => String(value).toUpperCase();
export const lowerTransform: TransformFn = (value) => String(value).toLowerCase();
export const trimTransform: TransformFn = (value) => String(value).trim();
