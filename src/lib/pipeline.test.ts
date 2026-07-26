import { describe, it, expect } from '@jest/globals';
import { normalizeInput } from './normalize.js';
import { runGraph } from './engine.js';
import { registerAll } from './register.js';
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

describe('pipeline orchestration', () => {
  it('runs a full pipeline with sort, limit, group', async () => {
    const path = tempFile(
      'test.yaml',
      `
items:
  - name: Alice
    dept: eng
    salary: 100
  - name: Bob
    dept: eng
    salary: 80
  - name: Charlie
    dept: sales
    salary: 90
  - name: Diana
    dept: sales
    salary: 70
`,
    );

    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        { sort: { by: 'name' } },
        { limit: { count: 3 } },
        {
          map: {
            fields: [
              { label: 'Name', value: [{ jsonpath: '$.name' }] },
              { label: 'Salary', value: [{ jsonpath: '$.salary' }, 'to_number'] },
            ],
          },
        },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, unknown>[];
    expect(parsed).toHaveLength(3);
    expect(parsed[0].Name).toBe('Alice');
    expect(parsed[2].Name).toBe('Charlie');
  });

  it('handles errors from invalid file path', async () => {
    const nodes = normalizeInput({
      pipeline: [
        { load: { path: '/nonexistent/file.yaml' } },
        { records: { jsonpath: '$.items[*]' } },
        { output: { format: 'markdown' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('ENOENT');
  });

  it('handles errors from invalid JSONPath', async () => {
    const path = tempFile('test.yaml', 'items: [{ x: 1 }]');
    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$$$$invalid' } },
        { output: { format: 'markdown' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(true);
  });

  it('outputs YAML format', async () => {
    const path = tempFile('test.yaml', 'items: [{ x: 1 }, { x: 2 }]');
    const nodes = normalizeInput({
      pipeline: [
        { load: { path } },
        { records: { jsonpath: '$.items[*]' } },
        { map: { fields: [{ label: 'X', value: [{ jsonpath: '$.x' }] }] } },
        { output: { format: 'yaml' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toContain('X:');
  });
});

describe('DAG with join', () => {
  it('joins two datasets', async () => {
    const usersPath = tempFile('users.json', JSON.stringify({ users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }));
    const ordersPath = tempFile('orders.json', JSON.stringify({ orders: [{ id: 1, total: '50' }, { id: 1, total: '30' }] }));

    const nodes = normalizeInput({
      nodes: [
        { id: 'u', load: { path: usersPath } },
        { id: 'o', load: { path: ordersPath } },
        { id: 'r1', records: { from: 'u', jsonpath: '$.users[*]' } },
        { id: 'r2', records: { from: 'o', jsonpath: '$.orders[*]' } },
        { id: 'j', join: { inputs: { left: 'r1', right: 'r2' }, on: 'id' as string } },
        {
          id: 'm',
          map: {
            from: 'j',
            fields: [
              { label: 'Name', value: [{ jsonpath: '$.name' }] },
              {
                label: 'Total',
                value: [{ jsonpath: '$.total' }, 'to_number', { format_number: { decimals: 2, prefix: '$' } }],
              },
            ],
          },
        },
        { id: 'out', output: { from: 'm', format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, unknown>[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].Name).toBe('Alice');
    expect(parsed[0].Total).toBe('$50.00');
  });
});

describe('engine edge cases', () => {
  it('handles missing node references gracefully', async () => {
    const nodes = normalizeInput({
      nodes: [
        { id: 'out', output: { from: 'nonexistent', format: 'json' } },
      ],
    });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('not found');
  });

  it('handles empty pipeline', async () => {
    const nodes = normalizeInput({ pipeline: [] });
    const result = await runGraph(nodes);
    expect(result.isError).toBe(true);
  });
});

describe('inline data', () => {
  it('loads inline JSON and produces output', async () => {
    const nodes = normalizeInput({
      pipeline: [
        { load_string: { data: '{"users":[{"name":"Alice"},{"name":"Bob"}]}' } },
        { records: { jsonpath: '$.users[*]' } },
        { map: { fields: [{ label: 'Name', value: [{ jsonpath: '$.name' }] }] } },
        { output: { format: 'markdown' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    expect(result.text).toContain('Alice');
    expect(result.text).toContain('Bob');
  });

  it('loads inline YAML', async () => {
    const data = 'users:\n  - name: Alice\n  - name: Bob';
    const nodes = normalizeInput({
      pipeline: [
        { load_string: { data, format: 'yaml' } },
        { records: { jsonpath: '$.users[*]' } },
        { map: { fields: [{ label: 'Name', value: [{ jsonpath: '$.name' }] }] } },
        { output: { format: 'json' } },
      ],
    });

    const result = await runGraph(nodes);
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.text) as Record<string, unknown>[];
    expect(parsed).toHaveLength(2);
  });
});