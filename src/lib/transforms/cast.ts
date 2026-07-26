import { parse, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  to_number: { description: 'Parse string to number' },
  to_string: { description: 'Convert value to string' },
  to_date: {
    description: 'Parse date string to Date object using date-fns',
    configShape: {
      input_format: { type: 'string', required: false, description: 'date-fns parse format string (e.g. "dd/MM/yyyy"). Omit or "ISO" for ISO 8601' },
      timezone: { type: 'string', required: false, description: 'IANA timezone (e.g. "America/New_York")' },
    },
  },
};

export const toNumberTransform: TransformFn = (value) => {
  const n = Number(value);
  if (isNaN(n)) throw new Error(`Cannot convert '${String(value)}' to number`);
  return n;
};

export const toStringTransform: TransformFn = (value) => String(value);

export const toDateTransform: TransformFn = (value, _record, config) => {
  const { input_format, timezone } = config as { input_format?: string; timezone?: string };
  let d: Date;

  if (input_format && input_format !== 'ISO') {
    const s = String(value);
    d = parse(s, input_format, new Date());
    if (isNaN(d.getTime())) throw new Error(`Cannot convert '${s}' with format '${input_format}'`);
  } else {
    d = parseISO(String(value));
    if (isNaN(d.getTime())) throw new Error(`Cannot convert '${String(value)}' to date`);
  }

  if (timezone) {
    d = toZonedTime(d, timezone);
  }

  return d;
};
