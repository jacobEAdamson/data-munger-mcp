import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  format_number: {
    description: 'Format number with decimals, prefix, and suffix',
    configShape: {
      decimals: { type: 'number', required: false, description: 'Number of decimal places' },
      prefix: { type: 'string', required: false, description: 'Text prepended (e.g. "$")' },
      suffix: { type: 'string', required: false, description: 'Text appended (e.g. "%")' },
    },
  },
  format_date: {
    description: 'Format Date to string using date-fns format tokens',
    configShape: {
      output_format: { type: 'string', required: true, description: 'date-fns format string (e.g. "yyyy-MM-dd", "MMMM do, yyyy")' },
      timezone: { type: 'string', required: false, description: 'IANA timezone (e.g. "America/New_York")' },
    },
  },
  round: {
    description: 'Round number to specified decimals',
    configShape: { decimals: { type: 'number', required: false, description: 'Decimal places (default 0)' } },
  },
  truncate: {
    description: 'Truncate string to length, appending ellipsis',
    configShape: { length: { type: 'number', required: true, description: 'Max characters before truncation' } },
  },
};

export const formatNumberTransform: TransformFn = (value, _record, config) => {
  const { decimals, prefix, suffix } = config as {
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
  const n = Number(value);
  let formatted = decimals !== undefined ? n.toFixed(decimals) : String(n);
  if (prefix) formatted = prefix + formatted;
  if (suffix) formatted = formatted + suffix;
  return formatted;
};

export const formatDateTransform: TransformFn = (value, _record, config) => {
  const { output_format, timezone } = config as { output_format: string; timezone?: string };
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${String(value)}`);

  if (timezone) {
    return formatInTimeZone(d, timezone, output_format);
  }
  return format(d, output_format);
};

export const roundTransform: TransformFn = (value, _record, config) => {
  const { decimals = 0 } = config as { decimals?: number };
  return Number(Number(value).toFixed(decimals));
};

export const truncateTransform: TransformFn = (value, _record, config) => {
  const { length } = config as { length: number };
  const s = String(value);
  return s.length > length ? s.slice(0, length) + '…' : s;
};
