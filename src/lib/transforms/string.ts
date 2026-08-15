import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  upper: { description: 'Convert string to uppercase', example: '"upper"' },
  lower: { description: 'Convert string to lowercase', example: '"lower"' },
  trim: { description: 'Trim whitespace from string', example: '"trim"' },
};

export const upperTransform: TransformFn = (value) => String(value).toUpperCase();
export const lowerTransform: TransformFn = (value) => String(value).toLowerCase();
export const trimTransform: TransformFn = (value) => String(value).trim();
