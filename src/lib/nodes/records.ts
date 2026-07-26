import jp from 'jsonpath';

export function recordsNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): unknown[] {
  const jsonpath = config.jsonpath as string;
  const document = inputs.main;

  const result = jp.query(document, jsonpath);

  const records = Array.isArray(result) ? result : [result];
  return records;
}
