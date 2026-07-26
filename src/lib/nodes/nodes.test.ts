import { describe, it, expect, jest } from '@jest/globals';
import { loadStringNode } from './load_string.js';
import { groupNode } from './group.js';
import { joinNode } from './join.js';

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
    const right: Array<Record<string, unknown>> = [];

    const result = joinNode({ on: 'id' }, { left, right });

    expect(result).toHaveLength(0);
  });
});