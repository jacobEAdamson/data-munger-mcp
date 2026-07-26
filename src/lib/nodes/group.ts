export function groupNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, unknown>[] {
  const records = inputs.main as Record<string, unknown>[];
  const by = config.by as string;
  const agg = config.agg as {
    field: string;
    op: string;
    as?: string;
  }[];

  // Group by key
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const rec of records) {
    const key = String(rec[by] ?? '');
    if (!groups.has(key)) groups.set(key, []);
    const bucket = groups.get(key);
    if (bucket) bucket.push(rec);
  }

  // Aggregate each group
  const results: Record<string, unknown>[] = [];
  for (const [key, group] of groups) {
    const row: Record<string, unknown> = { [by]: key };
    for (const a of agg) {
      const label = a.as ?? `${a.field}_${a.op}`;
      const values = group.map((r) => Number(r[a.field] ?? 0));

      switch (a.op) {
        case 'sum':
          row[label] = values.reduce((s, v) => s + v, 0);
          break;
        case 'count':
          row[label] = group.length;
          break;
        case 'avg':
          row[label] = values.reduce((s, v) => s + v, 0) / group.length;
          break;
        case 'min':
          row[label] = Math.min(...values);
          break;
        case 'max':
          row[label] = Math.max(...values);
          break;
        default:
          throw new Error(`Unknown aggregation op: '${a.op}'`);
      }
    }
    results.push(row);
  }

  return results;
}
