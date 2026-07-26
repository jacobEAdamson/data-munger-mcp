import { describe, it, expect } from '@jest/globals';
import { normalizeInput } from './normalize.js';
import { runGraph, getAllNodeMetas } from './engine.js';
import { registerAll } from './register.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Register all node handlers and transforms before tests
registerAll();

function tempFile(name: string, content: string): string {
  const dir = join(tmpdir(), 'data-munger-test-' + randomUUID());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

describe('munge pipeline', () => {
  it('loads YAML, extracts records, maps fields, outputs markdown', async () => {
    const path = tempFile(
      'test.yaml',
      `
team: Engineering
members:
  - name: Alice
    role: Lead
  - name: Bob
    role: Dev
`,
    );

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.members[*]' } },
        {
          map: {
            fields: [
              { label: 'Name', value: [{ jsonpath: '$.name' }] },
              { label: 'Role', value: [{ jsonpath: '$.role' }] },
            ],
          },
        },
        { output: { format: 'markdown' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toContain('| Name');
    expect(result.text).toContain('| Alice');
    expect(result.text).toContain('| Bob');
    expect(result.text).toContain('| Lead');
    expect(result.text).toContain('| Dev');
  });

  it('outputs JSON', async () => {
    const path = tempFile('test.json', JSON.stringify({ items: [{ x: 1 }, { x: 2 }] }));

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        { map: { fields: [{ label: 'X', value: [{ jsonpath: '$.x' }] }] } },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ X: '1' }, { X: '2' }]);
  });

  it('converts HTML to Markdown', async () => {
    const path = tempFile(
      'test.yaml',
      `
posts:
  - title: Hello
    body: "<p>Hi <strong>there</strong></p>"
`,
    );

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.posts[*]' } },
        {
          map: {
            fields: [
              { label: 'Title', value: [{ jsonpath: '$.title' }] },
              { label: 'Body', value: [{ jsonpath: '$.body' }, 'html_to_md'] },
            ],
          },
        },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ Title: 'Hello', Body: 'Hi **there**' }]);
  });

  it('handles CSV input', async () => {
    const path = tempFile('test.csv', 'name,age\nAlice,30\nBob,25');

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$[*]' } },
        { map: { fields: [{ label: 'Name', value: [{ jsonpath: '$.name' }] }] } },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ Name: 'Alice' }, { Name: 'Bob' }]);
  });
});

describe('munge-graph pipeline', () => {
  it('runs a DAG with explicit node wiring', async () => {
    const path = tempFile('test.yaml', 'items: [{ n: 1 }, { n: 2 }]');

    const nodes = normalizeInput({
      nodes: [
        { id: 'src', load: { path } },
        { id: 'rec', records: { from: 'src', jsonpath: '$.items[*]' } },
        { id: 'm', map: { from: 'rec', fields: [{ label: 'N', value: [{ jsonpath: '$.n' }] }] } },
        { id: 'out', output: { from: 'm', format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ N: '1' }, { N: '2' }]);
  });
});

describe('value transforms', () => {
  it('supports concat transform', async () => {
    const path = tempFile('test.yaml', 'items: [{ first: "Jane", last: "Doe" }]');

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        {
          map: {
            fields: [
              { label: 'Full', value: [{ concat: { values: ['$.first', ' ', '$.last'] } }] },
            ],
          },
        },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ Full: 'Jane Doe' }]);
  });

  it('supports template transform', async () => {
    const path = tempFile('test.yaml', 'items: [{ name: "Alice", email: "a@x.com" }]');

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        {
          map: {
            fields: [{ label: 'Contact', value: [{ template: '{{$.name}} <{{$.email}}>' }] }],
          },
        },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ Contact: 'Alice <a@x.com>' }]);
  });

  it('supports to_number + format_number', async () => {
    const path = tempFile('test.yaml', 'items: [{ val: "42.5" }]');

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        {
          map: {
            fields: [
              {
                label: 'Num',
                value: [
                  { jsonpath: '$.val' },
                  'to_number',
                  { format_number: { decimals: 2, prefix: '$' } },
                ],
              },
            ],
          },
        },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ Num: '$42.50' }]);
  });

  it('supports regex transform', async () => {
    const path = tempFile('test.yaml', 'items: [{ phone: "(555) 123-4567" }]');

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        {
          map: {
            fields: [
              {
                label: 'Phone',
                value: [{ jsonpath: '$.phone' }, { regex: { pattern: '\\D', replace: '' } }],
              },
            ],
          },
        },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ Phone: '5551234567' }]);
  });
});

describe('graph mode', () => {
  it('supports sort and limit', async () => {
    const path = tempFile('test.yaml', 'items: [{ n: 3 }, { n: 1 }, { n: 2 }]');

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        { sort: { by: 'n' } },
        { limit: { count: 2 } },
        { map: { fields: [{ label: 'N', value: [{ jsonpath: '$.n' }] }] } },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, string>[];
    expect(parsed).toEqual([{ N: '1' }, { N: '2' }]);
  });
});

describe('node metadata', () => {
  it('all 10 nodes have metadata', () => {
    const metas = getAllNodeMetas();
    expect(metas.length).toBe(10);
  });

  it('each node has description and config', () => {
    const metas = getAllNodeMetas();
    for (const { meta } of metas) {
      expect(meta.description).toBeTruthy();
      expect(Object.keys(meta.config).length).toBeGreaterThan(0);
    }
  });

  it('join node has left/right slots', () => {
    const metas = getAllNodeMetas();
    const join = metas.find((m) => m.name === 'join');
    if (join) {
      expect(join.meta.inputSlots.map((s) => s.name)).toEqual(['left', 'right']);
    } else {
      throw new Error('join not found');
    }
  });

  it('source nodes have empty inputSlots', () => {
    const metas = getAllNodeMetas();
    for (const { name, meta } of metas) {
      if (name === 'load' || name === 'load_string') {
        expect(meta.inputSlots.length).toBe(0);
      }
    }
  });
});
