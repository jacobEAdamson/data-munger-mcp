export function limitNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): unknown[] {
  const records = inputs.main as unknown[];
  const count = config.count as number;
  return records.slice(0, count);
}
