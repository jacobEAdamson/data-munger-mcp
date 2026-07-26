export function sortNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, unknown>[] {
  const records = inputs.main as Record<string, unknown>[];
  const by = config.by as string;
  const desc = (config.desc as boolean) ?? false;

  const sorted = [...records];
  sorted.sort((a, b) => {
    const av = String(a[by] ?? '');
    const bv = String(b[by] ?? '');
    const numA = Number(av);
    const numB = Number(bv);
    const cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : av.localeCompare(bv);
    return desc ? -cmp : cmp;
  });

  return sorted;
}
