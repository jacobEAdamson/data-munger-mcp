import { describe, it, expect } from '@jest/globals';
import { runValuePipeline, getAllTransformMetas } from '../transforms/index.js';
import { registerAll } from '../register.js';

registerAll();

describe('encode transforms', () => {
  it('base64_encode', () => {
    const result = runValuePipeline(['base64_encode'], {}, 'hello world');
    expect(result).toBe('aGVsbG8gd29ybGQ=');
  });

  it('base64_decode', () => {
    const result = runValuePipeline(['base64_decode'], {}, 'aGVsbG8gd29ybGQ=');
    expect(result).toBe('hello world');
  });

  it('url_encode', () => {
    const result = runValuePipeline(['url_encode'], {}, 'a & b');
    expect(result).toBe('a%20%26%20b');
  });

  it('url_decode', () => {
    const result = runValuePipeline(['url_decode'], {}, 'a%20%26%20b');
    expect(result).toBe('a & b');
  });

  it('html_escape', () => {
    const result = runValuePipeline(['html_escape'], {}, '<tag> & "quote"');
    expect(result).toBe('&lt;tag&gt; &amp; &quot;quote&quot;');
  });

  it('html_unescape', () => {
    const result = runValuePipeline(['html_unescape'], {}, '&lt;tag&gt; &amp; &quot;quote&quot;');
    expect(result).toBe('<tag> & "quote"');
  });
});

describe('cast transforms', () => {
  it('to_number', () => {
    expect(runValuePipeline(['to_number'], {}, '42.5')).toBe(42.5);
  });

  it('to_number throws on invalid', () => {
    expect(() => runValuePipeline(['to_number'], {}, 'not-a-number')).toThrow();
  });

  it('to_string', () => {
    expect(runValuePipeline(['to_string'], {}, 42)).toBe('42');
  });

  it('to_date creates date from ISO', () => {
    const result = runValuePipeline(['to_date'], {}, '2024-01-15') as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  it('to_date parses with custom format', () => {
    const result = runValuePipeline(
      [{ to_date: { input_format: 'dd/MM/yyyy' } }],
      {},
      '15/01/2024',
    ) as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(15);
  });

  it('to_date throws on format mismatch', () => {
    expect(() =>
      runValuePipeline([{ to_date: { input_format: 'dd/MM/yyyy' } }], {}, '2024-15-01'),
    ).toThrow('Cannot convert');
  });

  it('to_date with ISO format flag works', () => {
    const result = runValuePipeline(
      [{ to_date: { input_format: 'ISO' } }],
      {},
      '2024-06-15T10:30:00Z',
    ) as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  it('to_date with timezone', () => {
    const result = runValuePipeline(
      [{ to_date: { timezone: 'America/New_York' } }],
      {},
      '2024-01-15T05:00:00Z',
    ) as Date;
    expect(result).toBeInstanceOf(Date);
    // Date should be in UTC, timezone just marks it for formatting
    expect(result.getFullYear()).toBe(2024);
  });
});

describe('string transforms', () => {
  it('upper', () => {
    expect(runValuePipeline(['upper'], {}, 'hello')).toBe('HELLO');
  });

  it('lower', () => {
    expect(runValuePipeline(['lower'], {}, 'HELLO')).toBe('hello');
  });

  it('trim', () => {
    expect(runValuePipeline(['trim'], {}, '  hello  ')).toBe('hello');
  });
});

describe('format transforms', () => {
  it('format_number with decimals', () => {
    const result = runValuePipeline(
      [{ format_number: { decimals: 2, prefix: '$' } }],
      {},
      42.5,
    );
    expect(result).toBe('$42.50');
  });

  it('format_number with suffix', () => {
    const result = runValuePipeline(
      [{ format_number: { suffix: '%' } }],
      {},
      95,
    );
    expect(result).toBe('95%');
  });

  it('format_number without options', () => {
    const result = runValuePipeline([{ format_number: {} }], {}, 42);
    expect(result).toBe('42');
  });

  it('format_date with date-fns pattern', () => {
    const d = new Date('2024-03-15T14:30:00');
    const result = runValuePipeline(
      [{ format_date: { output_format: 'yyyy-MM-dd' } }],
      {},
      d,
    );
    expect(result).toBe('2024-03-15');
  });

  it('format_date with time', () => {
    const d = new Date('2024-03-15T14:30:00');
    const result = runValuePipeline(
      [{ format_date: { output_format: 'HH:mm:ss' } }],
      {},
      d,
    );
    expect(result).toBe('14:30:00');
  });

  it('format_date with timezone', () => {
    const d = new Date('2024-03-15T18:00:00Z'); // 18:00 UTC
    const result = runValuePipeline(
      [{ format_date: { output_format: 'HH:mm', timezone: 'America/New_York' } }],
      {},
      d,
    );
    // 18:00 UTC = 14:00 ET (UTC-4 in March)
    expect(result).toBe('14:00');
  });

  it('format_date throws on invalid date', () => {
    expect(() =>
      runValuePipeline([{ format_date: { output_format: 'yyyy' } }], {}, 'not-a-date'),
    ).toThrow('Invalid date');
  });

  it('round', () => {
    expect(runValuePipeline([{ round: { decimals: 1 } }], {}, 3.14159)).toBe(3.1);
  });

  it('round with no decimals', () => {
    expect(runValuePipeline([{ round: {} }], {}, 3.9)).toBe(4);
  });

  it('truncate', () => {
    expect(runValuePipeline([{ truncate: { length: 5 } }], {}, 'hello world')).toBe('hello…');
  });

  it('truncate short string', () => {
    expect(runValuePipeline([{ truncate: { length: 20 } }], {}, 'hi')).toBe('hi');
  });
});

describe('jsonpath transform', () => {
  it('extracts from record', () => {
    const result = runValuePipeline([{ jsonpath: '$.name' }], { name: 'Alice' });
    expect(result).toBe('Alice');
  });
});

describe('regex transform', () => {
  it('replaces pattern', () => {
    const result = runValuePipeline(
      [{ regex: { pattern: '\\D', replace: '' } }],
      {},
      '(555) 123-4567',
    );
    expect(result).toBe('5551234567');
  });
});

describe('chained transforms', () => {
  it('jsonpath + to_number + format_number', () => {
    const result = runValuePipeline(
      [{ jsonpath: '$.val' }, 'to_number', { format_number: { decimals: 2, prefix: '$' } }],
      { val: '99.9' },
    );
    expect(result).toBe('$99.90');
  });

  it('url_encode + base64_encode', () => {
    const result = runValuePipeline(['url_encode', 'base64_encode'], {}, 'a&b');
    expect(result).toBe('YSUyNmI=');
  });
});

describe('date_add transform', () => {
  it('adds days', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    const result = runValuePipeline([{ date_add: { days: 10 } }], {}, d) as Date;
    expect(result.getUTCDate()).toBe(11);
  });

  it('subtracts months', () => {
    const d = new Date(Date.UTC(2024, 4, 15)); // May 15
    const result = runValuePipeline([{ date_add: { months: -2 } }], {}, d) as Date;
    expect(result.getUTCMonth()).toBe(2); // March
  });

  it('adds multiple units', () => {
    const d = new Date(Date.UTC(2024, 0, 1)); // Jan 1
    const result = runValuePipeline(
      [{ date_add: { years: 1, months: 2, days: 3 } }],
      {},
      d,
    ) as Date;
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(2); // March
    expect(result.getUTCDate()).toBe(4);
  });

  it('parses string input', () => {
    const result = runValuePipeline(
      [{ date_add: { days: 5 } }],
      {},
      '2024-01-10',
    ) as Date;
    expect(result.getUTCDate()).toBe(15);
  });
});

describe('date_diff transform', () => {
  it('diff days between two dates', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const result = runValuePipeline(
      [{ date_diff: { unit: 'days', to: '2024-01-10T00:00:00Z' } }],
      {},
      d,
    );
    expect(result).toBe(5);
  });

  it('diff years', () => {
    const d = new Date('2024-06-15T00:00:00Z');
    const result = runValuePipeline(
      [{ date_diff: { unit: 'years', to: '2020-06-15T00:00:00Z' } }],
      {},
      d,
    );
    expect(result).toBe(4);
  });

  it('diff with $.field reference', () => {
    const result = runValuePipeline(
      [{ date_diff: { unit: 'days', to: '$.start' } }],
      { start: '2024-01-01T00:00:00Z' },
      '2024-01-11T00:00:00Z',
    );
    expect(result).toBe(10);
  });

  it('throws on unknown unit', () => {
    expect(() =>
      runValuePipeline(
        [{ date_diff: { unit: 'decades', to: '2024-01-01' } }],
        {},
        '2024-06-15',
      ),
    ).toThrow('unknown unit');
  });
});

describe('date_truncate transform', () => {
  it('truncates to start of month', () => {
    const d = new Date('2024-03-15T14:30:00');
    const result = runValuePipeline([{ date_truncate: { unit: 'month' } }], {}, d) as Date;
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(1);
  });

  it('truncates to start of year', () => {
    const d = new Date('2024-06-15T10:30:00');
    const result = runValuePipeline([{ date_truncate: { unit: 'year' } }], {}, d) as Date;
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
    expect(result.getFullYear()).toBe(2024);
  });

  it('truncates to start of week', () => {
    const d = new Date('2024-03-13T14:30:00'); // Wednesday
    const result = runValuePipeline(
      [{ date_truncate: { unit: 'week' } }],
      {},
      d,
    ) as Date;
    // Sunday by default for startOfWeek
    expect(result.getDay()).toBe(0);
  });

  it('throws on unknown unit', () => {
    expect(() =>
      runValuePipeline([{ date_truncate: { unit: 'fortnight' } }], {}, new Date()),
    ).toThrow('unknown unit');
  });
});

describe('date_tz transform', () => {
  it('converts UTC to US/Eastern', () => {
    const d = new Date('2024-03-15T18:00:00Z');
    const result = runValuePipeline(
      [{ date_tz: { target: 'America/New_York' } }],
      {},
      d,
    );
    // Should be a Date reflecting ET wall time
    expect(result).toBeInstanceOf(Date);
  });

  it('converts with source timezone', () => {
    const d = new Date('2024-03-15T14:00:00Z');
    const result = runValuePipeline(
      [{ date_tz: { target: 'America/New_York', source: 'America/Chicago' } }],
      {},
      d,
    );
    expect(result).toBeInstanceOf(Date);
  });
});

describe('transform metadata', () => {
  it('all 25 transforms have metadata', () => {
    const metas = getAllTransformMetas();
    expect(metas.length).toBe(25);
  });

  it('config transforms have configShape', () => {
    const metas = getAllTransformMetas();
    const formatDate = metas.find((m) => m.name === 'format_date');
    if (formatDate) {
      expect(formatDate.meta.configShape).toBeDefined();
      expect(formatDate.meta.configShape?.output_format).toBeDefined();
    } else {
      throw new Error('format_date not found in metas');
    }
  });

  it('no-config transforms omit configShape', () => {
    const metas = getAllTransformMetas();
    const upper = metas.find((m) => m.name === 'upper');
    if (upper) {
      expect(upper.meta.configShape).toBeUndefined();
    } else {
      throw new Error('upper not found in metas');
    }
  });

  it('entryPoint transforms are marked', () => {
    const metas = getAllTransformMetas();
    const jsonpath = metas.find((m) => m.name === 'jsonpath');
    if (jsonpath) {
      expect(jsonpath.meta.entryPoint).toBe(true);
    } else {
      throw new Error('jsonpath not found in metas');
    }
  });
});

describe('date branches', () => {
  it('date_truncate with timezone', () => {
    const d = new Date('2024-03-15T18:00:00Z');
    const result = runValuePipeline(
      [{ date_truncate: { unit: 'day', timezone: 'America/New_York' } }],
      {},
      d,
    ) as Date;
    expect(result).toBeInstanceOf(Date);
  });

  it('date_diff throws on unknown unit', () => {
    expect(() =>
      runValuePipeline(
        [{ date_diff: { unit: 'decades', to: '2024-01-01' } }],
        {},
        '2024-06-15',
      ),
    ).toThrow('unknown unit');
  });

  it('date_diff throws on unresolvable to', () => {
    expect(() =>
      runValuePipeline(
        [{ date_diff: { unit: 'days', to: '$.nonexistent' } }],
        {},
        '2024-06-15',
      ),
    ).toThrow('cannot resolve');
  });

  it('date_add with timezone', () => {
    const d = new Date('2024-03-15T18:00:00Z');
    const result = runValuePipeline(
      [{ date_add: { days: 1, timezone: 'America/New_York' } }],
      {},
      d,
    ) as Date;
    expect(result).toBeInstanceOf(Date);
  });
});