import type { TransformFn } from './registry.js';

export const toNumberTransform: TransformFn = (value) => {
  const n = Number(value);
  if (isNaN(n)) throw new Error(`Cannot convert '${String(value)}' to number`);
  return n;
};

export const toStringTransform: TransformFn = (value) => String(value);

export const toDateTransform: TransformFn = (value, _record, config) => {
  const inputFormat = (config as { input_format?: string }).input_format;
  if (inputFormat === 'ISO') {
    return new Date(String(value));
  }
  const d = new Date(String(value));
  if (isNaN(d.getTime())) throw new Error(`Cannot convert '${String(value)}' to date`);
  return d;
};
