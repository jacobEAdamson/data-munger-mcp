import type { TransformFn } from './registry.js';

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
  const { output_format } = config as { output_format: string };
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${String(value)}`);

  const pad = (n: number): string => String(n).padStart(2, '0');
  const map: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };

  return output_format.replace(/YYYY|MM|DD|HH|mm|ss/g, (k) => map[k] ?? k);
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
