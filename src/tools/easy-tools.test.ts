import { describe, it, expect } from '@jest/globals';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { registerAll } from '../lib/register.js';
import { normalizeInput } from '../lib/normalize.js';
import { runGraph } from '../lib/engine.js';
import { runValuePipeline } from '../lib/transforms/registry.js';
import { buildEasyMungePipeline, handleEasyMunge } from './easy-munge.js';
import { formatResult, resolveConvertValue, handleEasyConvert } from './easy-convert.js';

registerAll();

interface ToolResponse {
  content: { type: string; text: string }[];
  isError?: boolean;
}

/** Wrap handler to cast result so tests can access .content and .isError. */
async function munge(input: Record<string, unknown>): Promise<ToolResponse> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return (await handleEasyMunge(input)) as ToolResponse;
}

async function convert(input: Record<string, unknown>): Promise<ToolResponse> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return (await handleEasyConvert(input)) as ToolResponse;
}

function tempFile(name: string, content: string): string {
  const dir = join(tmpdir(), 'data-munger-test-' + randomUUID());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

// ─── easy_munge tests ──────────────────────────────────────────────────

describe('easy_munge pipeline', () => {
  it('builds correct pipeline from simple params', () => {
    const pipeline = buildEasyMungePipeline({
      path: 'data.yaml',
      jsonpath: '$.users[*]',
      fields: ['name', 'email'],
      output: 'markdown',
    });

    expect(pipeline).toHaveLength(4); // load + records + map + output
    expect(pipeline[0]).toEqual({ load: { path: 'data.yaml' } });
    expect(pipeline[1]).toEqual({ records: { jsonpath: '$.users[*]' } });
    expect(pipeline[2]).toEqual({
      map: {
        fields: [
          { label: 'name', value: [{ jsonpath: '$.name' }] },
          { label: 'email', value: [{ jsonpath: '$.email' }] },
        ],
      },
    });
    expect(pipeline[3]).toEqual({ output: { format: 'markdown' } });
  });

  it('includes template step when provided', () => {
    const pipeline = buildEasyMungePipeline({
      path: 'data.yaml',
      jsonpath: '$.users[*]',
      fields: ['name'],
      template: '{% for r in records %}{{r.name}}\n{% endfor %}',
      output: 'markdown',
    });

    expect(pipeline).toHaveLength(5); // load + records + map + template + output
    expect(pipeline[3]).toEqual({
      template: { template: '{% for r in records %}{{r.name}}\n{% endfor %}' },
    });
  });

  it('includes output path when provided', () => {
    const pipeline = buildEasyMungePipeline({
      path: 'data.yaml',
      jsonpath: '$.users[*]',
      fields: ['name'],
      output: 'json',
      outputPath: '/tmp/out.json',
    });

    expect(pipeline).toHaveLength(4);
    expect(pipeline[3]).toEqual({ output: { format: 'json', path: '/tmp/out.json' } });
  });

  it('includes format override when provided', () => {
    const pipeline = buildEasyMungePipeline({
      path: 'data.txt',
      format: 'csv',
      jsonpath: '$[*]',
      fields: ['name'],
      output: 'markdown',
    });

    expect(pipeline[0]).toEqual({ load: { path: 'data.txt', format: 'csv' } });
  });

  it('merges fieldMapping with fields', () => {
    const pipeline = buildEasyMungePipeline({
      path: 'data.yaml',
      jsonpath: '$.users[*]',
      fields: ['name'],
      fieldMapping: { name: 'user.name', email: 'user.email' },
      output: 'markdown',
    });

    const mapFields = (pipeline[2] as Record<string, unknown>).map as {
      fields: { label: string; value: unknown[] }[];
    };
    expect(mapFields.fields).toHaveLength(2);
    expect(mapFields.fields[0]).toEqual({ label: 'name', value: [{ jsonpath: 'user.name' }] });
    expect(mapFields.fields[1]).toEqual({ label: 'email', value: [{ jsonpath: 'user.email' }] });
  });

  it('loads YAML, extracts records, picks fields, outputs markdown', async () => {
    const path = tempFile(
      'data.yaml',
      `
users:
  - name: Alice
    email: alice@example.com
    role: admin
  - name: Bob
    email: bob@example.com
    role: user
`,
    );

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$.users[*]',
      fields: ['name', 'email', 'role'],
      output: 'markdown',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toContain('Alice');
    expect(result.text).toContain('alice@example.com');
    expect(result.text).toContain('Bob');
  });

  it('handles nested fields via fieldMapping', async () => {
    const path = tempFile(
      'data.yaml',
      `
items:
  - user:
      name: Alice
      email: alice@example.com
`,
    );

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$.items[*]',
      fields: ['name'],
      fieldMapping: { name: 'user.name', email: 'user.email' },
      output: 'json',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, unknown>[];
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[0].email).toBe('alice@example.com');
  });

  it('includes template step when template is provided', async () => {
    const path = tempFile(
      'data.yaml',
      `
users:
  - name: Alice
    email: alice@example.com
`,
    );

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$.users[*]',
      fields: ['Name', 'Email'],
      fieldMapping: { Name: 'name', Email: 'email' },
      template: '{% for r in records %}{{r.Name}}: {{r.Email}}\n{% endfor %}',
      output: 'markdown',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toContain('Alice: alice@example.com');
  });

  it('outputs JSON when format is json', async () => {
    const path = tempFile('data.json', JSON.stringify({ items: [{ x: 1 }, { x: 2 }] }));

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$.items[*]',
      fields: ['x'],
      output: 'json',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, unknown>[];
    expect(parsed).toHaveLength(2);
    // jsonpath transform converts all values to strings
    expect(parsed[0].x).toBe('1');
  });

  it('outputs YAML when format is yaml', async () => {
    const path = tempFile('data.json', JSON.stringify({ items: [{ x: 1 }] }));

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$.items[*]',
      fields: ['x'],
      output: 'yaml',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    // jsonpath transform converts all values to strings
    expect(result.text).toContain("x: '1'");
  });

  it('handles errors from invalid file path', async () => {
    const pipeline = buildEasyMungePipeline({
      path: '/nonexistent/file.yaml',
      jsonpath: '$.items[*]',
      fields: ['x'],
      output: 'markdown',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('ENOENT');
  });

  it('handles empty records gracefully', async () => {
    const path = tempFile('data.yaml', 'items: []');

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$.items[*]',
      fields: ['x'],
      output: 'markdown',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toBe('(no records)');
  });

  it('handles CSV input', async () => {
    const path = tempFile('data.csv', 'name,age\nAlice,30\nBob,25');

    const pipeline = buildEasyMungePipeline({
      path,
      jsonpath: '$[*]',
      fields: ['name', 'age'],
      output: 'markdown',
    });

    const nodes = normalizeInput({ pipeline });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toContain('Alice');
    expect(result.text).toContain('30');
  });
});

// ─── easy_convert tests ────────────────────────────────────────────────

describe('easy_convert', () => {
  describe('formatResult', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatResult(null)).toBe('');
      expect(formatResult(undefined)).toBe('');
    });

    it('stringifies objects', () => {
      expect(formatResult({ a: 1 })).toBe('{"a":1}');
    });

    it('converts primitives to string', () => {
      expect(formatResult(42)).toBe('42');
      expect(formatResult('hello')).toBe('hello');
      expect(formatResult(true)).toBe('true');
    });
  });

  describe('resolveConvertValue', () => {
    it('returns inline value when no path', async () => {
      const result = await resolveConvertValue('hello');
      expect(result).toBe('hello');
    });

    it('reads file when path provided', async () => {
      const path = tempFile('test.txt', 'file content');
      const result = await resolveConvertValue(null, path);
      expect(result).toBe('file content');
    });
  });

  describe('transforms', () => {
    it('base64 encodes a string', () => {
      const result = runValuePipeline(['base64_encode'], {}, 'hello world');
      expect(result).toBe('aGVsbG8gd29ybGQ=');
    });

    it('base64 decodes a string', () => {
      const result = runValuePipeline(['base64_decode'], {}, 'aGVsbG8gd29ybGQ=');
      expect(result).toBe('hello world');
    });

    it('url encodes a string', () => {
      const result = runValuePipeline(['url_encode'], {}, 'hello world?');
      expect(result).toBe('hello%20world%3F');
    });

    it('url decodes a string', () => {
      const result = runValuePipeline(['url_decode'], {}, 'hello%20world%21');
      expect(result).toBe('hello world!');
    });

    it('html escapes a string', () => {
      const result = runValuePipeline(['html_escape'], {}, '<div class="test">&</div>');
      expect(result).toBe('&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;');
    });

    it('html unescapes a string', () => {
      const result = runValuePipeline(
        ['html_unescape'],
        {},
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;',
      );
      expect(result).toBe('<div class="test">&</div>');
    });

    it('uppercases a string', () => {
      const result = runValuePipeline(['upper'], {}, 'hello');
      expect(result).toBe('HELLO');
    });

    it('lowercases a string', () => {
      const result = runValuePipeline(['lower'], {}, 'HELLO');
      expect(result).toBe('hello');
    });

    it('trims whitespace', () => {
      const result = runValuePipeline(['trim'], {}, '  hello  ');
      expect(result).toBe('hello');
    });

    it('converts string to number', () => {
      const result = runValuePipeline(['to_number'], {}, '42');
      expect(result).toBe(42);
    });

    it('converts number to string', () => {
      const result = runValuePipeline(['to_string'], {}, 42);
      expect(result).toBe('42');
    });

    it('converts HTML to markdown', () => {
      const result = runValuePipeline(['html_to_md'], {}, '<strong>bold</strong>');
      expect(result).toBe('**bold**');
    });

    it('reads file and base64 encodes contents', async () => {
      const path = tempFile('data.txt', 'hello world');
      const contents = await resolveConvertValue(null, path);
      const result = runValuePipeline(['base64_encode'], {}, contents);
      expect(result).toBe('aGVsbG8gd29ybGQ=');
    });

    it('throws on unknown transform', () => {
      expect(() => runValuePipeline(['nonexistent'], {}, 'test')).toThrow('Unknown transform');
    });
  });

  describe('handleEasyConvert handler', () => {
    it('returns error for invalid input', async () => {
      const result = await convert({ bogus: true });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid input');
    });

    it('returns error when both value and path are missing', async () => {
      const result = await convert({ transform: 'base64_encode' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Provide either "value" (inline) or "path" (file to read).');
    });

    it('transforms inline value', async () => {
      const result = await convert({ value: 'hello', transform: 'base64_encode' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('aGVsbG8=');
    });

    it('transforms file contents', async () => {
      const path = tempFile('data.txt', 'hello world');
      const result = await convert({ path, transform: 'base64_encode' });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe('aGVsbG8gd29ybGQ=');
    });

    it('writes output to file when outputPath provided', async () => {
      const outDir = join(tmpdir(), 'data-munger-test-' + randomUUID());
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, 'out.txt');
      const result = await convert({ value: 'hi', transform: 'base64_encode', outputPath: outPath });
      expect(result.isError).toBeFalsy();
      // Verify file was written
      const { readFile } = await import('node:fs/promises');
      const written = await readFile(outPath, 'utf-8');
      expect(written).toBe('aGk=');
    });

    it('returns error on invalid transform', async () => {
      const result = await convert({ value: 'test', transform: 'nonexistent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown transform');
    });
  });
});

// ─── easy_munge handler tests ──────────────────────────────────────────

describe('handleEasyMunge handler', () => {
  it('returns error for invalid input', async () => {
    const result = await munge({ bogus: true });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  it('returns error for missing fields', async () => {
    const result = await munge({
      path: '/some/file.yaml',
      jsonpath: '$.items[*]',
      fields: [],
      output: 'markdown',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid input');
  });

  it('runs a successful pipeline', async () => {
    const path = tempFile('data.yaml', 'items:\n  - name: Alice\n  - name: Bob\n');
    const result = await munge({
      path,
      jsonpath: '$.items[*]',
      fields: ['name'],
      output: 'markdown',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Alice');
    expect(result.content[0].text).toContain('Bob');
  });

  it('handles pipeline errors', async () => {
    const result = await munge({
      path: '/nonexistent/file.yaml',
      jsonpath: '$.items[*]',
      fields: ['name'],
      output: 'markdown',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ENOENT');
  });
});