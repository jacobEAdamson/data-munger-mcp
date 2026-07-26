import {
  addYears,
  addMonths,
  addWeeks,
  addDays,
  addHours,
  addMinutes,
  addSeconds,
  differenceInYears,
  differenceInMonths,
  differenceInWeeks,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  startOfYear,
  startOfMonth,
  startOfWeek,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfSecond,
  parseISO,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  date_add: {
    description: 'Add or subtract a duration from a date. Negative values subtract.',
    configShape: {
      years: { type: 'number', required: false, description: 'Years to add' },
      months: { type: 'number', required: false, description: 'Months to add' },
      weeks: { type: 'number', required: false, description: 'Weeks to add' },
      days: { type: 'number', required: false, description: 'Days to add' },
      hours: { type: 'number', required: false, description: 'Hours to add' },
      minutes: { type: 'number', required: false, description: 'Minutes to add' },
      seconds: { type: 'number', required: false, description: 'Seconds to add' },
      timezone: { type: 'string', required: false, description: 'IANA timezone' },
    },
  },
  date_diff: {
    description: 'Get difference between two dates in specified unit',
    configShape: {
      unit: { type: 'string', required: true, description: 'Unit: years, months, weeks, days, hours, minutes, seconds' },
      to: { type: 'string', required: false, description: 'Target date string or $.field reference. Defaults to comparing with current value' },
    },
  },
  date_truncate: {
    description: 'Truncate date to start of specified unit',
    configShape: {
      unit: { type: 'string', required: true, description: 'Unit: year, month, week, day, hour, minute, second' },
      timezone: { type: 'string', required: false, description: 'IANA timezone' },
    },
  },
  date_tz: {
    description: 'Convert date between timezones',
    configShape: {
      target: { type: 'string', required: true, description: 'Target IANA timezone (e.g. "America/New_York")' },
      source: { type: 'string', required: false, description: 'Source IANA timezone if input is not UTC' },
    },
  },
};

/** Parse value to Date if it's a string, pass through if already Date. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const d = parseISO(String(value));
  if (isNaN(d.getTime())) throw new Error(`Cannot parse date: '${String(value)}'`);
  return d;
}

/** Resolve a reference string — literal date or $.field from record. */
function resolveTo(value: string | undefined, record: Record<string, unknown>): Date | undefined {
  if (value === undefined) return undefined;
  if (value.startsWith('$.')) {
    const keys = value.slice(2).split('.');
    let v: unknown = record;
    for (const k of keys) {
      if (v === null || typeof v !== 'object') return undefined;
      v = (v as Record<string, unknown>)[k];
    }
    if (v === undefined || v === null) return undefined;
    return toDate(v);
  }
  return toDate(value);
}

const ADD_FNS: Record<string, (date: Date, amount: number) => Date> = {
  years: addYears,
  months: addMonths,
  weeks: addWeeks,
  days: addDays,
  hours: addHours,
  minutes: addMinutes,
  seconds: addSeconds,
};

const DIFF_FNS: Record<string, ((left: Date, right: Date) => number) | undefined> = {
  years: differenceInYears,
  months: differenceInMonths,
  weeks: differenceInWeeks,
  days: differenceInDays,
  hours: differenceInHours,
  minutes: differenceInMinutes,
  seconds: differenceInSeconds,
};

const TRUNCATE_FNS: Record<string, ((date: Date) => Date) | undefined> = {
  year: startOfYear,
  month: startOfMonth,
  week: startOfWeek,
  day: startOfDay,
  hour: startOfHour,
  minute: startOfMinute,
  second: startOfSecond,
};

// ─── date_add ───────────────────────────────────────────────────────────

export const dateAddTransform: TransformFn = (value, _record, config) => {
  const cfg = config as {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    timezone?: string;
  };
  let d = toDate(value);

  for (const [unit, fn] of Object.entries(ADD_FNS)) {
    const amount = cfg[unit as keyof typeof cfg];
    if (amount !== undefined) {
      // date-fns add functions handle negative values for subtraction
      d = fn(d, amount as number);
    }
  }

  if (cfg.timezone) {
    d = toZonedTime(d, cfg.timezone);
  }

  return d;
};

// ─── date_diff ──────────────────────────────────────────────────────────

export const dateDiffTransform: TransformFn = (value, record, config) => {
  const { unit, to } = config as { unit: string; to?: string };
  const d = toDate(value);
  const targetDate = resolveTo(to, record);
  if (!targetDate) throw new Error(`date_diff: cannot resolve 'to' date from '${to}'`);

  const diffFn = DIFF_FNS[unit];
  if (!diffFn) throw new Error(`date_diff: unknown unit '${unit}'`);

  return diffFn(d, targetDate);
};

// ─── date_truncate ──────────────────────────────────────────────────────

export const dateTruncateTransform: TransformFn = (value, _record, config) => {
  const { unit, timezone } = config as { unit: string; timezone?: string };
  let d = toDate(value);

  if (timezone) {
    d = fromZonedTime(d, timezone);
  }

  const truncFn = TRUNCATE_FNS[unit];
  if (!truncFn) throw new Error(`date_truncate: unknown unit '${unit}'`);

  let truncated = truncFn(d);

  if (timezone) {
    truncated = toZonedTime(truncated, timezone);
  }

  return truncated;
};

// ─── date_tz ────────────────────────────────────────────────────────────

export const dateTzTransform: TransformFn = (value, _record, config) => {
  const { target, source } = config as { target: string; source?: string };
  let d = toDate(value);

  if (source) {
    // Input is in source tz — convert to UTC first
    d = fromZonedTime(d, source);
  }

  // Return date "in" target timezone (for formatting)
  return toZonedTime(d, target);
};