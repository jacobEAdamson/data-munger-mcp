import { runValuePipeline } from '../transforms/registry.js';

export function mapNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, string>[] {
  const fields = config.fields as {
    label: string;
    value: unknown[];
  }[];
  const records = inputs.main as Record<string, unknown>[];

  return records.map((rec) => {
    const row: Record<string, string> = {};
    for (const field of fields) {
      const result = runValuePipeline(field.value, rec);
      row[field.label] =
        result === undefined || result === null
          ? ''
          : typeof result === 'object'
            ? JSON.stringify(result)
            : String(result);
    }
    return row;
  });
}
