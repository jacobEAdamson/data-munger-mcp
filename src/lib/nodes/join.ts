export function joinNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, unknown>[] {
  const left = inputs.left as Record<string, unknown>[];
  const right = inputs.right as Record<string, unknown>[];
  const on = config.on as string;
  const type = (config.type as string | undefined) ?? 'inner';

  // Build index of right side
  const rightIndex = new Map<string, Record<string, unknown>[]>();
  for (const r of right) {
    const key = String(r[on] ?? '');
    if (!rightIndex.has(key)) rightIndex.set(key, []);
    const bucket = rightIndex.get(key);
    if (bucket) bucket.push(r);
  }

  const results: Record<string, unknown>[] = [];
  const matched = new Set<string>();

  for (const l of left) {
    const key = String(l[on] ?? '');
    const matches = rightIndex.get(key);
    if (matches) {
      matched.add(key);
      for (const r of matches) {
        results.push({ ...l, ...r });
      }
    } else if (type === 'left') {
      results.push({ ...l });
    }
  }

  // For right join, add unmatched right records
  if (type === 'right') {
    for (const r of right) {
      const key = String(r[on] ?? '');
      if (!matched.has(key)) {
        results.push({ ...r });
      }
    }
  }

  return results;
}
