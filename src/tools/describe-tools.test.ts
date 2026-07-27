import { describe, it, expect } from '@jest/globals';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { registerAll } from '../lib/register.js';
import { getAllTransformMetas } from '../lib/transforms/registry.js';
import { getAllNodeMetas } from '../lib/engine.js';
import { describeValue, guessFormat, loadFile } from './describe-data.js';

registerAll();

describe('describe_transforms', () => {
  it('returns all 25 transforms', () => {
    const metas = getAllTransformMetas();
    expect(metas.length).toBe(25);
  });

  it('sorted config first, then alpha', () => {
    const metas = getAllTransformMetas();
    // First items should have configShape
    expect(metas[0].meta.configShape).toBeDefined();
    // Last items should be no-config
    const noConfig = metas.filter((m) => !m.meta.configShape);
    expect(noConfig.length).toBeGreaterThan(0);
  });

  it('entry point transforms are marked', () => {
    const metas = getAllTransformMetas();
    const entryPoints = metas.filter((m) => m.meta.entryPoint);
    expect(entryPoints.map((m) => m.name).sort()).toEqual(['concat', 'jsonpath', 'template']);
  });
});

describe('describe_pipeline', () => {
  it('returns all 10 nodes', () => {
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
});

describe('describe_data', () => {
  it('describes a simple object', () => {
    const result = describeValue({ name: 'Alice', age: 30 });
    expect(result.type).toBe('object');
    expect(result.fieldCount).toBe(2);
    expect(result.fields).toBeDefined();
    if (result.fields) {
      expect(result.fields[0].name).toBe('name');
      expect(result.fields[0].type).toBe('string');
      expect(result.fields[1].name).toBe('age');
      expect(result.fields[1].type).toBe('number');
    }
  });

  it('describes an array of objects', () => {
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const result = describeValue(data);
    expect(result.type).toBe('object[]');
    expect(result.count).toBe(2);
    expect(result.fields).toBeDefined();
    if (result.fields) {
      const names = result.fields.map((f) => f.name);
      expect(names).toContain('id');
      expect(names).toContain('name');
    }
  });

  it('describes a nested object', () => {
    const data = { meta: { count: 5 }, items: [{ x: 1 }] };
    const result = describeValue(data);
    expect(result.type).toBe('object');
    expect(result.fieldCount).toBe(2);
    if (result.fields) {
      const meta = result.fields.find((f) => f.name === 'meta');
      expect(meta?.type).toBe('object');
      const items = result.fields.find((f) => f.name === 'items');
      expect(items?.type).toContain('[]');
    }
  });

  it('describes a primitive', () => {
    expect(describeValue(42).type).toBe('number');
    expect(describeValue('hello').type).toBe('string');
    expect(describeValue(true).type).toBe('boolean');
    expect(describeValue(null).type).toBe('null');
  });

  it('describes empty array', () => {
    const result = describeValue([]);
    expect(result.type).toBe('array');
    expect(result.count).toBe(0);
  });

  it('describes ISO date string', () => {
    const result = describeValue('2024-01-15T00:00:00Z');
    expect(result.type).toBe('date (string)');
  });

  it('describes primitive array', () => {
    const result = describeValue(['a', 'b', 'c']);
    expect(result.type).toBe('string[]');
    expect(result.count).toBe(3);
  });

  it('describes mixed-type array', () => {
    const result = describeValue([1, 'two', true]);
    expect(result.type).toContain('|');
    expect(result.count).toBe(3);
  });

  it('describes empty array inside object', () => {
    const result = describeValue({ items: [] });
    expect(result.type).toBe('object');
    if (result.fields) {
      const items = result.fields.find((f) => f.name === 'items');
      expect(items?.type).toBe('array');
    }
  });

  it('describes primitive array inside object', () => {
    const result = describeValue({ tags: ['a', 'b', 'c'] });
    expect(result.type).toBe('object');
    if (result.fields) {
      const tags = result.fields.find((f) => f.name === 'tags');
      expect(tags?.type).toContain('string[]');
      expect(tags?.count).toBe(3);
    }
  });

  it('handles max depth', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } };
    const result = describeValue(deep, 0, 2);
    expect(result.type).toBe('object');
  });
});

describe('loadFile', () => {
  function tempFile(name: string, content: string): string {
    const dir = join(tmpdir(), 'data-munger-test-' + randomUUID());
    mkdirSync(dir, { recursive: true });
    const path = join(dir, name);
    writeFileSync(path, content, 'utf-8');
    return path;
  }

  it('loads JSON file', () => {
    const path = tempFile('test.json', '{"name": "Alice"}');
    const result = loadFile(path);
    expect(result).toEqual({ name: 'Alice' });
  });

  it('loads YAML file', () => {
    const path = tempFile('test.yaml', 'name: Bob\nage: 30\n');
    const result = loadFile(path, 'yaml');
    expect(result).toEqual({ name: 'Bob', age: 30 });
  });

  it('loads CSV file', () => {
    const path = tempFile('test.csv', 'name,age\nAlice,30\nBob,25');
    const result = loadFile(path);
    expect(result).toEqual([{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]);
  });

  it('throws on unsupported format', () => {
    const path = tempFile('test.json', '{}');
    expect(() => loadFile(path, 'xml')).toThrow('Unsupported format');
  });
});

describe('guessFormat', () => {
  it('detects yaml', () => {
    expect(guessFormat('data.yaml')).toBe('yaml');
    expect(guessFormat('data.yml')).toBe('yaml');
  });

  it('detects json', () => {
    expect(guessFormat('data.json')).toBe('json');
  });

  it('detects csv', () => {
    expect(guessFormat('data.csv')).toBe('csv');
  });

  it('throws on unknown extension', () => {
    expect(() => guessFormat('data.txt')).toThrow('Cannot guess format');
  });
});