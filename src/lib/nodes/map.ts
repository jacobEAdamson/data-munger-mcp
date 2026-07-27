import { runValuePipeline } from '../transforms/registry.js';
import type { NodeMeta } from '../engine.js';

export const nodeMeta: NodeMeta = {
  description: 'Transform each record in an array by mapping fields through value pipelines. Each field value is an array of value transforms.',
  inputSlots: [{ name: 'main', description: 'Array of records from records node' }],
  config: {
    fields: {
      type: '{ label: string, value: transform[] }[]',
      required: true,
      description: 'Array of field definitions. Each field has a label and a value pipeline (array of transform steps). Use describe_transforms to see available transforms.',
    },
  },
  note: 'The value property of each field is an array of transforms — see describe_transforms for available transforms.',
};

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
