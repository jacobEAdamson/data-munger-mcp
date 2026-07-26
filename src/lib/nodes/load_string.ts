import { load as yamlLoad } from 'js-yaml';

export function loadStringNode(
  config: Record<string, unknown>,
  _inputs: Record<string, unknown>,
): unknown {
  const data = config.data as string;
  const format = (config.format as string | undefined) ?? 'json';

  switch (format) {
    case 'yaml':
      return yamlLoad(data);
    case 'json':
      return JSON.parse(data);
    case 'csv': {
      const lines = data
        .trim()
        .split('\n')
        .map((l) => l.split(','));
      const header = lines[0];
      if (lines.length < 2) throw new Error('CSV data appears empty');
      return lines.slice(1).map((r) => {
        const obj: Record<string, string> = {};
        header.forEach((h, i) => {
          obj[h] = r[i] ?? '';
        });
        return obj;
      });
    }
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
