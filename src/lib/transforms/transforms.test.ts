import { describe, it, expect } from '@jest/globals';
import { registerAllTransforms, runValuePipeline } from '../transforms/index.js';
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

  it('to_date creates date', () => {
    const result = runValuePipeline(['to_date'], {}, '2024-01-15') as Date;
    expect(result).toBeInstanceOf(Date);
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
  it('format_number', () => {
    const result = runValuePipeline(
      [{ format_number: { decimals: 2, prefix: '$' } }],
      {},
      42.5,
    );
    expect(result).toBe('$42.50');
  });

  it('round', () => {
    expect(runValuePipeline([{ round: { decimals: 1 } }], {}, 3.14159)).toBe(3.1);
  });

  it('truncate', () => {
    expect(runValuePipeline([{ truncate: { length: 5 } }], {}, 'hello world')).toBe('hello…');
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