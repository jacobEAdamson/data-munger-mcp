import type { TransformFn } from './registry.js';

export const upperTransform: TransformFn = (value) => String(value).toUpperCase();
export const lowerTransform: TransformFn = (value) => String(value).toLowerCase();
export const trimTransform: TransformFn = (value) => String(value).trim();
