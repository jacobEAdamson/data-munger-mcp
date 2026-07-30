import { describe, it, expect } from '@jest/globals';
import { loadStringNode } from './load_string.js';
import { groupNode } from './group.js';
import { joinNode } from './join.js';
import { templateNode } from './template.js';
import { outputNode } from './output.js';
import { normalizeInput } from '../normalize.js';
import { runGraph } from '../engine.js';
import { registerAll } from '../register.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

registerAll();

function tempFile(name: string, content: string): string {
  const dir = join(tmpdir(), 'data-munger-test-' + randomUUID());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

describe('load_string node', () => {
  it('parses JSON string', () => {
    const result = loadStringNode({ data: '{"key": "value"}' }, {});
    expect(result).toEqual({ key: 'value' });
  });

  it('parses YAML string', () => {
    const result = loadStringNode({ data: 'key: value', format: 'yaml' }, {});
    expect(result).toEqual({ key: 'value' });
  });

  it('parses array JSON', () => {
    const result = loadStringNode({ data: '[1, 2, 3]' }, {});
    expect(result).toEqual([1, 2, 3]);
  });

  it('parses CSV string', () => {
    const result = loadStringNode({ data: 'name,age\nAlice,30\nBob,25', format: 'csv' }, {});
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });
});

describe('group node', () => {
  it('groups records and aggregates', () => {
    const records = [
      { status: 'active', val: 10 },
      { status: 'active', val: 20 },
      { status: 'inactive', val: 5 },
    ];

    const result = groupNode(
      {
        by: 'status',
        agg: [
          { field: 'val', op: 'sum', as: 'total' },
          { field: 'status', op: 'count', as: 'count' },
        ],
      },
      { main: records },
    );

    expect(result).toHaveLength(2);
    const active = result.find((r: Record<string, unknown>) => r.status === 'active');
    expect(active?.total).toBe(30);
    expect(active?.count).toBe(2);
  });

  it('handles min/max/avg aggregations', () => {
    const records = [
      { group: 'a', val: 10 },
      { group: 'a', val: 20 },
      { group: 'a', val: 30 },
    ];

    const result = groupNode(
      {
        by: 'group',
        agg: [
          { field: 'val', op: 'min', as: 'min_val' },
          { field: 'val', op: 'max', as: 'max_val' },
          { field: 'val', op: 'avg', as: 'avg_val' },
        ],
      },
      { main: records },
    );

    expect(result).toHaveLength(1);
    expect(result[0].min_val).toBe(10);
    expect(result[0].max_val).toBe(30);
    expect(result[0].avg_val).toBe(20);
  });
});

describe('join node', () => {
  it('performs inner join', () => {
    const left = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    const right = [
      { id: 1, order: 'A' },
      { id: 3, order: 'B' },
    ];

    const result = joinNode({ on: 'id', type: 'inner' }, { left, right });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, name: 'Alice', order: 'A' });
  });

  it('performs left join', () => {
    const left = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    const right = [{ id: 1, order: 'A' }];

    const result = joinNode({ on: 'id', type: 'left' }, { left, right });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 1, name: 'Alice', order: 'A' });
    expect(result[1]).toMatchObject({ id: 2, name: 'Bob' });
    // Bob has no order — should exist but without order field
    expect(result[1].order).toBeUndefined();
  });

  it('defaults to inner join', () => {
    const left = [{ id: 1, name: 'Alice' }];
    const right: Record<string, unknown>[] = [];

    const result = joinNode({ on: 'id' }, { left, right });

    expect(result).toHaveLength(0);
  });
});

describe('template node', () => {
  it('renders template with records array context', () => {
    const result = templateNode(
      { template: 'Team: {{records[0].name}} & {{records[1].name}}' },
      { main: [{ name: 'Alice', role: 'Dev' }, { name: 'Bob', role: 'QA' }] },
    );
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  it('strips $. prefix from template variables', () => {
    const result = templateNode(
      { template: 'Name: {{$.records[0].name}}' },
      { main: [{ name: 'Charlie' }] },
    );
    expect(result).toContain('Charlie');
  });

  it('renders per-record when perRecord is true', () => {
    const result = templateNode(
      { template: '{{name}} - {{role}}', perRecord: true },
      { main: [{ name: 'Alice', role: 'Dev' }, { name: 'Bob', role: 'QA' }] },
    );
    expect(result).toBe('Alice - Dev\nBob - QA');
  });

  it('strips $. prefix with perRecord mode', () => {
    const result = templateNode(
      { template: '{{$.name}}', perRecord: true },
      { main: [{ name: 'Charlie' }] },
    );
    expect(result).toBe('Charlie');
  });

  // ── Regression: perRecord edge cases ───────────────────────────────

  it('perRecord returns empty string for empty records', () => {
    const result = templateNode(
      { template: '{{name}}', perRecord: true },
      { main: [] },
    );
    expect(result).toBe('');
  });

  it('perRecord renders single record correctly', () => {
    const result = templateNode(
      { template: 'Hello {{name}}', perRecord: true },
      { main: [{ name: 'World' }] },
    );
    expect(result).toBe('Hello World');
  });

  it('perRecord handles dot-path field names', () => {
    const result = templateNode(
      { template: '{{properties.mag}} - {{properties.place}}', perRecord: true },
      { main: [{ name: 'plain' }, { 'properties.mag': '5.2', 'properties.place': 'Tokyo' }] },
    );
    // First record: properties.mag → undefined, properties.place → undefined → empty fields
    // Second record: Liquid interprets properties.mag as nested lookup, not dot-key
    // So this test verifies that perRecord mode doesn't crash on dot-path keys
    expect(result).toBe(' - \n - ');
  });

  it('perRecord does not affect default mode', () => {
    // Default mode (perRecord: false) still wraps in { records: [...] }
    const result = templateNode(
      { template: '{{records[0].name}}' },
      { main: [{ name: 'Alice' }] },
    );
    expect(result).toBe('Alice');
  });
});

describe('output node', () => {
  it('throws when no format specified for record input', () => {
    expect(() => outputNode({}, { main: [{ x: 1 }] })).toThrow('format');
  });

  it('throws on unsupported format', () => {
    expect(() => outputNode({ format: 'xml' }, { main: [{ x: 1 }] })).toThrow(
      'Unsupported output format: xml',
    );
  });

  it('outputs YAML', () => {
    const result = outputNode({ format: 'yaml' }, { main: [{ x: 1 }] });
    expect(result).toContain('x: 1');
  });

  it('outputs JSON', () => {
    const result = outputNode({ format: 'json' }, { main: [{ x: 1 }] });
    expect(result).toContain('"x"');
  });

  it('passes through string input', () => {
    const result = outputNode({}, { main: 'hello' });
    expect(result).toBe('hello');
  });

  it('writes string output to file', () => {
    const dir = join(tmpdir(), 'data-munger-test-' + randomUUID());
    mkdirSync(dir, { recursive: true });
    const outPath = join(dir, 'out.md');
    const result = outputNode({ path: outPath }, { main: '# Hello' });
    expect(result).toContain('Wrote to:');
  });

  it('writes formatted output to file', () => {
    const dir = join(tmpdir(), 'data-munger-test-' + randomUUID());
    mkdirSync(dir, { recursive: true });
    const outPath = join(dir, 'out.json');
    const result = outputNode({ format: 'json', path: outPath }, { main: [{ x: 1 }] });
    expect(result).toContain('Wrote to:');
  });

  it('handles empty records for markdown', () => {
    const result = outputNode({ format: 'markdown' }, { main: [] });
    expect(result).toBe('(no records)');
  });

  it('outputs CSV with simple values', () => {
    const result = outputNode(
      { format: 'csv' },
      { main: [{ name: 'Alice', age: 30, active: true }, { name: 'Bob', age: 25, active: false }] },
    );
    expect(result).toBe('name,age,active\nAlice,30,true\nBob,25,false');
  });

  it('outputs CSV with null/undefined values', () => {
    const result = outputNode(
      { format: 'csv' },
      { main: [{ name: 'Alice', score: null }, { name: 'Bob', score: undefined }] },
    );
    expect(result).toBe('name,score\nAlice,\nBob,');
  });

  it('outputs CSV with complex values as JSON', () => {
    const result = outputNode(
      { format: 'csv' },
      { main: [{ name: 'Alice', tags: ['a', 'b'], meta: { role: 'dev' } }] },
    );
    // Complex values serialized as JSON in cell, quoted for CSV safety
    expect(result).toBe('name,tags,meta\nAlice,"[""a"",""b""]","{""role"":""dev""}"');
  });

  it('outputs CSV with Date value', () => {
    const result = outputNode(
      { format: 'csv' },
      { main: [{ event: 'start', date: new Date('2024-01-15T00:00:00.000Z') }] },
    );
    expect(result).toBe('event,date\nstart,2024-01-15T00:00:00.000Z');
  });

  it('handles empty records for CSV', () => {
    const result = outputNode({ format: 'csv' }, { main: [] });
    expect(result).toBe('');
  });
});

describe('load_string CSV edge cases', () => {
  it('throws on malformed CSV parse', () => {
    expect(() => {
      loadStringNode({ data: 'a,b\n1', format: 'csv' }, {});
    }).toThrow('CSV parse error');
  });

  it('throws on empty CSV', () => {
    expect(() => {
      loadStringNode({ data: 'a,b', format: 'csv' }, {});
    }).toThrow('CSV data appears empty');
  });
});

describe('load format guessing', () => {
  it('guesses json from .json extension', async () => {
    const path = tempFile('data.json', '{"key": "value"}');
    const nodes = normalizeInput({
      pipeline: [{ load: { path } }, { output: { format: 'json' } }],
    });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
  });

  it('guesses csv from .csv extension', async () => {
    const path = tempFile('data.csv', 'name,age\nAlice,30');
    const nodes = normalizeInput({
      pipeline: [{ load: { path } }, { records: { jsonpath: '$[*]' } }, { output: { format: 'json' } }],
    });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
  });

  it('guesses yaml from .yml extension', async () => {
    const path = tempFile('data.yml', 'key: value');
    const nodes = normalizeInput({
      pipeline: [{ load: { path } }, { output: { format: 'json' } }],
    });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
  });

  it('throws on unknown extension', async () => {
    const path = tempFile('data.xyz', 'content');
    const nodes = normalizeInput({
      pipeline: [{ load: { path } }, { output: { format: 'json' } }],
    });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('Cannot guess format');
  });
});